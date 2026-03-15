/**
 * Auto-Snapshot Cron Job
 *
 * Runs every Sunday at midnight UTC.
 * For every Shark-tier user who has >= 5 hands, automatically saves a
 * profile snapshot so the trend chart populates without manual saves.
 *
 * Uses a simple setInterval-based scheduler (no external cron dependency).
 * The first run is scheduled for the next Sunday midnight UTC.
 */

import { getDb } from "./db";
import { users, profileSnapshots } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getUserHands } from "./db";
import {
  gradeToScore,
  gradeToEV,
  clamp,
  normalise,
  avgGrade,
  classifyStyle,
} from "./playerProfileRouter";

/** Returns milliseconds until next Sunday at 00:00 UTC */
function msUntilNextSundayMidnightUTC(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  return nextSunday.getTime() - now.getTime();
}

async function runAutoSnapshot(): Promise<void> {
  console.log("[AutoSnapshot] Starting weekly auto-snapshot run...");
  const db = await getDb();
  if (!db) {
    console.warn("[AutoSnapshot] Database unavailable, skipping.");
    return;
  }

  // Get all Shark-tier users
  const sharkUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.plan, "shark"));

  console.log(`[AutoSnapshot] Found ${sharkUsers.length} Shark users.`);

  const today = new Date().toISOString().slice(0, 10);
  let saved = 0;
  let skipped = 0;

  for (const u of sharkUsers) {
    try {
      const allHands = await getUserHands(u.id);
      if (!allHands || allHands.length < 5) {
        skipped++;
        continue;
      }

      // Compute metrics (inline — mirrors computeMetrics in playerProfileRouter)
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
              if (act.action === "raise" || act.action === "open" || act.action === "3bet") heroRaisedPreflop = true;
              if (act.action === "call") heroCalledPreflop = true;
            }
            if (!act.isHero && (act.action === "raise" || act.action === "open")) heroFacedOpen = true;
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
              if (act.isHero && (act.action === "bet" || act.action === "raise")) heroBetFlop = true;
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

      const style = classifyStyle(vpipPct, pfrPct, aggressionFactor);

      const snapshotData = {
        userId: u.id,
        snapshotDate: today,
        handsCount: totalHands,
        styleTag: style.label,
        vpip: Math.round(normalise(vpipPct, 50)),
        pfr: Math.round(normalise(pfrPct, 30)),
        threeBet: Math.round(normalise(threeBetPct, 12)),
        cbet: Math.round(normalise(cbetPct, 85)),
        foldToCbet: Math.round(normalise(foldToCbetPct, 80)),
        aggression: Math.round(clamp(aggressionFactor)),
        preflopGrade: avgGrade(streetData.preflop.grades),
        flopGrade: avgGrade(streetData.flop.grades),
        turnGrade: avgGrade(streetData.turn.grades),
        riverGrade: avgGrade(streetData.river.grades),
      };

      // Upsert: replace today's snapshot if it already exists
      const existing = await db
        .select({ id: profileSnapshots.id, snapshotDate: profileSnapshots.snapshotDate })
        .from(profileSnapshots)
        .where(eq(profileSnapshots.userId, u.id))
        .orderBy(desc(profileSnapshots.createdAt))
        .limit(1);

      if (existing.length > 0 && existing[0].snapshotDate === today) {
        await db.update(profileSnapshots).set(snapshotData).where(eq(profileSnapshots.id, existing[0].id));
      } else {
        await db.insert(profileSnapshots).values(snapshotData);
      }

      saved++;
    } catch (err) {
      console.error(`[AutoSnapshot] Error for userId=${u.id}:`, err);
    }
  }

  console.log(`[AutoSnapshot] Done. Saved: ${saved}, Skipped (insufficient hands): ${skipped}`);
}

/** Start the weekly auto-snapshot scheduler */
export function startAutoSnapshotScheduler(): void {
  const msUntilFirst = msUntilNextSundayMidnightUTC();
  const daysUntil = Math.round(msUntilFirst / (1000 * 60 * 60 * 24));
  console.log(`[AutoSnapshot] Scheduler started. Next run in ~${daysUntil} day(s) (next Sunday midnight UTC).`);

  // Schedule first run at next Sunday midnight UTC
  setTimeout(() => {
    runAutoSnapshot().catch(console.error);
    // Then repeat every 7 days
    setInterval(() => {
      runAutoSnapshot().catch(console.error);
    }, 7 * 24 * 60 * 60 * 1000);
  }, msUntilFirst);
}
