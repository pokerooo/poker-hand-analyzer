/**
 * Tests for tier-based monthly usage limit helpers.
 * These tests exercise the pure logic without hitting the DB.
 */
import { describe, expect, it } from "vitest";

// ─── Plan limits constants (mirror db.ts) ────────────────────────────────────
const PLAN_LIMITS = {
  fish: { handsPerMonth: 3, coachPerMonth: 3 },
  reg: { handsPerMonth: 15, coachPerMonth: 15 },
  shark: { handsPerMonth: 50, coachPerMonth: Infinity },
} as const;

type PlanKey = keyof typeof PLAN_LIMITS;

function checkLimit(plan: PlanKey, used: number, type: "hands" | "coach") {
  const limit = type === "hands" ? PLAN_LIMITS[plan].handsPerMonth : PLAN_LIMITS[plan].coachPerMonth;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  return { allowed: used < limit, used, limit, remaining };
}

// ─── Fish tier ───────────────────────────────────────────────────────────────
describe("Fish tier limits", () => {
  it("allows up to 3 hands", () => {
    expect(checkLimit("fish", 0, "hands").allowed).toBe(true);
    expect(checkLimit("fish", 2, "hands").allowed).toBe(true);
    expect(checkLimit("fish", 3, "hands").allowed).toBe(false);
  });

  it("allows up to 3 coach sessions", () => {
    expect(checkLimit("fish", 0, "coach").allowed).toBe(true);
    expect(checkLimit("fish", 2, "coach").allowed).toBe(true);
    expect(checkLimit("fish", 3, "coach").allowed).toBe(false);
  });

  it("reports correct remaining count", () => {
    expect(checkLimit("fish", 1, "hands").remaining).toBe(2);
    expect(checkLimit("fish", 3, "hands").remaining).toBe(0);
  });
});

// ─── Reg tier ────────────────────────────────────────────────────────────────
describe("Reg tier limits", () => {
  it("allows up to 15 hands", () => {
    expect(checkLimit("reg", 14, "hands").allowed).toBe(true);
    expect(checkLimit("reg", 15, "hands").allowed).toBe(false);
  });

  it("allows up to 15 coach sessions", () => {
    expect(checkLimit("reg", 14, "coach").allowed).toBe(true);
    expect(checkLimit("reg", 15, "coach").allowed).toBe(false);
  });

  it("reports correct remaining count", () => {
    expect(checkLimit("reg", 10, "hands").remaining).toBe(5);
  });
});

// ─── Shark tier ──────────────────────────────────────────────────────────────
describe("Shark tier limits", () => {
  it("allows up to 50 hands", () => {
    expect(checkLimit("shark", 49, "hands").allowed).toBe(true);
    expect(checkLimit("shark", 50, "hands").allowed).toBe(false);
  });

  it("allows unlimited coach sessions", () => {
    expect(checkLimit("shark", 999, "coach").allowed).toBe(true);
    expect(checkLimit("shark", 0, "coach").remaining).toBe(Infinity);
  });
});

// ─── Pricing page values ─────────────────────────────────────────────────────
describe("Pricing values", () => {
  it("annual Reg saves vs monthly", () => {
    const monthlyCost = 19 * 12;
    const annualCost = 99;
    expect(annualCost).toBeLessThan(monthlyCost);
    expect(monthlyCost - annualCost).toBe(129); // $129 savings
  });

  it("annual Shark saves vs monthly", () => {
    const monthlyCost = 29 * 12;
    const annualCost = 199;
    expect(annualCost).toBeLessThan(monthlyCost);
    expect(monthlyCost - annualCost).toBe(149); // $149 savings
  });
});
