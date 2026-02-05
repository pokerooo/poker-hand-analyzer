import { describe, it, expect } from "vitest";
import { getNextPlayer, parseBulkActions, POSITION_ORDER } from "../client/src/utils/pokerUtils";

describe("Poker Utility Functions", () => {
  describe("getNextPlayer", () => {
    it("should return next player in clockwise order", () => {
      const activePlayers = POSITION_ORDER;
      
      expect(getNextPlayer("UTG", activePlayers)).toBe("UTG+1");
      expect(getNextPlayer("UTG+1", activePlayers)).toBe("UTG+2");
      expect(getNextPlayer("CO", activePlayers)).toBe("BTN");
    });

    it("should wrap around from BB to UTG", () => {
      const activePlayers = POSITION_ORDER;
      
      expect(getNextPlayer("BB", activePlayers)).toBe("UTG");
    });

    it("should skip folded players", () => {
      const activePlayers = ["UTG", "UTG+2", "MP+1", "BTN"];
      
      // UTG+1 folded, should skip to UTG+2
      expect(getNextPlayer("UTG", activePlayers)).toBe("UTG+2");
      
      // MP and CO folded, should skip to BTN
      expect(getNextPlayer("UTG+2", activePlayers)).toBe("MP+1");
    });

    it("should return null when no active players", () => {
      expect(getNextPlayer("UTG", [])).toBe(null);
    });

    it("should handle single active player", () => {
      const activePlayers = ["BTN"];
      
      // Should wrap around and return BTN again
      expect(getNextPlayer("BTN", activePlayers)).toBe("BTN");
    });
  });

  describe("parseBulkActions", () => {
    it("should parse valid fold action", () => {
      const result = parseBulkActions("UTG fold");
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0]).toEqual({
        position: "UTG",
        action: "fold",
        amount: undefined,
      });
    });

    it("should parse valid raise with amount", () => {
      const result = parseBulkActions("UTG+1 raise 800");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0]).toEqual({
        position: "UTG+1",
        action: "raise",
        amount: 800,
      });
    });

    it("should parse multiple actions separated by commas", () => {
      const result = parseBulkActions("UTG fold, UTG+1 raise 800, MP call 800");
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(3);
      expect(result.actions?.[0].action).toBe("fold");
      expect(result.actions?.[1].action).toBe("raise");
      expect(result.actions?.[2].action).toBe("call");
    });

    it("should handle all-in action", () => {
      const result = parseBulkActions("BTN allin");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0].action).toBe("allin");
    });

    it("should normalize all-in to allin", () => {
      const result = parseBulkActions("BTN all-in");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0].action).toBe("allin");
    });

    it("should return error for invalid position", () => {
      const result = parseBulkActions("INVALID fold");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid position");
    });

    it("should return error for invalid action", () => {
      const result = parseBulkActions("UTG bluff");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid action");
    });

    it("should return error for missing amount on raise", () => {
      const result = parseBulkActions("UTG+1 raise");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("requires a valid amount");
    });

    it("should return error for invalid amount", () => {
      const result = parseBulkActions("UTG+1 raise abc");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("requires a valid amount");
    });

    it("should return error for empty input", () => {
      const result = parseBulkActions("");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Please enter actions");
    });

    it("should handle whitespace correctly", () => {
      const result = parseBulkActions("  UTG fold  ,  UTG+1 raise 800  ");
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(2);
    });

    it("should handle check action", () => {
      const result = parseBulkActions("SB check");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0].action).toBe("check");
    });

    it("should handle bet action with amount", () => {
      const result = parseBulkActions("BTN bet 600");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0]).toEqual({
        position: "BTN",
        action: "bet",
        amount: 600,
      });
    });

    it("should handle call action with amount", () => {
      const result = parseBulkActions("BB call 400");
      
      expect(result.success).toBe(true);
      expect(result.actions?.[0]).toEqual({
        position: "BB",
        action: "call",
        amount: 400,
      });
    });
  });
});
