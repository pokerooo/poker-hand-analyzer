import { invokeLLM } from "./_core/llm";

export interface ParsedPlayer {
  seat: number;         // 1-9
  position: string;     // "UTG", "CO", "BTN", "SB", "BB", "Hero", etc.
  isHero: boolean;
  holeCards?: string[]; // ["Ah", "Td"]
  startingStack?: number;
  finalAction?: string; // "fold" | "call" | "raise" | "allin" | "win" | "lose"
}

export interface ParsedAction {
  player: string;       // position label
  action: "fold" | "check" | "call" | "bet" | "raise" | "allin";
  amount?: number;
  isHero?: boolean;
}

export interface ParsedStreet {
  name: "preflop" | "flop" | "turn" | "river";
  board?: string[];     // community cards for this street
  boardTexture?: string; // "rainbow", "monotone", "two-tone", "bdfd" etc
  actions: ParsedAction[];
  pot?: number;         // pot size at start of this street
}

export interface ParsedHand {
  // Game setup
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  gameType?: "cash" | "mtt" | "tournament";
  
  // Players
  players: ParsedPlayer[];
  heroPosition: string;
  heroCards: string[];
  
  // Streets
  streets: ParsedStreet[];
  
  // Result
  potSize?: number;
  result?: string;      // "hero wins", "hero loses", "split pot"
  
  // Raw
  rawText: string;
  parseNotes?: string;  // any ambiguities or assumptions made
}

const SYSTEM_PROMPT = `You are a poker hand parser. Your job is to take a natural language poker hand description (the kind players share on WhatsApp or poker forums) and convert it into structured JSON.

Players share hands in shorthand like:
- "1000/2500/2500 utg open 5000, we co ATo flat, button flat, bb complete"
- "Flop A99r all check"
- "Turn Th bdfd I bet 10000 button call"
- "River 5d I bet 34000 with 50000 behind he jam covering stack"

Key parsing rules:
1. Blinds: "1000/2500" = sb/bb. "1000/2500/2500" = ante/sb/bb or sb/bb/ante (ante is usually the first or last number if three are given — use context).
2. "we", "I", "hero", "villain" — "we" and "I" always refer to the hero player.
3. Positions: Use ONLY these canonical labels in the JSON output: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB. Map all aliases: mp/mp1/mp2/lojack -> LJ, hijack -> HJ, cutoff -> CO, button/bu -> BTN, small blind -> SB, big blind -> BB. Never output "MP" -- always use "LJ".
4. Cards: ATo = Ace Ten offsuit, ATs = Ace Ten suited, A9s, KQo, etc. Board cards: A99r = Ace Nine Nine rainbow, Th = Ten of hearts, bdfd = backdoor flush draw
5. Actions: open/raise/bet/3bet/4bet/jam/shove/allin/push = aggressive. flat/call/complete/limp = call. fold/muck = fold. check/x = check.
6. Amounts: "5k" = 5000, "10bb" = 10 big blinds, "pot" = pot-sized bet
7. "covering" or "covers" = has more chips. "with X behind" = X chips remaining after bet.
8. Result: "he folds", "I win", "he calls I win", "he jams I fold", "I call off" = hero calls all-in

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "smallBlind": number,
  "bigBlind": number,
  "ante": number | null,
  "gameType": "cash" | "mtt",
  "players": [
    {
      "seat": number,
      "position": string,
      "isHero": boolean,
      "holeCards": string[] | null,
      "startingStack": number | null
    }
  ],
  "heroPosition": string,
  "heroCards": string[],
  "streets": [
    {
      "name": "preflop" | "flop" | "turn" | "river",
      "board": string[] | null,
      "boardTexture": string | null,
      "actions": [
        {
          "player": string,
          "action": "fold" | "check" | "call" | "bet" | "raise" | "allin",
          "amount": number | null,
          "isHero": boolean
        }
      ],
      "pot": number | null
    }
  ],
  "potSize": number | null,
  "result": string | null,
  "parseNotes": string | null
}

For cards, use standard notation: rank + suit lowercase. Ranks: A K Q J T 9 8 7 6 5 4 3 2. Suits: s h d c.
Example: "ATo" hero hand → ["As", "Tc"] or ["Ah", "Ts"] (pick the most common suit combo, note it in parseNotes).
Board "A99r" → ["Ah", "9s", "9c"] (rainbow = different suits).
Board "Th bdfd" → ["Th"] with boardTexture "bdfd".

CRITICAL BOARD CARD RULE: The "board" field for each street must contain ONLY the NEW cards revealed on that street:
- Flop "board" = exactly 3 cards (the 3 flop cards only)
- Turn "board" = exactly 1 card (the single turn card only, NOT all 4 board cards)
- River "board" = exactly 1 card (the single river card only, NOT all 5 board cards)
NEVER include cumulative board cards. Each street's board array is independent and incremental.

Hero identification: "we", "I", "hero" always refer to the hero player. Set isHero=true for that player and mark their actions with isHero=true.

CRITICAL STACK RULE: Always populate startingStack for every player:
- If the hand says "80keff", "80k eff", "80000eff", "80bb eff" — this is the EFFECTIVE STACK. Assign this value as startingStack for ALL active players in the hand (effective stack = the smaller of the two stacks, so all players start at this value).
- If individual stacks are mentioned (e.g. "UTG has 120bb", "hero covers") — use those specific values.
- If no stack info is given, estimate from the action sizes (e.g. if someone jams 45,500 and has been calling, infer their starting stack).
- NEVER leave startingStack as null if any stack information can be inferred from the hand text.
- "with X behind" after a bet means the player has X chips left AFTER that bet — so their startingStack = bet amount + X.
- "covering" means that player has MORE chips than the effective stack — set their startingStack to 1.5x the effective stack as an estimate.`;

export async function parseHandText(rawText: string): Promise<ParsedHand> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.trim() },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "parsed_hand",
        strict: true,
        schema: {
          type: "object",
          properties: {
            smallBlind: { type: "number" },
            bigBlind: { type: "number" },
            ante: { type: ["number", "null"] },
            gameType: { type: "string", enum: ["cash", "mtt"] },
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  seat: { type: "number" },
                  position: { type: "string" },
                  isHero: { type: "boolean" },
                  holeCards: { type: ["array", "null"], items: { type: "string" } },
                  startingStack: { type: ["number", "null"] },
                },
                required: ["seat", "position", "isHero", "holeCards", "startingStack"],
                additionalProperties: false,
              },
            },
            heroPosition: { type: "string" },
            heroCards: { type: "array", items: { type: "string" } },
            streets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", enum: ["preflop", "flop", "turn", "river"] },
                  board: { type: ["array", "null"], items: { type: "string" } },
                  boardTexture: { type: ["string", "null"] },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        player: { type: "string" },
                        action: { type: "string", enum: ["fold", "check", "call", "bet", "raise", "allin"] },
                        amount: { type: ["number", "null"] },
                        isHero: { type: "boolean" },
                      },
                      required: ["player", "action", "amount", "isHero"],
                      additionalProperties: false,
                    },
                  },
                  pot: { type: ["number", "null"] },
                },
                required: ["name", "board", "boardTexture", "actions", "pot"],
                additionalProperties: false,
              },
            },
            potSize: { type: ["number", "null"] },
            result: { type: ["string", "null"] },
            parseNotes: { type: ["string", "null"] },
          },
          required: ["smallBlind", "bigBlind", "ante", "gameType", "players", "heroPosition", "heroCards", "streets", "potSize", "result", "parseNotes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;

  return {
    ...parsed,
    rawText,
  } as ParsedHand;
}
