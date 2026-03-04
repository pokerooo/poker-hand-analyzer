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
} from "./db";
import { parseHandText } from "./handParser";
import { invokeLLM } from "./_core/llm";

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
      return { analysis, cached: false, villainType: villainTypeKey };
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

// ─── Root Router ──────────────────────────────────────────────────────────────

export const appRouter = router({
  auth: authRouter,
  hands: handsRouter,
  coach: coachRouter,
  discord: discordRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
