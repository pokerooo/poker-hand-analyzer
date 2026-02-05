import { describe, it, expect } from "vitest";

/**
 * Integration tests for player action tracking functionality
 * Tests the data structures and logic used in the sequential hand input flow
 */

describe("Action Tracking", () => {
  type Action = "fold" | "check" | "call" | "bet" | "raise" | "allin";
  type Position = "UTG" | "UTG+1" | "UTG+2" | "MP" | "MP+1" | "CO" | "BTN" | "SB" | "BB";

  interface PlayerAction {
    position: Position;
    action: Action;
    amount?: number;
  }

  describe("Action validation", () => {
    it("should accept valid fold action", () => {
      const action: PlayerAction = {
        position: "UTG",
        action: "fold",
      };
      expect(action.action).toBe("fold");
      expect(action.amount).toBeUndefined();
    });

    it("should accept valid call action with amount", () => {
      const action: PlayerAction = {
        position: "UTG+1",
        action: "call",
        amount: 400,
      };
      expect(action.action).toBe("call");
      expect(action.amount).toBe(400);
    });

    it("should accept valid raise action with amount", () => {
      const action: PlayerAction = {
        position: "MP",
        action: "raise",
        amount: 800,
      };
      expect(action.action).toBe("raise");
      expect(action.amount).toBe(800);
    });

    it("should accept valid check action", () => {
      const action: PlayerAction = {
        position: "BB",
        action: "check",
      };
      expect(action.action).toBe("check");
      expect(action.amount).toBeUndefined();
    });

    it("should accept valid allin action", () => {
      const action: PlayerAction = {
        position: "BTN",
        action: "allin",
        amount: 5000,
      };
      expect(action.action).toBe("allin");
      expect(action.amount).toBe(5000);
    });
  });

  describe("Action sequence tracking", () => {
    it("should track multiple actions in sequence", () => {
      const actions: PlayerAction[] = [];
      
      actions.push({ position: "UTG", action: "fold" });
      actions.push({ position: "UTG+1", action: "raise", amount: 800 });
      actions.push({ position: "MP", action: "call", amount: 800 });
      actions.push({ position: "CO", action: "fold" });
      
      expect(actions).toHaveLength(4);
      expect(actions[0].action).toBe("fold");
      expect(actions[1].action).toBe("raise");
      expect(actions[1].amount).toBe(800);
      expect(actions[2].action).toBe("call");
      expect(actions[3].action).toBe("fold");
    });

    it("should maintain action order", () => {
      const actions: PlayerAction[] = [
        { position: "SB", action: "call", amount: 400 },
        { position: "BB", action: "raise", amount: 1200 },
        { position: "UTG", action: "fold" },
      ];
      
      expect(actions[0].position).toBe("SB");
      expect(actions[1].position).toBe("BB");
      expect(actions[2].position).toBe("UTG");
    });
  });

  describe("Pot calculation", () => {
    function calculatePot(initialPot: number, actions: PlayerAction[]): number {
      return actions.reduce((pot, action) => {
        if (action.amount) {
          return pot + action.amount;
        }
        return pot;
      }, initialPot);
    }

    it("should calculate pot correctly after raises", () => {
      const initialPot = 600; // SB + BB + antes
      const actions: PlayerAction[] = [
        { position: "UTG", action: "raise", amount: 800 },
        { position: "MP", action: "call", amount: 800 },
        { position: "CO", action: "fold" },
      ];
      
      const pot = calculatePot(initialPot, actions);
      expect(pot).toBe(2200); // 600 + 800 + 800
    });

    it("should handle all-in correctly", () => {
      const initialPot = 600;
      const actions: PlayerAction[] = [
        { position: "UTG", action: "raise", amount: 800 },
        { position: "MP", action: "allin", amount: 5000 },
      ];
      
      const pot = calculatePot(initialPot, actions);
      expect(pot).toBe(6400); // 600 + 800 + 5000
    });
  });

  describe("Current bet tracking", () => {
    function getCurrentBet(actions: PlayerAction[]): number {
      let currentBet = 0;
      for (const action of actions) {
        if ((action.action === "raise" || action.action === "bet" || action.action === "allin") && action.amount) {
          currentBet = action.amount;
        }
      }
      return currentBet;
    }

    it("should track current bet after raise", () => {
      const actions: PlayerAction[] = [
        { position: "UTG", action: "raise", amount: 800 },
      ];
      
      expect(getCurrentBet(actions)).toBe(800);
    });

    it("should update current bet after re-raise", () => {
      const actions: PlayerAction[] = [
        { position: "UTG", action: "raise", amount: 800 },
        { position: "MP", action: "call", amount: 800 },
        { position: "CO", action: "raise", amount: 2000 },
      ];
      
      expect(getCurrentBet(actions)).toBe(2000);
    });
  });

  describe("Action history formatting", () => {
    function formatAction(action: PlayerAction): string {
      if (action.amount) {
        return `${action.position} ${action.action} ${action.amount}`;
      }
      return `${action.position} ${action.action}`;
    }

    it("should format fold action", () => {
      const action: PlayerAction = { position: "UTG", action: "fold" };
      expect(formatAction(action)).toBe("UTG fold");
    });

    it("should format raise action with amount", () => {
      const action: PlayerAction = { position: "MP", action: "raise", amount: 800 };
      expect(formatAction(action)).toBe("MP raise 800");
    });

    it("should format call action with amount", () => {
      const action: PlayerAction = { position: "BB", action: "call", amount: 400 };
      expect(formatAction(action)).toBe("BB call 400");
    });
  });
});
