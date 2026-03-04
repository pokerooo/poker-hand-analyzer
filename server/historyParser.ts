/**
 * Hand History Parser
 * Supports PokerStars and GGPoker .txt hand history formats.
 * Converts raw hand history text into the same ParsedHand schema used by the AI parser.
 */

export interface ParsedHistoryHand {
  title: string;
  rawText: string;
  gameType: "cash" | "mtt";
  stakes: string;
  heroPosition: string;
  heroCards: string[];
  villains: Array<{
    position: string;
    cards?: string[];
    startingStack: number;
  }>;
  board: string[];
  streets: Array<{
    name: "preflop" | "flop" | "turn" | "river";
    board?: string[];
    actions: Array<{
      player: string;
      action: string;
      amount?: number | null;
      isHero?: boolean;
    }>;
    pot?: number;
  }>;
  heroStartingStack: number;
  potSize: number;
  result: string;
  heroName?: string;
}

// ─── PokerStars Parser ────────────────────────────────────────────────────────

function parsePokerStarsHand(text: string): ParsedHistoryHand | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  // Header: PokerStars Hand #123: Hold'em No Limit ($1/$2 USD) - 2024/01/15 20:00:00 ET
  const headerLine = lines[0];
  const stakesMatch = headerLine.match(/\(([^)]+)\)/);
  const stakes = stakesMatch ? stakesMatch[1] : "unknown";
  const isMTT = headerLine.includes("Tournament") || headerLine.includes("Tourney");
  const gameType: "cash" | "mtt" = isMTT ? "mtt" : "cash";

  // Table line: Table 'TableName' 6-max Seat #3 is the button
  const tableLine = lines.find((l) => l.startsWith("Table ")) || "";
  const btnSeatMatch = tableLine.match(/Seat #(\d+) is the button/);
  const btnSeat = btnSeatMatch ? parseInt(btnSeatMatch[1]) : 1;

  // Seat lines: Seat 1: PlayerName ($200 in chips)
  const seatLines = lines.filter((l) => /^Seat \d+:/.test(l));
  const players: Array<{ seat: number; name: string; stack: number }> = [];
  for (const line of seatLines) {
    const m = line.match(/^Seat (\d+): (.+?) \((\$?[\d,]+(?:\.\d+)?)/);
    if (m) {
      players.push({
        seat: parseInt(m[1]),
        name: m[2].trim(),
        stack: parseFloat(m[3].replace(/[$,]/g, "")),
      });
    }
  }

  // Find hero name from "Dealt to" line
  const dealtLine = lines.find((l) => l.startsWith("Dealt to "));
  const heroNameMatch = dealtLine?.match(/^Dealt to (.+?) \[/);
  const heroName = heroNameMatch ? heroNameMatch[1].trim() : players[0]?.name || "Hero";

  // Hero cards
  const heroCardsMatch = dealtLine?.match(/\[([^\]]+)\]/);
  const heroCards = heroCardsMatch ? heroCardsMatch[1].split(" ").map(normalizeCard) : [];

  // Assign positions based on button seat
  const totalPlayers = players.length;
  const btnIndex = players.findIndex((p) => p.seat === btnSeat);
  const positionOrder = getPositionOrder(totalPlayers);

  const playerPositions: Record<string, string> = {};
  for (let i = 0; i < players.length; i++) {
    const offset = (i - btnIndex + players.length) % players.length;
    playerPositions[players[i].name] = positionOrder[offset] || `P${i + 1}`;
  }

  const heroPosition = playerPositions[heroName] || "BTN";
  const heroPlayer = players.find((p) => p.name === heroName);
  const heroStartingStack = heroPlayer?.stack || 0;

  // Parse streets
  const streets: ParsedHistoryHand["streets"] = [];
  let currentStreet: "preflop" | "flop" | "turn" | "river" = "preflop";
  let currentActions: ParsedHistoryHand["streets"][0]["actions"] = [];
  let currentBoard: string[] = [];
  let board: string[] = [];
  let potSize = 0;

  const streetMarkers: Record<string, "preflop" | "flop" | "turn" | "river"> = {
    "*** HOLE CARDS ***": "preflop",
    "*** FLOP ***": "flop",
    "*** TURN ***": "turn",
    "*** RIVER ***": "river",
  };

  let inStreet = false;

  for (const line of lines) {
    // Street marker
    const streetKey = Object.keys(streetMarkers).find((k) => line.startsWith(k));
    if (streetKey) {
      if (inStreet && currentActions.length > 0) {
        streets.push({ name: currentStreet, board: [...currentBoard], actions: [...currentActions] });
      }
      currentStreet = streetMarkers[streetKey];
      currentActions = [];
      inStreet = true;

      // Extract board cards from flop/turn/river markers
      const boardMatch = line.match(/\[([^\]]+)\]/g);
      if (boardMatch) {
        const cards = boardMatch.flatMap((m) => m.replace(/[\[\]]/g, "").split(" ")).map(normalizeCard);
        currentBoard = cards;
        board = [...board, ...cards];
      }
      continue;
    }

    // Summary line — stop parsing actions
    if (line.startsWith("*** SUMMARY ***") || line.startsWith("*** SHOW DOWN ***")) {
      if (inStreet && currentActions.length > 0) {
        streets.push({ name: currentStreet, board: [...currentBoard], actions: [...currentActions] });
        inStreet = false;
      }
      break;
    }

    if (!inStreet) continue;

    // Action lines: PlayerName: raises $X to $Y / calls $X / folds / checks / bets $X
    const actionMatch = line.match(/^(.+?): (raises|calls|folds|checks|bets|posts|is all-in)(.*)$/i);
    if (actionMatch) {
      const playerName = actionMatch[1].trim();
      const rawAction = actionMatch[2].toLowerCase();
      const rest = actionMatch[3];

      let action = rawAction;
      let amount: number | null = null;

      if (rawAction === "raises") {
        action = "raise";
        const toMatch = rest.match(/to \$?([\d,]+(?:\.\d+)?)/);
        amount = toMatch ? parseFloat(toMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "calls") {
        action = "call";
        const amtMatch = rest.match(/\$?([\d,]+(?:\.\d+)?)/);
        amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "bets") {
        action = "bet";
        const amtMatch = rest.match(/\$?([\d,]+(?:\.\d+)?)/);
        amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "posts") {
        action = "post";
        const amtMatch = rest.match(/\$?([\d,]+(?:\.\d+)?)/);
        amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "is all-in") {
        action = "all-in";
      }

      currentActions.push({
        player: playerName,
        action,
        amount,
        isHero: playerName === heroName,
      });
    }

    // Pot line: Total pot $X
    const potMatch = line.match(/Total pot \$?([\d,]+(?:\.\d+)?)/);
    if (potMatch) {
      potSize = parseFloat(potMatch[1].replace(/,/g, ""));
    }
  }

  // Build villains list
  const villains = players
    .filter((p) => p.name !== heroName)
    .map((p) => ({
      position: playerPositions[p.name] || "unknown",
      startingStack: p.stack,
    }));

  // Build title
  const title = `${heroPosition} with ${heroCards.join("")} — ${stakes}`;

  // Determine result from summary
  const summaryLines = lines.slice(lines.findIndex((l) => l.startsWith("*** SUMMARY ***")));
  const heroSummaryLine = summaryLines.find((l) => l.includes(heroName));
  let result = "unknown";
  if (heroSummaryLine) {
    if (heroSummaryLine.includes("won")) result = "won";
    else if (heroSummaryLine.includes("lost") || heroSummaryLine.includes("folded")) result = "lost";
  }

  return {
    title,
    rawText: text,
    gameType,
    stakes,
    heroPosition,
    heroCards,
    villains,
    board,
    streets,
    heroStartingStack,
    potSize,
    result,
    heroName,
  };
}

// ─── GGPoker Parser ───────────────────────────────────────────────────────────

function parseGGPokerHand(text: string): ParsedHistoryHand | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  // Header: Poker Hand #RC1234567890: Hold'em No Limit ($1/$2) - 2024/01/15 20:00:00
  const headerLine = lines[0];
  const stakesMatch = headerLine.match(/\(([^)]+)\)/);
  const stakes = stakesMatch ? stakesMatch[1] : "unknown";
  const isMTT = headerLine.includes("Tournament");
  const gameType: "cash" | "mtt" = isMTT ? "mtt" : "cash";

  // Table line: Table '...' 6-max Seat #3 is the button
  const tableLine = lines.find((l) => l.startsWith("Table ")) || "";
  const btnSeatMatch = tableLine.match(/Seat #(\d+) is the button/);
  const btnSeat = btnSeatMatch ? parseInt(btnSeatMatch[1]) : 1;

  // Seat lines: Seat 1: PlayerName ($200)
  const seatLines = lines.filter((l) => /^Seat \d+:/.test(l) && l.includes("("));
  const players: Array<{ seat: number; name: string; stack: number }> = [];
  for (const line of seatLines) {
    const m = line.match(/^Seat (\d+): (.+?) \((\$?[\d,]+(?:\.\d+)?)/);
    if (m) {
      players.push({
        seat: parseInt(m[1]),
        name: m[2].trim(),
        stack: parseFloat(m[3].replace(/[$,]/g, "")),
      });
    }
  }

  // Hero cards from "Dealt to Hero [Ah Kd]" or "Hero: Card dealt to a spot [Ah Kd]"
  const dealtLine = lines.find((l) => /dealt to/i.test(l) && l.includes("["));
  const heroNameMatch = dealtLine?.match(/(?:Dealt to |^)(.+?)(?::|:)?\s*\[/i) || dealtLine?.match(/^(.+?): Card dealt/i);
  const heroName = heroNameMatch ? heroNameMatch[1].trim() : players[0]?.name || "Hero";

  const heroCardsMatch = dealtLine?.match(/\[([^\]]+)\]/);
  const heroCards = heroCardsMatch ? heroCardsMatch[1].split(" ").map(normalizeCard) : [];

  // Assign positions
  const totalPlayers = players.length;
  const btnIndex = players.findIndex((p) => p.seat === btnSeat);
  const positionOrder = getPositionOrder(totalPlayers);
  const playerPositions: Record<string, string> = {};
  for (let i = 0; i < players.length; i++) {
    const offset = (i - btnIndex + players.length) % players.length;
    playerPositions[players[i].name] = positionOrder[offset] || `P${i + 1}`;
  }

  const heroPosition = playerPositions[heroName] || "BTN";
  const heroPlayer = players.find((p) => p.name === heroName);
  const heroStartingStack = heroPlayer?.stack || 0;

  // Parse streets (GGPoker uses same markers as PokerStars)
  const streets: ParsedHistoryHand["streets"] = [];
  let currentStreet: "preflop" | "flop" | "turn" | "river" = "preflop";
  let currentActions: ParsedHistoryHand["streets"][0]["actions"] = [];
  let currentBoard: string[] = [];
  let board: string[] = [];
  let potSize = 0;
  let inStreet = false;

  const streetMarkers: Record<string, "preflop" | "flop" | "turn" | "river"> = {
    "*** HOLE CARDS ***": "preflop",
    "*** FLOP ***": "flop",
    "*** TURN ***": "turn",
    "*** RIVER ***": "river",
  };

  for (const line of lines) {
    const streetKey = Object.keys(streetMarkers).find((k) => line.startsWith(k));
    if (streetKey) {
      if (inStreet && currentActions.length > 0) {
        streets.push({ name: currentStreet, board: [...currentBoard], actions: [...currentActions] });
      }
      currentStreet = streetMarkers[streetKey];
      currentActions = [];
      inStreet = true;
      const boardMatch = line.match(/\[([^\]]+)\]/g);
      if (boardMatch) {
        const cards = boardMatch.flatMap((m) => m.replace(/[\[\]]/g, "").split(" ")).map(normalizeCard);
        currentBoard = cards;
        board = [...board, ...cards];
      }
      continue;
    }

    if (line.startsWith("*** SUMMARY ***") || line.startsWith("*** SHOWDOWN ***")) {
      if (inStreet && currentActions.length > 0) {
        streets.push({ name: currentStreet, board: [...currentBoard], actions: [...currentActions] });
        inStreet = false;
      }
      break;
    }

    if (!inStreet) continue;

    const actionMatch = line.match(/^(.+?): (raises|calls|folds|checks|bets|posts|Raises|Calls|Folds|Checks|Bets)(.*)$/);
    if (actionMatch) {
      const playerName = actionMatch[1].trim();
      const rawAction = actionMatch[2].toLowerCase();
      const rest = actionMatch[3];

      let action = rawAction;
      let amount: number | null = null;

      if (rawAction === "raises") {
        action = "raise";
        const toMatch = rest.match(/to \$?([\d,]+(?:\.\d+)?)/);
        amount = toMatch ? parseFloat(toMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "calls") {
        action = "call";
        const amtMatch = rest.match(/\$?([\d,]+(?:\.\d+)?)/);
        amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : null;
      } else if (rawAction === "bets") {
        action = "bet";
        const amtMatch = rest.match(/\$?([\d,]+(?:\.\d+)?)/);
        amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : null;
      }

      currentActions.push({
        player: playerName,
        action,
        amount,
        isHero: playerName === heroName,
      });
    }

    const potMatch = line.match(/Total pot \$?([\d,]+(?:\.\d+)?)/);
    if (potMatch) potSize = parseFloat(potMatch[1].replace(/,/g, ""));
  }

  const villains = players
    .filter((p) => p.name !== heroName)
    .map((p) => ({
      position: playerPositions[p.name] || "unknown",
      startingStack: p.stack,
    }));

  const title = `${heroPosition} with ${heroCards.join("")} — ${stakes}`;

  const summaryLines = lines.slice(lines.findIndex((l) => l.startsWith("*** SUMMARY ***")));
  const heroSummaryLine = summaryLines.find((l) => l.includes(heroName));
  let result = "unknown";
  if (heroSummaryLine) {
    if (heroSummaryLine.includes("won")) result = "won";
    else if (heroSummaryLine.includes("lost") || heroSummaryLine.includes("folded")) result = "lost";
  }

  return {
    title,
    rawText: text,
    gameType,
    stakes,
    heroPosition,
    heroCards,
    villains,
    board,
    streets,
    heroStartingStack,
    potSize,
    result,
    heroName,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeCard(card: string): string {
  // Convert GGPoker/PS card notation to standard: Ah -> Ah, 2c -> 2c
  return card.trim().replace(/10/g, "T");
}

function getPositionOrder(numPlayers: number): string[] {
  // Returns positions in order starting from BTN (index 0 = BTN)
  const allPositions = ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"];
  if (numPlayers >= 8) return allPositions;
  if (numPlayers === 7) return ["BTN", "SB", "BB", "UTG", "UTG+1", "HJ", "CO"];
  if (numPlayers === 6) return ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
  if (numPlayers === 5) return ["BTN", "SB", "BB", "UTG", "CO"];
  if (numPlayers === 4) return ["BTN", "SB", "BB", "UTG"];
  if (numPlayers === 3) return ["BTN", "SB", "BB"];
  return ["BTN", "BB"];
}

// ─── Detect format and parse ──────────────────────────────────────────────────

export function detectFormat(text: string): "pokerstars" | "ggpoker" | "unknown" {
  if (text.includes("PokerStars Hand #") || text.includes("PokerStars Game #")) return "pokerstars";
  if (text.includes("Poker Hand #RC") || text.includes("Poker Hand #HD") || text.includes("GGPoker")) return "ggpoker";
  return "unknown";
}

/**
 * Split a hand history file into individual hand blocks.
 */
export function splitHandHistory(text: string): string[] {
  // PokerStars: hands start with "PokerStars Hand #"
  // GGPoker: hands start with "Poker Hand #"
  const psPattern = /(?=PokerStars (?:Hand|Game) #)/g;
  const ggPattern = /(?=Poker Hand #(?:RC|HD|NL|PL))/g;

  if (text.includes("PokerStars Hand #") || text.includes("PokerStars Game #")) {
    return text.split(psPattern).filter((h) => h.trim().length > 50);
  }
  if (text.includes("Poker Hand #RC") || text.includes("Poker Hand #HD")) {
    return text.split(ggPattern).filter((h) => h.trim().length > 50);
  }

  // Fallback: split on double blank lines
  return text
    .split(/\n\s*\n\s*\n/)
    .map((h) => h.trim())
    .filter((h) => h.length > 50);
}

/**
 * Parse a single hand history block into ParsedHistoryHand.
 */
export function parseHandHistory(text: string): ParsedHistoryHand | null {
  const format = detectFormat(text);
  if (format === "pokerstars") return parsePokerStarsHand(text);
  if (format === "ggpoker") return parseGGPokerHand(text);

  // Try both parsers as fallback
  return parsePokerStarsHand(text) || parseGGPokerHand(text);
}

/**
 * Convert a ParsedHistoryHand into the natural language format expected by the AI parser.
 * This allows the AI coach to analyse imported hands using the same pipeline.
 */
export function historyHandToText(hand: ParsedHistoryHand): string {
  const lines: string[] = [];
  lines.push(`Game: ${hand.gameType === "mtt" ? "MTT" : "Cash"} ${hand.stakes}`);
  lines.push(`Hero: ${hand.heroPosition} with ${hand.heroCards.join(" ")} (stack: ${hand.heroStartingStack})`);

  for (const villain of hand.villains) {
    lines.push(`Villain: ${villain.position} (stack: ${villain.startingStack})`);
  }

  for (const street of hand.streets) {
    lines.push(`\n${street.name.toUpperCase()}:`);
    if (street.board && street.board.length > 0) {
      lines.push(`Board: ${street.board.join(" ")}`);
    }
    for (const action of street.actions) {
      const who = action.isHero ? "Hero" : action.player;
      const amt = action.amount ? ` ${action.amount}` : "";
      lines.push(`${who}: ${action.action}${amt}`);
    }
  }

  if (hand.board.length > 0) {
    lines.push(`\nFinal board: ${hand.board.join(" ")}`);
  }
  lines.push(`Pot: ${hand.potSize}`);
  lines.push(`Result: ${hand.result}`);

  return lines.join("\n");
}
