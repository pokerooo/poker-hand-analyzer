/**
 * Poker utility functions for player sequencing and action parsing
 */

type Position = "UTG" | "UTG+1" | "UTG+2" | "MP" | "MP+1" | "CO" | "BTN" | "SB" | "BB";

/**
 * All positions in clockwise order around the table
 */
export const POSITION_ORDER: Position[] = [
  "UTG",
  "UTG+1",
  "UTG+2",
  "MP",
  "MP+1",
  "CO",
  "BTN",
  "SB",
  "BB",
];

/**
 * Get the next player in clockwise order, skipping folded players
 * @param currentPlayer - The current player position
 * @param activePlayers - Array of players who haven't folded
 * @returns The next active player position, or null if no active players remain
 */
export function getNextPlayer(
  currentPlayer: Position,
  activePlayers: Position[]
): Position | null {
  if (activePlayers.length === 0) return null;

  const currentIndex = POSITION_ORDER.indexOf(currentPlayer);
  if (currentIndex === -1) return activePlayers[0];

  // Search clockwise for the next active player
  for (let i = 1; i <= POSITION_ORDER.length; i++) {
    const nextIndex = (currentIndex + i) % POSITION_ORDER.length;
    const nextPosition = POSITION_ORDER[nextIndex];
    
    if (activePlayers.includes(nextPosition)) {
      return nextPosition;
    }
  }

  return null;
}

/**
 * Parse bulk action entry text into structured actions
 * Format: "UTG fold, UTG+1 raise 800, MP call"
 * @param text - The bulk action text
 * @returns Array of parsed actions or error message
 */
export interface BulkAction {
  position: Position;
  action: "fold" | "check" | "call" | "bet" | "raise" | "allin";
  amount?: number;
}

export interface BulkParseResult {
  success: boolean;
  actions?: BulkAction[];
  error?: string;
}

export function parseBulkActions(text: string): BulkParseResult {
  if (!text.trim()) {
    return { success: false, error: "Please enter actions" };
  }

  const actions: BulkAction[] = [];
  const entries = text.split(",").map((s) => s.trim());

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;

    // Parse format: "POSITION ACTION [AMOUNT]"
    const parts = entry.split(/\s+/);
    if (parts.length < 2) {
      return {
        success: false,
        error: `Invalid format at entry ${i + 1}: "${entry}". Expected "POSITION ACTION [AMOUNT]"`,
      };
    }

    const position = parts[0].toUpperCase() as Position;
    const action = parts[1].toLowerCase();
    const amount = parts[2] ? parseInt(parts[2]) : undefined;

    // Validate position
    if (!POSITION_ORDER.includes(position)) {
      return {
        success: false,
        error: `Invalid position "${position}" at entry ${i + 1}. Valid positions: ${POSITION_ORDER.join(", ")}`,
      };
    }

    // Validate action
    const validActions = ["fold", "check", "call", "bet", "raise", "allin", "all-in"];
    if (!validActions.includes(action)) {
      return {
        success: false,
        error: `Invalid action "${action}" at entry ${i + 1}. Valid actions: fold, check, call, bet, raise, allin`,
      };
    }

    // Normalize "all-in" to "allin"
    const normalizedAction = action === "all-in" ? "allin" : action;

    // Validate amount for actions that require it
    if (["bet", "raise", "call"].includes(normalizedAction)) {
      if (!amount || isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: `Action "${normalizedAction}" requires a valid amount at entry ${i + 1}`,
        };
      }
    }

    actions.push({
      position,
      action: normalizedAction as BulkAction["action"],
      amount,
    });
  }

  if (actions.length === 0) {
    return { success: false, error: "No valid actions found" };
  }

  return { success: true, actions };
}
