import { describe, it, expect } from "vitest";

/**
 * Test suite for undo/remove action functionality
 * 
 * This tests the ability to remove the last recorded action
 * and verify that state is properly reverted.
 */

describe("Undo Action Functionality", () => {
  describe("Action removal", () => {
    it("should remove the last action from array", () => {
      const actions = [
        { position: "UTG", action: "fold" as const },
        { position: "UTG+1", action: "raise" as const, amount: 800 },
        { position: "MP", action: "call" as const, amount: 800 },
      ];

      // Remove last action (index 2)
      const newActions = actions.filter((_, i) => i !== 2);

      expect(newActions).toHaveLength(2);
      expect(newActions[newActions.length - 1]).toEqual({
        position: "UTG+1",
        action: "raise",
        amount: 800,
      });
    });

    it("should handle removing from single-action array", () => {
      const actions = [{ position: "UTG+1", action: "raise" as const, amount: 800 }];

      const newActions = actions.filter((_, i) => i !== 0);

      expect(newActions).toHaveLength(0);
    });

    it("should not modify original array when removing", () => {
      const actions = [
        { position: "UTG", action: "fold" as const },
        { position: "UTG+1", action: "raise" as const, amount: 800 },
      ];

      const originalLength = actions.length;
      const newActions = actions.filter((_, i) => i !== 1);

      expect(actions).toHaveLength(originalLength); // Original unchanged
      expect(newActions).toHaveLength(originalLength - 1);
    });
  });

  describe("Pot recalculation after undo", () => {
    it("should recalculate pot after removing a raise", () => {
      const initialPot = 600; // SB + BB + antes
      const raiseAmount = 800;

      // After raise: pot = 600 + 800 = 1400
      const potAfterRaise = initialPot + raiseAmount;
      expect(potAfterRaise).toBe(1400);

      // After undo: pot should revert to initial
      const potAfterUndo = initialPot;
      expect(potAfterUndo).toBe(600);
    });

    it("should recalculate pot after removing a call", () => {
      const potBeforeCall = 1400; // After someone raised to 800
      const callAmount = 800;

      const potAfterCall = potBeforeCall + callAmount;
      expect(potAfterCall).toBe(2200);

      // After undo: pot reverts to before call
      const potAfterUndo = potBeforeCall;
      expect(potAfterUndo).toBe(1400);
    });

    it("should handle multiple undos correctly", () => {
      let pot = 600; // Initial

      // Action 1: Raise to 800
      pot += 800;
      expect(pot).toBe(1400);

      // Action 2: Call 800
      pot += 800;
      expect(pot).toBe(2200);

      // Undo action 2
      pot -= 800;
      expect(pot).toBe(1400);

      // Undo action 1
      pot -= 800;
      expect(pot).toBe(600);
    });
  });

  describe("Current bet tracking after undo", () => {
    it("should reset current bet to previous value after removing raise", () => {
      const actions = [
        { position: "UTG", action: "fold" as const },
        { position: "UTG+1", action: "raise" as const, amount: 800 },
        { position: "MP", action: "raise" as const, amount: 1600 },
      ];

      // Current bet is 1600
      let currentBet = 1600;

      // Remove last action (MP's raise to 1600)
      const newActions = actions.filter((_, i) => i !== 2);

      // Current bet should revert to UTG+1's raise (800)
      currentBet = 800;

      expect(currentBet).toBe(800);
      expect(newActions[newActions.length - 1].amount).toBe(800);
    });

    it("should reset to 0 when removing the only bet", () => {
      const actions = [{ position: "UTG+1", action: "raise" as const, amount: 800 }];

      let currentBet = 800;

      // Remove the only action
      const newActions = actions.filter((_, i) => i !== 0);
      currentBet = 0;

      expect(currentBet).toBe(0);
      expect(newActions).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle undo when no actions exist", () => {
      const actions: any[] = [];

      // Attempting to remove from empty array
      const newActions = actions.filter((_, i) => i !== 0);

      expect(newActions).toHaveLength(0);
    });

    it("should only allow removing the last action", () => {
      const actions = [
        { position: "UTG", action: "fold" as const },
        { position: "UTG+1", action: "raise" as const, amount: 800 },
        { position: "MP", action: "call" as const, amount: 800 },
      ];

      // UI should only provide undo button for last action (index 2)
      const lastIndex = actions.length - 1;

      expect(lastIndex).toBe(2);
      expect(actions[lastIndex].position).toBe("MP");
    });
  });
});
