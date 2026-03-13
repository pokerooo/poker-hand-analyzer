/**
 * Tests for Player Profile metrics computation
 * Validates radar normalisation, style classification, and street stats
 */

import { describe, it, expect } from "vitest";

// ─── Inline the pure computation helpers (no DB dependency) ──────────────────

function gradeToScore(grade: string | null | undefined): number {
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  return map[grade ?? ""] ?? -1;
}

function gradeToEV(grade: string | null | undefined): number {
  const map: Record<string, number> = { A: 4.2, B: 2.1, C: 0.3, D: -1.5, F: -3.8 };
  return map[grade ?? ""] ?? 0;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function normalise(pct: number, ceiling = 100): number {
  return clamp((pct / ceiling) * 100);
}

function avgGrade(grades: number[]): string {
  if (grades.length === 0) return "N/A";
  const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
  if (avg >= 3.5) return "A";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "C";
  if (avg >= 0.5) return "D";
  return "F";
}

function classifyStyle(vpipPct: number, pfrPct: number, aggressionFactor: number): string {
  if (vpipPct >= 35 && pfrPct < 15) return "Calling Station";
  if (vpipPct < 18 && pfrPct >= 14) return "Nit";
  if (vpipPct >= 18 && vpipPct <= 28 && pfrPct >= 14 && aggressionFactor >= 40) return "TAG";
  if (vpipPct > 28 && vpipPct <= 40 && aggressionFactor >= 40) return "LAG";
  if (vpipPct > 28 && aggressionFactor < 35) return "Loose Passive";
  return "Balanced Reg";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Player Profile — grade helpers", () => {
  it("maps grade A to score 4", () => {
    expect(gradeToScore("A")).toBe(4);
  });

  it("maps grade F to score 0", () => {
    expect(gradeToScore("F")).toBe(0);
  });

  it("returns -1 for unknown grade", () => {
    expect(gradeToScore("Z")).toBe(-1);
    expect(gradeToScore(null)).toBe(-1);
  });

  it("maps grade A to EV 4.2", () => {
    expect(gradeToEV("A")).toBe(4.2);
  });

  it("maps grade F to EV -3.8", () => {
    expect(gradeToEV("F")).toBe(-3.8);
  });
});

describe("Player Profile — normalisation", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("normalises VPIP 28% to ~56 with ceiling 50", () => {
    // 28/50 * 100 = 56 (floating point may produce 56.00000000000001)
    expect(normalise(28, 50)).toBeCloseTo(56, 5);
  });

  it("normalises VPIP 50% to 100 (ceiling hit)", () => {
    expect(normalise(50, 50)).toBe(100);
  });

  it("normalises VPIP 0% to 0", () => {
    expect(normalise(0, 50)).toBe(0);
  });
});

describe("Player Profile — avgGrade", () => {
  it("returns N/A for empty array", () => {
    expect(avgGrade([])).toBe("N/A");
  });

  it("returns A when all scores are 4", () => {
    expect(avgGrade([4, 4, 4])).toBe("A");
  });

  it("returns B for mixed A/B scores", () => {
    expect(avgGrade([4, 3, 3, 3])).toBe("B"); // avg = 3.25 → B
  });

  it("returns F for all-zero scores", () => {
    expect(avgGrade([0, 0, 0])).toBe("F");
  });

  it("returns C for mid-range scores", () => {
    expect(avgGrade([2, 2, 2])).toBe("C");
  });
});

describe("Player Profile — style classification", () => {
  it("classifies TAG correctly", () => {
    expect(classifyStyle(22, 18, 55)).toBe("TAG");
  });

  it("classifies Calling Station correctly", () => {
    expect(classifyStyle(40, 10, 20)).toBe("Calling Station");
  });

  it("classifies Nit correctly", () => {
    expect(classifyStyle(15, 14, 60)).toBe("Nit");
  });

  it("classifies LAG correctly", () => {
    expect(classifyStyle(35, 25, 60)).toBe("LAG");
  });

  it("classifies Loose Passive correctly", () => {
    expect(classifyStyle(35, 15, 25)).toBe("Loose Passive");
  });

  it("classifies Balanced Reg as fallback", () => {
    expect(classifyStyle(24, 12, 38)).toBe("Balanced Reg");
  });
});
