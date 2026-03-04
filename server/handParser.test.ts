import { describe, it, expect } from "vitest";

// ─── Validation helpers (mirrored from Home.tsx) ──────────────────────────────

function hasBlinds(text: string): boolean {
  return /\d+\s*\/\s*\d+/.test(text);
}

function hasEffStack(text: string): boolean {
  return /\d+(\.\d+)?\s*k?\s*eff/i.test(text);
}

// ─── Board card sanitiser (mirrored from HandReplayer.tsx) ────────────────────

function sanitiseBoardCards(streets: Array<{ name: string; board?: string[] | null }>) {
  return streets.map((street) => {
    const board = street.board ?? [];
    if (street.name === "flop") return { ...street, board: board.slice(0, 3) };
    if (street.name === "turn") return { ...street, board: board.slice(0, 1) };
    if (street.name === "river") return { ...street, board: board.slice(0, 1) };
    return { ...street, board };
  });
}

// ─── Hero-first sort (mirrored from HandReplayer.tsx) ─────────────────────────

function heroFirst<T extends { isHero: boolean }>(players: T[]): T[] {
  const idx = players.findIndex((p) => p.isHero);
  if (idx <= 0) return players;
  return [players[idx], ...players.slice(0, idx), ...players.slice(idx + 1)];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("hasBlinds", () => {
  it("detects standard blinds format", () => {
    expect(hasBlinds("500/1000 2000eff utg open")).toBe(true);
  });
  it("detects blinds with spaces", () => {
    expect(hasBlinds("500 / 1000 2000eff")).toBe(true);
  });
  it("returns false when no blinds present", () => {
    expect(hasBlinds("utg open 2500 we co ATo flat")).toBe(false);
  });
  it("detects small blinds", () => {
    expect(hasBlinds("1/2 100eff hero btn KK")).toBe(true);
  });
});

describe("hasEffStack", () => {
  it("detects standard eff stack", () => {
    expect(hasEffStack("500/1000 2000eff utg open")).toBe(true);
  });
  it("detects eff with space", () => {
    expect(hasEffStack("500/1000 2000 eff utg open")).toBe(true);
  });
  it("detects keff notation", () => {
    expect(hasEffStack("500/1000 2keff utg open")).toBe(true);
  });
  it("is case insensitive", () => {
    expect(hasEffStack("500/1000 2000EFF utg open")).toBe(true);
  });
  it("returns false when no eff stack present", () => {
    expect(hasEffStack("500/1000 utg open 2500")).toBe(false);
  });
});

describe("sanitiseBoardCards", () => {
  it("limits flop to 3 cards", () => {
    const streets = [{ name: "flop", board: ["Ah", "Kd", "2s", "9c", "Th"] }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(3);
    expect(result[0].board).toEqual(["Ah", "Kd", "2s"]);
  });

  it("limits turn to 1 card", () => {
    const streets = [{ name: "turn", board: ["9c", "Th"] }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(1);
    expect(result[0].board).toEqual(["9c"]);
  });

  it("limits river to 1 card", () => {
    const streets = [{ name: "river", board: ["Jh", "2d"] }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(1);
    expect(result[0].board).toEqual(["Jh"]);
  });

  it("allows exactly 3 flop cards through unchanged", () => {
    const streets = [{ name: "flop", board: ["Ah", "Kd", "2s"] }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(3);
  });

  it("handles missing board gracefully", () => {
    const streets = [{ name: "flop", board: null }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(0);
  });

  it("does not modify preflop street", () => {
    const streets = [{ name: "preflop", board: [] }];
    const result = sanitiseBoardCards(streets);
    expect(result[0].board).toHaveLength(0);
  });
});

describe("heroFirst", () => {
  it("moves hero to index 0 when not already first", () => {
    const players = [
      { position: "UTG", isHero: false },
      { position: "CO", isHero: true },
      { position: "BTN", isHero: false },
    ];
    const result = heroFirst(players);
    expect(result[0].position).toBe("CO");
    expect(result[0].isHero).toBe(true);
  });

  it("leaves array unchanged when hero is already first", () => {
    const players = [
      { position: "CO", isHero: true },
      { position: "BTN", isHero: false },
    ];
    const result = heroFirst(players);
    expect(result[0].position).toBe("CO");
    expect(result).toHaveLength(2);
  });

  it("preserves all players", () => {
    const players = [
      { position: "UTG", isHero: false },
      { position: "MP", isHero: false },
      { position: "CO", isHero: true },
      { position: "BTN", isHero: false },
      { position: "BB", isHero: false },
    ];
    const result = heroFirst(players);
    expect(result).toHaveLength(5);
    expect(result[0].isHero).toBe(true);
  });

  it("handles single player", () => {
    const players = [{ position: "BTN", isHero: true }];
    const result = heroFirst(players);
    expect(result).toHaveLength(1);
    expect(result[0].isHero).toBe(true);
  });

  it("returns original array if no hero found", () => {
    const players = [
      { position: "UTG", isHero: false },
      { position: "BB", isHero: false },
    ];
    const result = heroFirst(players);
    expect(result[0].position).toBe("UTG");
  });
});
