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
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserHands } from "./db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeToScore(grade: string | null | undefined): number {
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  return map[grade ?? ""] ?? -1;
}

function gradeToEV(grade: string | null | undefined): number {
  // Approximate EV BB contribution per grade (exploitative mid-stakes baseline)
  const map: Record<string, number> = { A: 4.2, B: 2.1, C: 0.3, D: -1.5, F: -3.8 };
  return map[grade ?? ""] ?? 0;
}

/** Clamp a value to [0, 100] */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Normalise a percentage to the radar scale with a sensible ceiling */
function normalise(pct: number, ceiling = 100): number {
  return clamp((pct / ceiling) * 100);
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const playerProfileRouter = router({
  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    // Shark-only gate
    const plan = (ctx.user as any).plan ?? "fish";
    if (plan !== "shark") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Player Profile is exclusive to the Shark plan.",
      });
    }

    const allHands = await getUserHands(ctx.user.id);
    if (!allHands || allHands.length === 0) {
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

    if (allHands.length < 5) {
      return {
        hasEnoughData: false,
        handsAnalyzed: allHands.length,
        minRequired: 5,
        radarData: null,
        streetStats: null,
        styleLabel: null,
        styleDescription: null,
      };
    }

    // ── Raw counters ──────────────────────────────────────────────────────────
    let totalHands = 0;
    let vpipCount = 0;       // hero voluntarily put $ in preflop (call or raise, not BB check)
    let pfrCount = 0;        // hero raised preflop
    let threeBetOpps = 0;    // times hero faced a preflop open (could 3-bet)
    let threeBetCount = 0;   // times hero 3-bet preflop
    let cbetOpps = 0;        // times hero was preflop raiser and saw a flop
    let cbetCount = 0;       // times hero c-bet the flop
    let foldToCbetOpps = 0;  // times villain c-bet the flop vs hero
    let foldToCbetCount = 0; // times hero folded to villain c-bet

    // Post-flop aggression: bets + raises vs calls (across all post-flop streets)
    let pfBets = 0;
    let pfRaises = 0;
    let pfCalls = 0;

    // Street-level grade/EV tracking
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

      // ── Preflop analysis ──────────────────────────────────────────────────
      let heroRaisedPreflop = false;
      let heroCalledPreflop = false;
      let heroFacedOpen = false;
      let openRaiserCount = 0;

      if (preflopStreet) {
        const actions: any[] = preflopStreet.actions || [];
        for (const act of actions) {
          if (!act.isHero) {
            if (act.action === "raise" || act.action === "open") openRaiserCount++;
          }
        }
        for (const act of actions) {
          if (act.isHero) {
            if (act.action === "raise" || act.action === "open" || act.action === "3bet") {
              heroRaisedPreflop = true;
            }
            if (act.action === "call") {
              heroCalledPreflop = true;
            }
          }
          // Hero faced a villain open if there was a raise before hero's action
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

        // Preflop street stats
        streetData.preflop.count++;
        const pfCoach = hand.coachAnalysis as any;
        if (pfCoach?.grade) {
          streetData.preflop.grades.push(gradeToScore(pfCoach.grade));
          streetData.preflop.evs.push(gradeToEV(pfCoach.grade));
        }
      }

      // ── Flop analysis ─────────────────────────────────────────────────────
      if (flopStreet) {
        const actions: any[] = flopStreet.actions || [];
        let villainBetFlop = false;
        let heroActedAfterVillainBet = false;
        let heroFoldedToVillainBet = false;
        let heroBetFlop = false;

        // C-bet opportunity: hero raised preflop and there's a flop
        if (heroRaisedPreflop) {
          cbetOpps++;
          // Check if hero bet the flop
          for (const act of actions) {
            if (act.isHero && (act.action === "bet" || act.action === "raise")) {
              heroBetFlop = true;
            }
          }
          if (heroBetFlop) cbetCount++;
        }

        // Fold to c-bet: villain bet flop, hero faced it
        for (const act of actions) {
          if (!act.isHero && (act.action === "bet" || act.action === "raise")) {
            villainBetFlop = true;
          }
          if (act.isHero && villainBetFlop) {
            heroActedAfterVillainBet = true;
            if (act.action === "fold") heroFoldedToVillainBet = true;
          }
        }
        if (heroActedAfterVillainBet) {
          foldToCbetOpps++;
          if (heroFoldedToVillainBet) foldToCbetCount++;
        }

        // Post-flop aggression
        for (const act of actions) {
          if (act.isHero) {
            if (act.action === "bet") pfBets++;
            else if (act.action === "raise") pfRaises++;
            else if (act.action === "call") pfCalls++;
          }
        }

        // Flop street stats (use overall grade as proxy)
        streetData.flop.count++;
        const flopCoach = hand.coachAnalysis as any;
        if (flopCoach?.streetGrades?.flop || flopCoach?.grade) {
          const g = flopCoach?.streetGrades?.flop || flopCoach?.grade;
          streetData.flop.grades.push(gradeToScore(g));
          // Flop EV is typically lower than overall
          streetData.flop.evs.push(gradeToEV(g) * 0.85);
        }
      }

      // ── Turn analysis ─────────────────────────────────────────────────────
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

      // ── River analysis ────────────────────────────────────────────────────
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
          streetData.river.evs.push(gradeToEV(g) * -0.1); // river is where EV leaks most
        }
      }
    }

    // ── Compute percentages ───────────────────────────────────────────────────
    const vpipPct = totalHands > 0 ? (vpipCount / totalHands) * 100 : 0;
    const pfrPct = totalHands > 0 ? (pfrCount / totalHands) * 100 : 0;
    const threeBetPct = threeBetOpps > 0 ? (threeBetCount / threeBetOpps) * 100 : 0;
    const cbetPct = cbetOpps > 0 ? (cbetCount / cbetOpps) * 100 : 0;
    const foldToCbetPct = foldToCbetOpps > 0 ? (foldToCbetCount / foldToCbetOpps) * 100 : 0;
    const aggressionFactor = pfCalls > 0 ? ((pfBets + pfRaises) / pfCalls) * 25 : 50;

    // ── Normalise to radar scale (0–100) ─────────────────────────────────────
    // VPIP: typical reg = 20-28%, fish = 40%+, nit = <15%
    // Normalised so 28% VPIP = ~60 (solid reg), 50% = 100 (fish)
    const radarVPIP = normalise(vpipPct, 50);
    // PFR: typical reg = 16-22%, normalised so 20% = ~70
    const radarPFR = normalise(pfrPct, 30);
    // 3-Bet: typical reg = 6-9%, normalised so 8% = ~70
    const radarThreeBet = normalise(threeBetPct, 12);
    // C-Bet: typical reg = 55-70%, normalised so 65% = ~80
    const radarCBet = normalise(cbetPct, 85);
    // Fold to C-Bet: typical reg = 35-50%, normalised so 45% = ~60
    const radarFoldToCBet = normalise(foldToCbetPct, 80);
    // Aggression: clamped directly
    const radarAggression = clamp(aggressionFactor);

    // ── Street stats ─────────────────────────────────────────────────────────
    function avgGrade(grades: number[]): string {
      if (grades.length === 0) return "N/A";
      const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
      if (avg >= 3.5) return "A";
      if (avg >= 2.5) return "B";
      if (avg >= 1.5) return "C";
      if (avg >= 0.5) return "D";
      return "F";
    }

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

    // ── Style classification ──────────────────────────────────────────────────
    let styleLabel = "Unknown";
    let styleDescription = "";

    if (vpipPct >= 35 && pfrPct < 15) {
      styleLabel = "Calling Station";
      styleDescription = "High VPIP with low aggression. You play too many hands passively — tighten your range and add more raises.";
    } else if (vpipPct < 18 && pfrPct >= 14) {
      styleLabel = "Nit";
      styleDescription = "Very tight and aggressive. You're leaving money on the table by not playing enough hands in position.";
    } else if (vpipPct >= 18 && vpipPct <= 28 && pfrPct >= 14 && aggressionFactor >= 40) {
      styleLabel = "TAG";
      styleDescription = "Tight-aggressive — the gold standard. You play solid ranges with good aggression. Focus on exploiting specific player types.";
    } else if (vpipPct > 28 && vpipPct <= 40 && aggressionFactor >= 40) {
      styleLabel = "LAG";
      styleDescription = "Loose-aggressive. High variance but high ceiling. Ensure your aggression is well-targeted, not random.";
    } else if (vpipPct > 28 && aggressionFactor < 35) {
      styleLabel = "Loose Passive";
      styleDescription = "Playing too many hands without enough aggression. This is the most exploitable style at mid-stakes.";
    } else {
      styleLabel = "Balanced Reg";
      styleDescription = "Solid fundamentals across the board. Work on exploitative adjustments against specific player types.";
    }

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
          Math.round(100 - radarAggression), // passive = inverse of aggression
        ],
        rawStats: {
          vpip: Math.round(vpipPct * 10) / 10,
          pfr: Math.round(pfrPct * 10) / 10,
          threeBet: Math.round(threeBetPct * 10) / 10,
          cbet: Math.round(cbetPct * 10) / 10,
          foldToCbet: Math.round(foldToCbetPct * 10) / 10,
          aggressionFactor: Math.round(aggressionFactor * 10) / 10,
        },
      },
      streetStats,
      styleLabel,
      styleDescription,
    };
  }),
});
