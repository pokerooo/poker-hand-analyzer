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

const coachRouter = router({
  // Analyze a hand with AI coach (protected — requires auth + payment check)
  analyze: protectedProcedure
    .input(z.object({ handId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const hand = await getHandById(input.handId);
      if (!hand) throw new TRPCError({ code: "NOT_FOUND", message: "Hand not found" });
      if (hand.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // If already unlocked, return cached analysis
      if (hand.coachUnlocked && hand.coachAnalysis) {
        return { analysis: hand.coachAnalysis, cached: true };
      }

      // TODO: In production, gate this behind Stripe payment check
      // For now, allow analysis for authenticated users
      const parsedData = hand.parsedData as any;

      const prompt = `You are a professional poker coach. Analyze this hand played by a recreational player and give clear, jargon-free feedback.

Hand Description:
${hand.rawText}

Parsed Hand Data:
${JSON.stringify(parsedData, null, 2)}

Provide your analysis in this exact JSON format:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "gradeLabel": "Excellent" | "Good" | "Average" | "Below Average" | "Poor",
  "summary": "2-3 sentence plain English summary of how the hand was played",
  "didWell": ["list of 1-3 things the player did well"],
  "mistakes": ["list of 1-3 clear mistakes in plain English"],
  "keyLesson": "The single most important thing to take away from this hand",
  "streets": {
    "preflop": { "score": 1-10, "comment": "brief plain English comment" },
    "flop": { "score": 1-10, "comment": "brief plain English comment" } | null,
    "turn": { "score": 1-10, "comment": "brief plain English comment" } | null,
    "river": { "score": 1-10, "comment": "brief plain English comment" } | null
  }
}

Keep language simple and encouraging. Avoid solver jargon. Speak like a friendly coach, not a textbook.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a friendly, encouraging poker coach for recreational players. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      });

      let analysis: unknown;
      try {
        const content = response.choices[0].message.content;
        const text = typeof content === "string" ? content : JSON.stringify(content);
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coach analysis" });
      }

      await updateHandCoachAnalysis(input.handId, analysis);
      return { analysis, cached: false };
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
