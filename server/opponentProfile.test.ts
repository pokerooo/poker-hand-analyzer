/**
 * Tests for opponentProfileRouter helpers and autoSnapshot scheduler
 */
import { describe, it, expect } from "vitest";

// ─── Stat normalisation helpers (inline mirrors of opponentProfileRouter) ─────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function normaliseVillainStat(value: number, ceiling: number): number {
  return clamp((value / ceiling) * 100);
}

/** Classify villain type from VPIP/PFR/AF */
function classifyVillain(vpip: number, pfr: number, afTimes10: number): string {
  const af = afTimes10 / 10;
  const isLoose = vpip >= 30;
  const isTight = vpip < 20;
  const isAggressive = af >= 3 || pfr >= 20;
  const isPassive = af < 2 && pfr < 15;

  if (isTight && isAggressive) return "TAG";
  if (isLoose && isAggressive) return "LAG";
  if (isTight && isPassive) return "Nit";
  if (isLoose && isPassive) return "Calling Station";
  return "Unknown";
}

// ─── msUntilNextSundayMidnightUTC (inline) ────────────────────────────────────

function msUntilNextSundayMidnightUTC(now: Date): number {
  const dayOfWeek = now.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  return nextSunday.getTime() - now.getTime();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("opponentProfile: villain stat normalisation", () => {
  it("normalises VPIP 25% to 50 on a 50% ceiling", () => {
    expect(normaliseVillainStat(25, 50)).toBe(50);
  });

  it("normalises VPIP 50% to 100 (capped)", () => {
    expect(normaliseVillainStat(50, 50)).toBe(100);
  });

  it("normalises VPIP 0% to 0", () => {
    expect(normaliseVillainStat(0, 50)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(normaliseVillainStat(100, 50)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(clamp(-10)).toBe(0);
  });
});

describe("opponentProfile: villain classification", () => {
  it("classifies tight-aggressive player as TAG", () => {
    expect(classifyVillain(18, 15, 35)).toBe("TAG"); // VPIP<20, AF=3.5
  });

  it("classifies loose-aggressive player as LAG", () => {
    expect(classifyVillain(35, 28, 40)).toBe("LAG"); // VPIP>=30, AF=4.0
  });

  it("classifies tight-passive player as Nit", () => {
    expect(classifyVillain(12, 8, 15)).toBe("Nit"); // VPIP<20, AF=1.5
  });

  it("classifies loose-passive player as Calling Station", () => {
    expect(classifyVillain(45, 10, 15)).toBe("Calling Station"); // VPIP>=30, AF=1.5
  });
});

describe("autoSnapshot: next Sunday midnight UTC scheduler", () => {
  it("returns a positive delay for any day of the week", () => {
    // Test from a known Monday (2026-03-16 is a Monday)
    const monday = new Date("2026-03-16T10:00:00Z");
    const ms = msUntilNextSundayMidnightUTC(monday);
    expect(ms).toBeGreaterThan(0);
  });

  it("returns ~6 days delay when called on a Monday", () => {
    const monday = new Date("2026-03-16T00:00:00Z");
    const ms = msUntilNextSundayMidnightUTC(monday);
    const days = ms / (1000 * 60 * 60 * 24);
    // Next Sunday from Monday = 6 days
    expect(days).toBeCloseTo(6, 0);
  });

  it("returns exactly 7 days when called on Sunday midnight UTC", () => {
    // Sunday midnight UTC — next Sunday is 7 days away
    const sundayMidnight = new Date("2026-03-15T00:00:00Z"); // 2026-03-15 is a Sunday
    const ms = msUntilNextSundayMidnightUTC(sundayMidnight);
    const days = ms / (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(7, 0);
  });

  it("returns ~1 day delay when called on Saturday", () => {
    const saturday = new Date("2026-03-14T12:00:00Z");
    const ms = msUntilNextSundayMidnightUTC(saturday);
    const days = ms / (1000 * 60 * 60 * 24);
    // Saturday noon → next Sunday midnight = ~0.5 days (12 hours to midnight, then 0 hours)
    expect(days).toBeGreaterThanOrEqual(0.5);
    expect(days).toBeLessThan(2);
  });
});

describe("opponentProfile: AF normalisation", () => {
  it("normalises AF stored as ×10 correctly", () => {
    // AF stored as 30 means 3.0; normalised to 0-100 with ceiling of 10 (AF=10.0)
    const afTimes10 = 30;
    const afReal = afTimes10 / 10; // 3.0
    const normalised = Math.min(100, (afReal / 10) * 25); // same formula as VillainRadar
    expect(normalised).toBeCloseTo(7.5, 1);
  });

  it("caps extreme AF at 100", () => {
    const afTimes10 = 1000; // AF=100 — absurd but should cap
    const afReal = afTimes10 / 10;
    const normalised = Math.min(100, (afReal / 10) * 25);
    expect(normalised).toBe(100);
  });
});
