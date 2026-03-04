import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  upsertUser,
  getUserByOpenId,
  createHand,
  getHandBySlug,
  getHandById,
  getUserHands,
  updateHandCoachAnalysis,
  updateVillainType,
  deleteHand,
  getDiscordWebhooks,
  createDiscordWebhook,
  deleteDiscordWebhook,
  setDefaultDiscordWebhook,
  updateStudyStreak,
  getStudyStreak,
  getUserHands as getUserHandsForLeaks,
  updateHand,
} from "./db";
import { parseHandText } from "./handParser";
import { invokeLLM } from "./_core/llm";
import { stripeRouter } from "./stripeRouter";
import { splitHandHistory, parseHandHistory, historyHandToText } from "./historyParser";

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return ctx.user;
  }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
    return { success: true };
  }),
});

// ─── Hands Router ─────────────────────────────────────────────────────────────

const handsRouter = router({
  // Parse free-text hand description (no auth required)
  parseText: publicProcedure
    .input(z.object({ text: z.string().min(10).max(2000) }))
    .mutation(async ({ input }) => {
      try {
        const parsed = await parseHandText(input.text);
        return { success: true, parsed };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not parse hand: ${err.message}`,
        });
      }
    }),

  // Create a hand from parsed data (no auth required — guest hands are public)
  create: publicProcedure
    .input(
      z.object({
        rawText: z.string().min(10).max(2000),
        parsedData: z.any(),
        title: z.string().max(255).optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? null;
      const { shareSlug } = await createHand({
        userId,
        rawText: input.rawText,
        parsedData: input.parsedData,
        title: input.title,
        notes: input.notes,
        isPublic: true,
      });
      return { shareSlug };
    }),

  // Get a hand by public share slug (no auth required)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const hand = await getHandBySlug(input.slug);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });
      return hand;
    }),

  // Get all hands for the logged-in user
  myHands: protectedProcedure.query(async ({ ctx }) => {
    return getUserHands(ctx.user.id);
  }),

  // Delete a hand (must own it)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteHand(input.id, ctx.user.id);
      return { success: true };
    }),

  // Import hand history file (Pro only)
  importHistory: protectedProcedure
    .input(z.object({
      fileContent: z.string().min(50).max(500000), // up to 500KB of hand history text
    }))
    .mutation(async ({ input, ctx }) => {
      // Check Pro status
      const user = ctx.user as any;
      if (!user.isPro) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Hand history import requires a Pro subscription" });
      }

      const hands = splitHandHistory(input.fileContent);
      if (hands.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid hands found in the uploaded file" });
      }

      // Limit to 50 hands per import
      const handsToProcess = hands.slice(0, 50);
      const results: Array<{ shareSlug: string; title: string; success: boolean; error?: string }> = [];

      for (const handText of handsToProcess) {
        try {
          const parsed = parseHandHistory(handText);
          if (!parsed) {
            results.push({ shareSlug: "", title: "Unknown hand", success: false, error: "Could not parse hand" });
            continue;
          }

          // Convert to natural language for AI parser compatibility
          const naturalText = historyHandToText(parsed);

          // Build parsedData in the same schema as the AI parser
          const parsedData = {
            title: parsed.title,
            gameType: parsed.gameType,
            stakes: parsed.stakes,
            heroPosition: parsed.heroPosition,
            heroCards: parsed.heroCards,
            villains: parsed.villains,
            board: parsed.board,
            streets: parsed.streets,
            heroStartingStack: parsed.heroStartingStack,
            potSize: parsed.potSize,
            result: parsed.result,
          };

          const { shareSlug } = await createHand({
            userId: ctx.user.id,
            rawText: naturalText,
            parsedData,
            title: parsed.title,
            isPublic: false,
          });

          results.push({ shareSlug, title: parsed.title, success: true });
        } catch (err: any) {
          results.push({ shareSlug: "", title: "Error", success: false, error: err.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        total: hands.length,
        processed: handsToProcess.length,
        imported: successCount,
        results,
      };
    }),

  // Update a hand's raw text and parsed data (must own it)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      rawText: z.string().min(10).max(5000),
      parsedData: z.any(),
      title: z.string().max(255).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const hand = await getHandById(input.id);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });
      if (hand.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this hand" });
      await updateHand(input.id, ctx.user.id, {
        rawText: input.rawText,
        parsedData: input.parsedData,
        title: input.title,
      });
      return { success: true };
    }),
});

// ─── AI Coach Router ──────────────────────────────────────────────────────────

// Villain type profiles for exploitative coaching
const VILLAIN_PROFILES: Record<string, string> = {
  "fish": "The villain is a recreational fish/calling station. They call too wide, rarely fold to aggression, and chase draws. Exploit by value betting thinner, betting bigger for value, never bluffing, and avoiding fancy plays.",
  "nit": "The villain is a nit — extremely tight and passive. They fold too much preflop and postflop. Exploit by stealing blinds aggressively, c-betting frequently, and giving up when they show resistance (they have it).",
  "tight reg": "The villain is a tight-aggressive regular. They play a solid but predictable range. Exploit by attacking their folds, 3-betting their opens light in position, and not paying off their strong hands.",
  "lag": "The villain is a loose-aggressive player (LAG). They open wide, barrel frequently, and apply pressure. Exploit by tightening your calling range, trapping with strong hands, and not folding equity to their bluffs.",
  "calling station": "The villain is a calling station who never folds. Exploit by eliminating all bluffs, value betting relentlessly with any made hand, and sizing up for maximum value.",
  "maniac": "The villain is a maniac — they bet and raise with almost any two cards. Exploit by calling down lighter, trapping with strong hands, and letting them spew chips.",
  "unknown": "The villain type is unknown. Provide balanced analysis with notes on what reads would change the recommended line.",
};

const coachRouter = router({
  // Set villain type for a hand
  setVillainType: protectedProcedure
    .input(z.object({ handId: z.number(), villainType: z.string().max(100).nullable() }))
    .mutation(async ({ input, ctx }) => {
      const hand = await getHandById(input.handId);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });
      if (hand.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateVillainType(input.handId, ctx.user.id, input.villainType);
      return { success: true };
    }),

  // Analyze a hand with AI coach (protected — requires auth)
  analyze: protectedProcedure
    .input(z.object({ handId: z.number(), villainType: z.string().max(100).optional() }))
    .mutation(async ({ input, ctx }) => {
      const hand = await getHandById(input.handId);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });
      if (hand.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Determine villain type — prefer input override, fall back to stored value
      const villainTypeKey = (input.villainType || (hand as any).villainType || "unknown").toLowerCase();
      const villainProfile = VILLAIN_PROFILES[villainTypeKey] || VILLAIN_PROFILES["unknown"];

      // If cached analysis exists AND villain type hasn't changed, return cache
      const storedVillainType = (hand as any).villainType || "unknown";
      if (hand.coachUnlocked && hand.coachAnalysis && !input.villainType) {
        return { analysis: hand.coachAnalysis, cached: true, villainType: storedVillainType };
      }

      const parsedData = hand.parsedData as any;

      const prompt = `You are a world-class professional poker coach specialising in exploitative play at mid-to-high stakes ($500-$1000 buy-ins). Your analysis is direct, professional, and focused on maximising EV against this specific villain type.

Hand Description:
${hand.rawText}

Parsed Hand Data:
${JSON.stringify(parsedData, null, 2)}

VILLAIN PROFILE:
${villainProfile}

Analysis requirements:
1. Grade and score each street based on how well the hero exploited (or failed to exploit) the villain type.
2. Identify specific exploitative adjustments — e.g. "against a fish, you should have bet 3x pot on the river instead of checking"
3. Flag any GTO-correct plays that are actually suboptimal against this villain type
4. The keyLesson must be a specific, actionable exploitative adjustment for this villain type
5. In exploitativeAdjustments, list 2-3 concrete changes to make against this villain type specifically

Provide your analysis in this exact JSON format:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "gradeLabel": "Excellent" | "Good" | "Average" | "Below Average" | "Poor",
  "summary": "2-3 sentence direct summary focused on exploitative play vs this villain type",
  "didWell": ["1-3 things the player did well, specifically vs this villain type"],
  "mistakes": ["1-3 exploitative mistakes — what should have been done differently vs this villain"],
  "keyLesson": "The single most important exploitative adjustment for this villain type",
  "exploitativeAdjustments": ["2-3 specific line changes to maximise EV vs this villain type"],
  "villainRoast": "A single punchy, sharp sentence roasting the villain's play in this hand. Direct and specific. E.g. 'Villain called off 80% of their stack with third pair on a four-flush board — textbook fish behaviour.' Keep it under 20 words.",
  "streets": {
    "preflop": { "score": 1-10, "comment": "brief comment on exploitative correctness" },
    "flop": { "score": 1-10, "comment": "brief comment" } | null,
    "turn": { "score": 1-10, "comment": "brief comment" } | null,
    "river": { "score": 1-10, "comment": "brief comment" } | null
  }
}

Be direct and professional. No hand-holding. Focus on EV maximisation.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional poker coach specialising in exploitative play. Always respond with valid JSON only. No markdown, no explanation outside the JSON." },
          { role: "user", content: prompt },
        ],
      });

      let analysis: unknown;
      try {
        const content = response.choices[0].message.content;
        const text = typeof content === "string" ? content : JSON.stringify(content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coach analysis" });
      }

      // Save villain type and analysis
      if (input.villainType) {
        await updateVillainType(input.handId, ctx.user.id, input.villainType);
      }
      await updateHandCoachAnalysis(input.handId, analysis);

      // Update study streak
      const streakResult = await updateStudyStreak(ctx.user.id);

      return { analysis, cached: false, villainType: villainTypeKey, streak: streakResult };
    }),
});

// ─── Streak Router ───────────────────────────────────────────────────────────

const streakRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getStudyStreak(ctx.user.id);
  }),
  bump: protectedProcedure.mutation(async ({ ctx }) => {
    return updateStudyStreak(ctx.user.id);
  }),
});

// ─── Session Leak Detection Router ───────────────────────────────────────────────

const leaksRouter = router({
  analyze: protectedProcedure
    .input(z.object({ sessionDate: z.string().optional() })) // YYYY-MM-DD, defaults to today
    .query(async ({ input, ctx }) => {
      const allHands = await getUserHandsForLeaks(ctx.user.id);
      if (!allHands || allHands.length < 3) {
        return { hasEnoughData: false, leaks: [], summary: null };
      }

      // Group by session date (UTC date of createdAt)
      const targetDate = input.sessionDate || new Date().toISOString().slice(0, 10);
      const sessionHands = allHands.filter((h) => {
        const handDate = new Date(h.createdAt).toISOString().slice(0, 10);
        return handDate === targetDate;
      });

      // Fall back to last 10 hands if no session hands
      const handsToAnalyze = sessionHands.length >= 2 ? sessionHands : allHands.slice(0, 10);
      if (handsToAnalyze.length < 2) return { hasEnoughData: false, leaks: [], summary: null };

      const handSummaries = handsToAnalyze.map((h) => {
        const p = h.parsedData as any;
        return {
          id: h.id,
          rawText: h.rawText.slice(0, 300),
          heroCards: p?.heroCards?.join(" ") || "?",
          position: p?.heroPosition || "?",
          streets: (p?.streets || []).map((s: any) => ({
            name: s.name,
            actions: (s.actions || []).map((a: any) => ({
              player: a.player,
              action: a.action,
              amount: a.amount,
              isHero: a.isHero,
            })),
          })),
          result: p?.result,
          coachGrade: (h.coachAnalysis as any)?.grade || null,
        };
      });

      const prompt = `You are a professional poker coach analysing ${handsToAnalyze.length} hands from a single session to identify recurring EV leaks.

Hands:
${JSON.stringify(handSummaries, null, 2)}

Identify 2-4 specific, recurring patterns that are costing this player money. Focus on:
- Check-fold frequency with made hands
- Missed c-bet spots
- Sizing tells (always same size = exploitable)
- Positional leaks (e.g. playing too many hands from early position)
- Passive play patterns (calling when raising is better)

For each leak, estimate the buy-in impact per 100 hands at these stakes.

Respond in this exact JSON format:
{
  "summary": "1-2 sentence overall session assessment",
  "leaks": [
    {
      "title": "Short leak name (e.g. Check-Fold Frequency)",
      "description": "What the player is doing wrong",
      "fix": "Specific actionable fix",
      "severity": "high" | "medium" | "low",
      "estimatedBuyinImpact": number (e.g. 1.5 = 1.5 buy-ins per 100 hands)
    }
  ],
  "positivePatterns": ["1-2 things the player is doing well"]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional poker coach. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      });

      let result: any;
      try {
        const content = response.choices[0].message.content;
        const text = typeof content === "string" ? content : JSON.stringify(content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse leak analysis" });
      }

      return { hasEnoughData: true, ...result, handsAnalyzed: handsToAnalyze.length };
    }),
});

// ─── Discord Router ───────────────────────────────────────────────────────────

const discordRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getDiscordWebhooks(ctx.user.id);
  }),
  add: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100), webhookUrl: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const id = await createDiscordWebhook(ctx.user.id, input.name, input.webhookUrl);
      return { id };
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteDiscordWebhook(input.id, ctx.user.id);
      return { success: true };
    }),
  setDefault: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await setDefaultDiscordWebhook(input.id, ctx.user.id);
      return { success: true };
    }),
  share: protectedProcedure
    .input(z.object({ handSlug: z.string(), webhookId: z.number(), origin: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const webhooks = await getDiscordWebhooks(ctx.user.id);
      const webhook = webhooks.find((w) => w.id === input.webhookId);
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });

      const hand = await getHandBySlug(input.handSlug);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });

      const parsedData = hand.parsedData as any;
      const shareUrl = `${input.origin}/hand/${input.handSlug}`;

      const embed = {
        title: hand.title || `Poker Hand — ${parsedData?.heroCards?.join(" ") || ""}`,
        description: hand.rawText.slice(0, 300),
        url: shareUrl,
        color: 0xd4a017,
        fields: [
          { name: "Blinds", value: `${parsedData?.smallBlind ?? "?"}/${parsedData?.bigBlind ?? "?"}`, inline: true },
          { name: "Position", value: parsedData?.heroPosition || "?", inline: true },
          { name: "Cards", value: parsedData?.heroCards?.join(" ") || "?", inline: true },
        ],
        footer: { text: "Poker Hand Visualiser" },
      };

      const res = await fetch(webhook.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send to Discord" });
      return { success: true };
    }),
});

// ─── Pattern Recognition Router ────────────────────────────────────────────

const patternsRouter = router({
  // Full cross-hand pattern recognition (Pro only)
  analyze: protectedProcedure
    .input(z.object({
      minHands: z.number().min(3).max(200).default(10),
    }))
    .query(async ({ input, ctx }) => {
      const user = ctx.user as any;
      if (!user.isPro) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Pattern recognition requires a Pro subscription" });
      }

      const allHands = await getUserHandsForLeaks(ctx.user.id);
      if (!allHands || allHands.length < input.minHands) {
        return {
          hasEnoughData: false,
          handsAnalyzed: allHands?.length || 0,
          minRequired: input.minHands,
          patterns: [],
          strengths: [],
          summary: null,
          gradeDistribution: null,
        };
      }

      // Take up to 50 most recent coached hands for pattern analysis
      const coachedHands = allHands.filter((h) => h.coachAnalysis).slice(0, 50);
      const allHandsSample = allHands.slice(0, 50);
      const handsToAnalyze = coachedHands.length >= 5 ? coachedHands : allHandsSample;

      // Compute grade distribution from coached hands
      const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      for (const h of coachedHands) {
        const grade = (h.coachAnalysis as any)?.grade;
        if (grade && grade in gradeCounts) gradeCounts[grade]++;
      }

      // Build position frequency map
      const positionCounts: Record<string, number> = {};
      for (const h of allHands) {
        const pos = (h.parsedData as any)?.heroPosition || "unknown";
        positionCounts[pos] = (positionCounts[pos] || 0) + 1;
      }

      // Build hand summaries for LLM
      const handSummaries = handsToAnalyze.map((h) => {
        const p = h.parsedData as any;
        const coach = h.coachAnalysis as any;
        return {
          id: h.id,
          heroCards: p?.heroCards?.join(" ") || "?",
          position: p?.heroPosition || "?",
          gameType: p?.gameType || "cash",
          streets: (p?.streets || []).map((s: any) => ({
            name: s.name,
            actions: (s.actions || []).filter((a: any) => a.isHero).map((a: any) => ({
              action: a.action,
              amount: a.amount,
            })),
          })),
          result: p?.result,
          coachGrade: coach?.grade || null,
          coachMistakes: coach?.mistakes || [],
          coachKeyLesson: coach?.keyLesson || null,
        };
      });

      const prompt = `You are a world-class poker coach analysing ${handsToAnalyze.length} hands to identify deep strategic patterns and recurring leaks in this player's game.

Hand data:
${JSON.stringify(handSummaries, null, 2)}

Position frequency: ${JSON.stringify(positionCounts)}
Grade distribution: ${JSON.stringify(gradeCounts)}

Provide a comprehensive pattern analysis covering:
1. The 3-5 most significant recurring leaks across all hands
2. Positional tendencies and leaks (e.g. too passive from BB, over-folding from BTN)
3. Street-by-street tendencies (e.g. always c-bets flop but gives up on turn)
4. Hand selection patterns
5. Sizing patterns (always same size = exploitable by opponents)
6. 2-3 genuine strengths to reinforce

For each pattern, provide a concrete drill or exercise to fix it.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence overall assessment of this player's game",
  "overallLevel": "beginner" | "recreational" | "semi-pro" | "regular" | "strong reg",
  "patterns": [
    {
      "category": "Preflop" | "Postflop" | "Sizing" | "Positional" | "Mental Game" | "Range Construction",
      "title": "Short pattern name",
      "description": "What the player is doing and why it costs money",
      "frequency": "always" | "often" | "sometimes",
      "severity": "critical" | "high" | "medium" | "low",
      "estimatedBuyinImpact": number,
      "drill": "Specific exercise to fix this pattern"
    }
  ],
  "strengths": [
    {
      "title": "Strength name",
      "description": "What the player does well"
    }
  ],
  "nextStudyFocus": "The single most important area to study next"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional poker coach. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      });

      let result: any;
      try {
        const content = response.choices[0].message.content;
        const text = typeof content === "string" ? content : JSON.stringify(content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse pattern analysis" });
      }

      return {
        hasEnoughData: true,
        handsAnalyzed: handsToAnalyze.length,
        gradeDistribution: gradeCounts,
        positionFrequency: positionCounts,
        ...result,
      };
    }),
});

// ─── Root Router ──────────────────────────────────────────────────────────────

export const appRouter = router({
  auth: authRouter,
  hands: handsRouter,
  coach: coachRouter,
  streak: streakRouter,
  leaks: leaksRouter,
  discord: discordRouter,
  stripe: stripeRouter,
  patterns: patternsRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
