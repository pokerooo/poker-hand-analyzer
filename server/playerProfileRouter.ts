/**
 * Player Profile Router — Shark-tier exclusive
 *
 * Derives a 6-dimensional playing style radar from the user's hand history:
 *   VPIP        — Voluntarily Put In Pot (preflop aggression/looseness)
 *   PFR         — Pre-Flop Raise %
 *   Aggression  — Post-flop aggression factor (bets+raises / calls)
 *   3-Bet %     — 3-bet frequency when facing an open
 *   C-Bet %     — Continuation bet frequency on flop
 *   Fold to CBet — How often hero folds to villain c-bet
 *
 * All values are normalised to 0–100 for the radar chart.
 * Street-by-street stats (hands analysed, avg grade, EV BB) are also returned.
 *
 * Additional Shark-only procedures:
 *   generateReport  — LLM coaching narrative from current radar + street stats
 *   saveSnapshot    — persist current metrics as a dated snapshot
 *   getSnapshots    — list historical snapshots for trend chart
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserHands } from "./db";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { profileSnapshots } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function gradeToScore(grade: string | null | undefined): number {
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  return map[grade ?? ""] ?? -1;
}

export function gradeToEV(grade: string | null | undefined): number {
  // Approximate EV BB contribution per grade (exploitative mid-stakes baseline)
  const map: Record<string, number> = { A: 4.2, B: 2.1, C: 0.3, D: -1.5, F: -3.8 };
  return map[grade ?? ""] ?? 0;
}

/** Clamp a value to [0, 100] */
export function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Normalise a percentage to the radar scale with a sensible ceiling */
export function normalise(pct: number, ceiling = 100): number {
  return clamp((pct / ceiling) * 100);
}

export function avgGrade(grades: number[]): string {
  if (grades.length === 0) return "N/A";
  const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
  if (avg >= 3.5) return "A";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "C";
  if (avg >= 0.5) return "D";
  return "F";
}

export function classifyStyle(
  vpipPct: number,
  pfrPct: number,
  aggressionFactor: number
): { label: string; description: string } {
  if (vpipPct >= 35 && pfrPct < 15) {
    return {
      label: "Calling Station",
      description:
        "High VPIP with low aggression. You play too many hands passively — tighten your range and add more raises.",
    };
  }
  if (vpipPct < 18 && pfrPct >= 14) {
    return {
      label: "Nit",
      description:
        "Very tight and aggressive. You're leaving money on the table by not playing enough hands in position.",
    };
  }
  if (vpipPct >= 18 && vpipPct <= 28 && pfrPct >= 14 && aggressionFactor >= 40) {
    return {
      label: "TAG",
      description:
        "Tight-aggressive — the gold standard. You play solid ranges with good aggression. Focus on exploiting specific player types.",
    };
  }
  if (vpipPct > 28 && vpipPct <= 40 && aggressionFactor >= 40) {
    return {
      label: "LAG",
      description:
        "Loose-aggressive. High variance but high ceiling. Ensure your aggression is well-targeted, not random.",
    };
  }
  if (vpipPct > 28 && aggressionFactor < 35) {
    return {
      label: "Loose Passive",
      description:
        "Playing too many hands without enough aggression. This is the most exploitable style at mid-stakes.",
    };
  }
  return {
    label: "Balanced Reg",
    description:
      "Solid fundamentals across the board. Work on exploitative adjustments against specific player types.",
  };
}

// ─── Shared metric computation (reused by getMetrics + saveSnapshot) ─────────

async function computeMetrics(userId: number) {
  const allHands = await getUserHands(userId);
  if (!allHands || allHands.length < 5) {
    return null;
  }

  let totalHands = 0;
  let vpipCount = 0;
  let pfrCount = 0;
  let threeBetOpps = 0;
  let threeBetCount = 0;
  let cbetOpps = 0;
  let cbetCount = 0;
  let foldToCbetOpps = 0;
  let foldToCbetCount = 0;
  let pfBets = 0;
  let pfRaises = 0;
  let pfCalls = 0;

  const streetData: Record<string, { grades: number[]; evs: number[]; count: number }> = {
    preflop: { grades: [], evs: [], count: 0 },
    flop: { grades: [], evs: [], count: 0 },
    turn: { grades: [], evs: [], count: 0 },
    river: { grades: [], evs: [], count: 0 },
  };

  for (const hand of allHands) {
    const p = hand.parsedData as any;
    if (!p) continue;
    totalHands++;

    const streets: any[] = p.streets || [];
    const preflopStreet = streets.find((s: any) => s.name?.toLowerCase() === "preflop");
    const flopStreet = streets.find((s: any) => s.name?.toLowerCase() === "flop");
    const turnStreet = streets.find((s: any) => s.name?.toLowerCase() === "turn");
    const riverStreet = streets.find((s: any) => s.name?.toLowerCase() === "river");

    let heroRaisedPreflop = false;
    let heroCalledPreflop = false;
    let heroFacedOpen = false;

    if (preflopStreet) {
      const actions: any[] = preflopStreet.actions || [];
      for (const act of actions) {
        if (act.isHero) {
          if (act.action === "raise" || act.action === "open" || act.action === "3bet") {
            heroRaisedPreflop = true;
          }
          if (act.action === "call") heroCalledPreflop = true;
        }
        if (!act.isHero && (act.action === "raise" || act.action === "open")) {
          heroFacedOpen = true;
        }
      }
      if (heroRaisedPreflop || heroCalledPreflop) vpipCount++;
      if (heroRaisedPreflop) pfrCount++;
      if (heroFacedOpen) {
        threeBetOpps++;
        if (heroRaisedPreflop) threeBetCount++;
      }
      streetData.preflop.count++;
      const pfCoach = hand.coachAnalysis as any;
      if (pfCoach?.grade) {
        streetData.preflop.grades.push(gradeToScore(pfCoach.grade));
        streetData.preflop.evs.push(gradeToEV(pfCoach.grade));
      }
    }

    if (flopStreet) {
      const actions: any[] = flopStreet.actions || [];
      let villainBetFlop = false;
      let heroActedAfterVillainBet = false;
      let heroFoldedToVillainBet = false;
      let heroBetFlop = false;

      if (heroRaisedPreflop) {
        cbetOpps++;
        for (const act of actions) {
          if (act.isHero && (act.action === "bet" || act.action === "raise")) {
            heroBetFlop = true;
          }
        }
        if (heroBetFlop) cbetCount++;
      }

      for (const act of actions) {
        if (!act.isHero && (act.action === "bet" || act.action === "raise")) villainBetFlop = true;
        if (act.isHero && villainBetFlop) {
          heroActedAfterVillainBet = true;
          if (act.action === "fold") heroFoldedToVillainBet = true;
        }
      }
      if (heroActedAfterVillainBet) {
        foldToCbetOpps++;
        if (heroFoldedToVillainBet) foldToCbetCount++;
      }

      for (const act of actions) {
        if (act.isHero) {
          if (act.action === "bet") pfBets++;
          else if (act.action === "raise") pfRaises++;
          else if (act.action === "call") pfCalls++;
        }
      }

      streetData.flop.count++;
      const flopCoach = hand.coachAnalysis as any;
      if (flopCoach?.streetGrades?.flop || flopCoach?.grade) {
        const g = flopCoach?.streetGrades?.flop || flopCoach?.grade;
        streetData.flop.grades.push(gradeToScore(g));
        streetData.flop.evs.push(gradeToEV(g) * 0.85);
      }
    }

    if (turnStreet) {
      const actions: any[] = turnStreet.actions || [];
      for (const act of actions) {
        if (act.isHero) {
          if (act.action === "bet") pfBets++;
          else if (act.action === "raise") pfRaises++;
          else if (act.action === "call") pfCalls++;
        }
      }
      streetData.turn.count++;
      const turnCoach = hand.coachAnalysis as any;
      if (turnCoach?.streetGrades?.turn || turnCoach?.grade) {
        const g = turnCoach?.streetGrades?.turn || turnCoach?.grade;
        streetData.turn.grades.push(gradeToScore(g));
        streetData.turn.evs.push(gradeToEV(g) * 0.45);
      }
    }

    if (riverStreet) {
      const actions: any[] = riverStreet.actions || [];
      for (const act of actions) {
        if (act.isHero) {
          if (act.action === "bet") pfBets++;
          else if (act.action === "raise") pfRaises++;
          else if (act.action === "call") pfCalls++;
        }
      }
      streetData.river.count++;
      const riverCoach = hand.coachAnalysis as any;
      if (riverCoach?.streetGrades?.river || riverCoach?.grade) {
        const g = riverCoach?.streetGrades?.river || riverCoach?.grade;
        streetData.river.grades.push(gradeToScore(g));
        streetData.river.evs.push(gradeToEV(g) * -0.1);
      }
    }
  }

  const vpipPct = totalHands > 0 ? (vpipCount / totalHands) * 100 : 0;
  const pfrPct = totalHands > 0 ? (pfrCount / totalHands) * 100 : 0;
  const threeBetPct = threeBetOpps > 0 ? (threeBetCount / threeBetOpps) * 100 : 0;
  const cbetPct = cbetOpps > 0 ? (cbetCount / cbetOpps) * 100 : 0;
  const foldToCbetPct = foldToCbetOpps > 0 ? (foldToCbetCount / foldToCbetOpps) * 100 : 0;
  const aggressionFactor = pfCalls > 0 ? ((pfBets + pfRaises) / pfCalls) * 25 : 50;

  const radarVPIP = normalise(vpipPct, 50);
  const radarPFR = normalise(pfrPct, 30);
  const radarThreeBet = normalise(threeBetPct, 12);
  const radarCBet = normalise(cbetPct, 85);
  const radarFoldToCBet = normalise(foldToCbetPct, 80);
  const radarAggression = clamp(aggressionFactor);

  function avgEV(evs: number[]): number {
    if (evs.length === 0) return 0;
    return Math.round((evs.reduce((a, b) => a + b, 0) / evs.length) * 10) / 10;
  }

  const streetStats = [
    {
      street: "PREFLOP",
      handsAnalysed: streetData.preflop.count,
      avgGrade: avgGrade(streetData.preflop.grades),
      evBB: avgEV(streetData.preflop.evs),
    },
    {
      street: "FLOP",
      handsAnalysed: streetData.flop.count,
      avgGrade: avgGrade(streetData.flop.grades),
      evBB: avgEV(streetData.flop.evs),
    },
    {
      street: "TURN",
      handsAnalysed: streetData.turn.count,
      avgGrade: avgGrade(streetData.turn.grades),
      evBB: avgEV(streetData.turn.evs),
    },
    {
      street: "RIVER",
      handsAnalysed: streetData.river.count,
      avgGrade: avgGrade(streetData.river.grades),
      evBB: avgEV(streetData.river.evs),
    },
  ];

  const style = classifyStyle(vpipPct, pfrPct, aggressionFactor);

  return {
    hasEnoughData: true,
    handsAnalyzed: totalHands,
    minRequired: 5,
    radarData: {
      labels: ["PREFLOP", "FLOP", "TURN", "RIVER", "AGGRESSION", "PASSIVE"],
      values: [
        Math.round(radarVPIP),
        Math.round(radarCBet),
        Math.round(radarPFR),
        Math.round(radarFoldToCBet),
        Math.round(radarAggression),
        Math.round(100 - radarAggression),
      ],
      rawStats: {
        vpip: Math.round(vpipPct * 10) / 10,
        pfr: Math.round(pfrPct * 10) / 10,
        threeBet: Math.round(threeBetPct * 10) / 10,
        cbet: Math.round(cbetPct * 10) / 10,
        foldToCbet: Math.round(foldToCbetPct * 10) / 10,
        aggressionFactor: Math.round(aggressionFactor * 10) / 10,
      },
      // Normalised values for snapshot storage
      normVpip: Math.round(radarVPIP),
      normPfr: Math.round(radarPFR),
      normThreeBet: Math.round(radarThreeBet),
      normCbet: Math.round(radarCBet),
      normFoldToCbet: Math.round(radarFoldToCBet),
      normAggression: Math.round(radarAggression),
    },
    streetStats,
    styleLabel: style.label,
    styleDescription: style.description,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const playerProfileRouter = router({
  // ── Get current metrics ────────────────────────────────────────────────────
  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Player Profile is exclusive to the Shark plan.",
      });
    }

    const metrics = await computeMetrics(ctx.user.id);
    if (!metrics) {
      return {
        hasEnoughData: false,
        handsAnalyzed: 0,
        minRequired: 5,
        radarData: null,
        streetStats: null,
        styleLabel: null,
        styleDescription: null,
      };
    }
    return metrics;
  }),

  // ── Generate AI coaching narrative ────────────────────────────────────────
  generateReport: protectedProcedure.mutation(async ({ ctx }) => {
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AI Report is exclusive to the Shark plan.",
      });
    }

    const metrics = await computeMetrics(ctx.user.id);
    if (!metrics || !metrics.hasEnoughData) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not enough hands to generate a report. Play at least 5 hands first.",
      });
    }

    const { radarData, streetStats, styleLabel, styleDescription, handsAnalyzed } = metrics;
    const raw = radarData!.rawStats;

    const prompt = `You are a world-class professional poker coach specialising in exploitative mid-to-high stakes play ($500–$1000 buy-ins). 

A player has submitted their playing style metrics derived from ${handsAnalyzed} hands. Analyse these stats and deliver a direct, professional coaching assessment.

**Player Style:** ${styleLabel}
**Style Summary:** ${styleDescription}

**Core Stats:**
- VPIP: ${raw.vpip}% (industry baseline for a solid reg: 20–28%)
- PFR: ${raw.pfr}% (baseline: 16–22%)
- 3-Bet %: ${raw.threeBet}% (baseline: 6–9%)
- C-Bet %: ${raw.cbet}% (baseline: 55–70%)
- Fold to C-Bet: ${raw.foldToCbet}% (baseline: 35–50%)
- Aggression Factor: ${raw.aggressionFactor} (baseline: 2.5–4.0)

**Street Performance:**
${streetStats!.map((s) => `- ${s.street}: ${s.handsAnalysed} hands, Avg Grade: ${s.avgGrade}, EV: ${s.evBB > 0 ? "+" : ""}${s.evBB} BB`).join("\n")}

Write a 3-paragraph coaching report:
1. **Strengths** — what this player does well relative to mid-stakes benchmarks
2. **Primary Leaks** — the 2–3 most critical exploitable weaknesses with specific numbers
3. **Action Plan** — 3 concrete, immediately implementable adjustments ranked by EV impact

Be direct and specific. No generic advice. Reference the actual numbers. Tone: professional poker coach, not a chatbot.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a world-class professional poker coach. Deliver direct, data-driven coaching assessments. No fluff.",
        },
        { role: "user", content: prompt },
      ],
    });

    const report = response.choices?.[0]?.message?.content ?? "";

    // Cache the report in the most recent snapshot if one exists for today
    const today = new Date().toISOString().slice(0, 10);
    const dbConn = await getDb();
    if (dbConn) {
      const existing = await dbConn
        .select()
        .from(profileSnapshots)
        .where(eq(profileSnapshots.userId, ctx.user.id))
        .orderBy(desc(profileSnapshots.createdAt))
        .limit(1);

      if (existing.length > 0 && existing[0].snapshotDate === today) {
        await dbConn
          .update(profileSnapshots)
          .set({ aiReport: String(report) })
          .where(eq(profileSnapshots.id, existing[0].id));
      }
    }

    return { report };
  }),

  // ── Save a weekly snapshot ─────────────────────────────────────────────────
  saveSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Snapshots are exclusive to the Shark plan.",
      });
    }

    const metrics = await computeMetrics(ctx.user.id);
    if (!metrics || !metrics.hasEnoughData) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not enough hands to save a snapshot.",
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { radarData, streetStats, styleLabel, handsAnalyzed } = metrics;
    const norm = radarData!;
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const snapshotData = {
      userId: ctx.user.id,
      snapshotDate: today,
      handsCount: handsAnalyzed,
      styleTag: styleLabel ?? "Unknown",
      vpip: norm.normVpip,
      pfr: norm.normPfr,
      threeBet: norm.normThreeBet,
      cbet: norm.normCbet,
      foldToCbet: norm.normFoldToCbet,
      aggression: norm.normAggression,
      preflopGrade: streetStats![0].avgGrade,
      flopGrade: streetStats![1].avgGrade,
      turnGrade: streetStats![2].avgGrade,
      riverGrade: streetStats![3].avgGrade,
    };

    // Upsert: replace today's snapshot if it already exists
    const existing = await dbConn
      .select({ id: profileSnapshots.id, snapshotDate: profileSnapshots.snapshotDate })
      .from(profileSnapshots)
      .where(eq(profileSnapshots.userId, ctx.user.id))
      .orderBy(desc(profileSnapshots.createdAt))
      .limit(1);

    if (existing.length > 0 && existing[0].snapshotDate === today) {
      await dbConn
        .update(profileSnapshots)
        .set(snapshotData)
        .where(eq(profileSnapshots.id, existing[0].id));
      return { saved: true, updated: true };
    }

    await dbConn.insert(profileSnapshots).values(snapshotData);
    return { saved: true, updated: false };
  }),

  // ── Get historical snapshots ───────────────────────────────────────────────
  getSnapshots: protectedProcedure.query(async ({ ctx }) => {
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Snapshot history is exclusive to the Shark plan.",
      });
    }

    const dbConn = await getDb();
    if (!dbConn) return [];

    const snapshots = await dbConn
      .select()
      .from(profileSnapshots)
      .where(eq(profileSnapshots.userId, ctx.user.id))
      .orderBy(desc(profileSnapshots.createdAt))
      .limit(12); // last 12 snapshots (~3 months of weekly)

    return snapshots.reverse(); // chronological order for chart
  }),
});
