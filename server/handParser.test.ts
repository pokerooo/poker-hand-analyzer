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

// ─── Stack tracking (mirrored from HandReplayer.tsx buildReplaySteps) ─────────

interface MockPlayer {
  position: string;
  isHero: boolean;
  holeCards?: string[] | null;
  startingStack?: number | null;
}

interface MockAction {
  player: string;
  action: string;
  amount?: number | null;
  isHero?: boolean;
}

interface MockStreet {
  name: "preflop" | "flop" | "turn" | "river";
  board?: string[] | null;
  actions: MockAction[];
  pot?: number | null;
}

interface MockParsedHand {
  smallBlind: number;
  bigBlind: number;
  ante?: number | null;
  players: MockPlayer[];
  heroPosition: string;
  heroCards: string[];
  streets: MockStreet[];
  potSize?: number | null;
  result?: string | null;
  parseNotes?: string | null;
}

// Minimal re-implementation of buildReplaySteps stack tracking logic for testing
function buildStackTracking(parsed: MockParsedHand) {
  const remainingStacks = new Map<string, number | undefined>();
  for (const p of parsed.players) {
    remainingStacks.set(p.position, p.startingStack ?? undefined);
  }

  const snapshots: Array<{ step: number; stacks: Record<string, number | undefined> }> = [];
  let stepCount = 0;

  for (const street of parsed.streets) {
    for (const action of street.actions) {
      if (action.amount) {
        const current = remainingStacks.get(action.player);
        if (current != null) {
          remainingStacks.set(action.player, Math.max(0, current - action.amount));
        }
      }
      snapshots.push({
        step: stepCount++,
        stacks: Object.fromEntries(remainingStacks),
      });
    }
  }

  return { snapshots, finalStacks: Object.fromEntries(remainingStacks) };
}

describe("stack tracking in buildReplaySteps", () => {
  it("deducts bet amount from player stack", () => {
    const parsed: MockParsedHand = {
      smallBlind: 500,
      bigBlind: 1000,
      players: [
        { position: "co", isHero: true, startingStack: 20000 },
        { position: "btn", isHero: false, startingStack: 20000 },
      ],
      heroPosition: "co",
      heroCards: ["As", "Td"],
      streets: [
        {
          name: "preflop",
          actions: [
            { player: "co", action: "raise", amount: 2500, isHero: true },
            { player: "btn", action: "call", amount: 2500 },
          ],
        },
      ],
    };

    const { finalStacks } = buildStackTracking(parsed);
    expect(finalStacks["co"]).toBe(17500);
    expect(finalStacks["btn"]).toBe(17500);
  });

  it("does not deduct for fold actions (no amount)", () => {
    const parsed: MockParsedHand = {
      smallBlind: 500,
      bigBlind: 1000,
      players: [
        { position: "utg", isHero: false, startingStack: 10000 },
        { position: "co", isHero: true, startingStack: 10000 },
      ],
      heroPosition: "co",
      heroCards: ["Kh", "Qd"],
      streets: [
        {
          name: "preflop",
          actions: [
            { player: "utg", action: "fold" },
          ],
        },
      ],
    };

    const { finalStacks } = buildStackTracking(parsed);
    expect(finalStacks["utg"]).toBe(10000); // unchanged
    expect(finalStacks["co"]).toBe(10000);  // unchanged
  });

  it("does not go below zero on all-in", () => {
    const parsed: MockParsedHand = {
      smallBlind: 500,
      bigBlind: 1000,
      players: [
        { position: "co", isHero: true, startingStack: 5000 },
        { position: "btn", isHero: false, startingStack: 10000 },
      ],
      heroPosition: "co",
      heroCards: ["As", "Ks"],
      streets: [
        {
          name: "preflop",
          actions: [
            { player: "co", action: "allin", amount: 5000, isHero: true },
            { player: "btn", action: "call", amount: 5000 },
          ],
        },
      ],
    };

    const { finalStacks } = buildStackTracking(parsed);
    expect(finalStacks["co"]).toBe(0);
    expect(finalStacks["btn"]).toBe(5000);
  });

  it("tracks stacks correctly across multiple streets", () => {
    const parsed: MockParsedHand = {
      smallBlind: 500,
      bigBlind: 1000,
      players: [
        { position: "co", isHero: true, startingStack: 20000 },
        { position: "btn", isHero: false, startingStack: 20000 },
      ],
      heroPosition: "co",
      heroCards: ["As", "Td"],
      streets: [
        {
          name: "preflop",
          actions: [
            { player: "co", action: "raise", amount: 2500, isHero: true },
            { player: "btn", action: "call", amount: 2500 },
          ],
        },
        {
          name: "flop",
          board: ["Ah", "8s", "4c"],
          actions: [
            { player: "co", action: "bet", amount: 3500, isHero: true },
            { player: "btn", action: "call", amount: 3500 },
          ],
        },
      ],
    };

    const { finalStacks } = buildStackTracking(parsed);
    expect(finalStacks["co"]).toBe(14000);  // 20000 - 2500 - 3500
    expect(finalStacks["btn"]).toBe(14000);
  });

  it("returns undefined stack when no startingStack provided", () => {
    const parsed: MockParsedHand = {
      smallBlind: 500,
      bigBlind: 1000,
      players: [
        { position: "co", isHero: true, startingStack: null },
      ],
      heroPosition: "co",
      heroCards: ["As", "Td"],
      streets: [
        {
          name: "preflop",
          actions: [{ player: "co", action: "raise", amount: 2500, isHero: true }],
        },
      ],
    };

    const { finalStacks } = buildStackTracking(parsed);
    expect(finalStacks["co"]).toBeUndefined();
  });
});

// ─── Villain type profile tests ───────────────────────────────────────────────

const VILLAIN_PROFILES: Record<string, string> = {
  "fish": "The villain is a recreational fish/calling station. They call too wide, rarely fold to aggression, and chase draws. Exploit by value betting thinner, betting bigger for value, never bluffing, and avoiding fancy plays.",
  "nit": "The villain is a nit — extremely tight and passive. They fold too much preflop and postflop. Exploit by stealing blinds aggressively, c-betting frequently, and giving up when they show resistance (they have it).",
  "tight reg": "The villain is a tight-aggressive regular. They play a solid but predictable range. Exploit by attacking their folds, 3-betting their opens light in position, and not paying off their strong hands.",
  "lag": "The villain is a loose-aggressive player (LAG). They open wide, barrel frequently, and apply pressure. Exploit by tightening your calling range, trapping with strong hands, and not folding equity to their bluffs.",
  "calling station": "The villain is a calling station who never folds. Exploit by eliminating all bluffs, value betting relentlessly with any made hand, and sizing up for maximum value.",
  "maniac": "The villain is a maniac — they bet and raise with almost any two cards. Exploit by calling down lighter, trapping with strong hands, and letting them spew chips.",
  "unknown": "The villain type is unknown. Provide balanced analysis with notes on what reads would change the recommended line.",
};

function getVillainProfile(villainType: string): string {
  const key = villainType.toLowerCase();
  return VILLAIN_PROFILES[key] || VILLAIN_PROFILES["unknown"];
}

describe("villain type profiles", () => {
  it("returns fish profile for 'fish'", () => {
    const profile = getVillainProfile("fish");
    expect(profile).toContain("calling station");
    expect(profile).toContain("value betting");
  });

  it("returns nit profile for 'nit'", () => {
    const profile = getVillainProfile("nit");
    expect(profile).toContain("tight and passive");
    expect(profile).toContain("stealing blinds");
  });

  it("returns tight reg profile for 'tight reg'", () => {
    const profile = getVillainProfile("tight reg");
    expect(profile).toContain("tight-aggressive");
    expect(profile).toContain("predictable");
  });

  it("returns LAG profile for 'lag'", () => {
    const profile = getVillainProfile("lag");
    expect(profile).toContain("loose-aggressive");
    expect(profile).toContain("barrel");
  });

  it("returns calling station profile for 'calling station'", () => {
    const profile = getVillainProfile("calling station");
    expect(profile).toContain("never folds");
    expect(profile).toContain("value betting relentlessly");
  });

  it("returns maniac profile for 'maniac'", () => {
    const profile = getVillainProfile("maniac");
    expect(profile).toContain("any two cards");
    expect(profile).toContain("trapping");
  });

  it("returns unknown profile for unrecognised villain type", () => {
    const profile = getVillainProfile("aggro whale");
    expect(profile).toContain("villain type is unknown");
  });

  it("is case-insensitive", () => {
    expect(getVillainProfile("FISH")).toBe(getVillainProfile("fish"));
    expect(getVillainProfile("LAG")).toBe(getVillainProfile("lag"));
    expect(getVillainProfile("Tight Reg")).toBe(getVillainProfile("tight reg"));
  });

  it("covers all 6 preset types", () => {
    const presets = ["fish", "nit", "tight reg", "lag", "calling station", "maniac"];
    for (const preset of presets) {
      const profile = getVillainProfile(preset);
      expect(profile).not.toBe(VILLAIN_PROFILES["unknown"]);
    }
  });
});
