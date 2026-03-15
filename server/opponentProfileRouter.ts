/**
 * Opponent Profile Router — Shark-tier exclusive
 *
 * Allows Shark users to manually log observed villain stats (VPIP, PFR, 3-Bet, etc.)
 * and generate a tailored exploitative adjustment report via the LLM.
 *
 * Procedures:
 *   create   — add a new villain profile
 *   list     — list all villain profiles for the user
 *   update   — update stats for an existing villain
 *   delete   — remove a villain profile
 *   analyze  — generate LLM exploitative adjustments for a villain (cached)
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { opponentProfiles } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ─── Validation schemas ───────────────────────────────────────────────────────

const villainStatsSchema = z.object({
  villainName: z.string().min(1).max(100),
  vpip: z.number().int().min(0).max(100),
  pfr: z.number().int().min(0).max(100),
  threeBet: z.number().int().min(0).max(100),
  cbet: z.number().int().min(0).max(100),
  foldToCbet: z.number().int().min(0).max(100),
  af: z.number().int().min(0).max(100), // aggression factor * 10
  handsObserved: z.number().int().min(0).max(1000000),
  notes: z.string().max(2000).optional(),
});

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildExploitPrompt(villain: {
  villainName: string;
  vpip: number;
  pfr: number;
  threeBet: number;
  cbet: number;
  foldToCbet: number;
  af: number;
  handsObserved: number;
  notes: string | null;
}): string {
  const afReal = (villain.af / 10).toFixed(1);
  return `You are a world-class professional poker coach specialising in exploitative mid-to-high stakes play ($500–$1000 buy-ins).

A Shark-tier student has profiled an opponent they face regularly. Generate a precise, actionable exploitative strategy against this villain.

**Villain:** ${villain.villainName}
**Sample Size:** ${villain.handsObserved} hands observed

**Villain Stats:**
- VPIP: ${villain.vpip}% (population baseline: 20–28%)
- PFR: ${villain.pfr}% (baseline: 16–22%)
- 3-Bet %: ${villain.threeBet}% (baseline: 6–9%)
- C-Bet %: ${villain.cbet}% (baseline: 55–70%)
- Fold to C-Bet: ${villain.foldToCbet}% (baseline: 35–50%)
- Aggression Factor: ${afReal} (baseline: 2.5–4.0)
${villain.notes ? `\n**Additional Notes:** ${villain.notes}` : ""}

Deliver a 4-section exploitative report:

**1. Player Type Classification**
Classify this villain (e.g. Fish, Calling Station, Nit, TAG, LAG, Maniac, Weak-Tight) and explain what their stats reveal about their tendencies.

**2. Preflop Exploits**
Specific preflop adjustments: range widening/tightening, 3-bet/4-bet frequencies, isolation plays. Reference their exact stats.

**3. Postflop Exploits**
Specific postflop adjustments: bluff frequency vs their fold-to-cbet, value bet sizing, check-raise spots, river strategies. Be precise.

**4. Key Tells & Patterns**
2–3 specific betting patterns or tendencies to watch for based on their stats, and how to exploit each one.

Be direct, specific, and professional. No generic advice. Every recommendation must be tied to their actual numbers.`;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const opponentProfileRouter = router({
  // ── Create villain profile ─────────────────────────────────────────────────
  create: protectedProcedure
    .input(villainStatsSchema)
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.user as any).plan ?? "fish";
      if (plan !== "shark") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Opponent Profiling is exclusive to the Shark plan.",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(opponentProfiles).values({
        userId: ctx.user.id,
        villainName: input.villainName,
        vpip: input.vpip,
        pfr: input.pfr,
        threeBet: input.threeBet,
        cbet: input.cbet,
        foldToCbet: input.foldToCbet,
        af: input.af,
        handsObserved: input.handsObserved,
        notes: input.notes ?? null,
      });

      return { created: true };
    }),

  // ── List all villain profiles ──────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Opponent Profiling is exclusive to the Shark plan.",
      });
    }

    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(opponentProfiles)
      .where(eq(opponentProfiles.userId, ctx.user.id))
      .orderBy(desc(opponentProfiles.updatedAt));
  }),

  // ── Update villain stats ───────────────────────────────────────────────────
  update: protectedProcedure
    .input(villainStatsSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.user as any).plan ?? "fish";
      if (plan !== "shark") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Opponent Profiling is exclusive to the Shark plan." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const existing = await db
        .select({ id: opponentProfiles.id })
        .from(opponentProfiles)
        .where(and(eq(opponentProfiles.id, input.id), eq(opponentProfiles.userId, ctx.user.id)))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Villain profile not found." });
      }

      await db
        .update(opponentProfiles)
        .set({
          villainName: input.villainName,
          vpip: input.vpip,
          pfr: input.pfr,
          threeBet: input.threeBet,
          cbet: input.cbet,
          foldToCbet: input.foldToCbet,
          af: input.af,
          handsObserved: input.handsObserved,
          notes: input.notes ?? null,
          aiAdjustments: null, // clear cached report when stats change
          updatedAt: new Date(),
        })
        .where(eq(opponentProfiles.id, input.id));

      return { updated: true };
    }),

  // ── Delete villain profile ─────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.user as any).plan ?? "fish";
      if (plan !== "shark") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Opponent Profiling is exclusive to the Shark plan." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .delete(opponentProfiles)
        .where(and(eq(opponentProfiles.id, input.id), eq(opponentProfiles.userId, ctx.user.id)));

      return { deleted: true };
    }),

  // ── Generate exploitative adjustments via LLM ─────────────────────────────
  analyze: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const plan = (ctx.user as any).plan ?? "fish";
      if (plan !== "shark") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Opponent analysis is exclusive to the Shark plan." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select()
        .from(opponentProfiles)
        .where(and(eq(opponentProfiles.id, input.id), eq(opponentProfiles.userId, ctx.user.id)))
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Villain profile not found." });
      }

      const villain = rows[0];

      // Return cached report if available and stats haven't changed
      if (villain.aiAdjustments) {
        return { adjustments: villain.aiAdjustments, cached: true };
      }

      const prompt = buildExploitPrompt(villain);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a world-class professional poker coach. Deliver direct, data-driven exploitative strategy. No generic advice.",
          },
          { role: "user", content: prompt },
        ],
      });

      const adjustments = String(response.choices?.[0]?.message?.content ?? "");

      // Cache the result
      await db
        .update(opponentProfiles)
        .set({ aiAdjustments: adjustments, updatedAt: new Date() })
        .where(eq(opponentProfiles.id, villain.id));

      return { adjustments, cached: false };
    }),
});
