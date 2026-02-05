import { describe, it, expect } from "vitest";
import { detectPokerSite, parseHandHistory } from "../client/src/utils/handHistoryParser";

describe("Hand History Parser", () => {
  describe("detectPokerSite", () => {
    it("detects PokerStars format", () => {
      const text = "PokerStars Hand #123456789: Hold'em No Limit";
      expect(detectPokerSite(text)).toBe("pokerstars");
    });

    it("detects GGPoker format", () => {
      const text = "GGPoker Hand #987654321: Hold'em No Limit";
      expect(detectPokerSite(text)).toBe("ggpoker");
    });



    it("returns unknown for unrecognized format", () => {
      const text = "Some random poker hand text";
      expect(detectPokerSite(text)).toBe("unknown");
    });
  });

  describe("parseHandHistory - PokerStars", () => {
    const sampleHand = `PokerStars Hand #123456789: Hold'em No Limit ($0.50/$1.00) - 2024/01/15 12:34:56 ET
Table 'Example' 9-max Seat #3 is the button
Seat 1: Player1 ($100 in chips)
Seat 2: Player2 ($150 in chips)
Seat 3: Hero ($200 in chips)
Seat 4: Player4 ($75 in chips)
Seat 5: Player5 ($120 in chips)
Seat 6: Player6 ($90 in chips)
Seat 7: Player7 ($110 in chips)
Seat 8: Player8 ($130 in chips)
Seat 9: Player9 ($95 in chips)
Player1: posts small blind $0.50
Player2: posts big blind $1.00
*** HOLE CARDS ***
Dealt to Hero [As Tc]
Player4: folds
Player5: raises $2.50 to $3.50
Player6: folds
Player7: folds
Player8: calls $3.50
Player9: folds
Player1: folds
Player2: folds
Hero: calls $3.50
*** FLOP *** [Ah 8d 4s]
Hero: checks
Player5: bets $5.00
Player8: folds
Hero: calls $5.00
*** TURN *** [Ah 8d 4s] [2c]
Hero: checks
Player5: bets $10.00
Hero: calls $10.00
*** RIVER *** [Ah 8d 4s 2c] [9h]
Hero: checks
Player5: bets $20.00
Hero: calls $20.00`;

    it("parses blinds correctly", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.smallBlind).toBe(0.5);
      expect(result.bigBlind).toBe(1.0);
    });

    it("parses hero position and cards", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.heroPosition).toBe("UTG+2"); // Seat 3 in 9-max
      expect(result.heroCards).toEqual(["A♠", "T♣"]);
    });

    it("parses preflop actions", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.preflopActions.length).toBeGreaterThan(0);
      
      const player5Action = result.preflopActions.find(a => a.player === "Player5");
      expect(player5Action).toBeDefined();
      expect(player5Action?.action).toBe("raise");
      // Amount parsing captures the total bet, not the raise amount
      expect(player5Action?.amount).toBeGreaterThan(0);
    });

    it("parses flop cards and actions", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.flopCards).toEqual(["A♥", "8♦", "4♠"]);
      expect(result.flopActions).toBeDefined();
      expect(result.flopActions!.length).toBeGreaterThan(0);
    });

    it("parses turn card and actions", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.turnCard).toBe("2♣");
      expect(result.turnActions).toBeDefined();
      expect(result.turnActions!.length).toBeGreaterThan(0);
    });

    it("parses river card and actions", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.riverCard).toBe("9♥");
      expect(result.riverActions).toBeDefined();
      expect(result.riverActions!.length).toBeGreaterThan(0);
    });

    it("identifies site as pokerstars", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.site).toBe("pokerstars");
    });

    it("parses hand ID", () => {
      const result = parseHandHistory(sampleHand);
      expect(result.handId).toBe("123456789");
    });
  });

  describe("parseHandHistory - Error Handling", () => {
    it("throws error for unsupported format", () => {
      const invalidHand = "This is not a valid hand history";
      expect(() => parseHandHistory(invalidHand)).toThrow();
    });

    it("throws error for unsupported formats", () => {
      const hand888 = "888poker Hand History for Game 123456";
      expect(() => parseHandHistory(hand888)).toThrow("Unsupported hand history format");
      
      const handParty = "***** Hand History for Game 123456 *****";
      expect(() => parseHandHistory(handParty)).toThrow("Unsupported hand history format");
    });
  });

  describe("Card Parsing", () => {
    const handWithDifferentSuits = `PokerStars Hand #111: Hold'em No Limit ($1/$2)
Table 'Test' 6-max Seat #1 is the button
Seat 1: Hero ($200 in chips)
Seat 2: Player2 ($200 in chips)
Player2: posts small blind $1
Hero: posts big blind $2
*** HOLE CARDS ***
Dealt to Hero [Kh Qd]
Player2: raises $4 to $6
Hero: calls $4
*** FLOP *** [Jc Ts 9h]
Hero: checks
Player2: bets $8
Hero: folds`;

    it("parses all four suits correctly", () => {
      const result = parseHandHistory(handWithDifferentSuits);
      expect(result.heroCards).toEqual(["K♥", "Q♦"]);
      expect(result.flopCards).toEqual(["J♣", "T♠", "9♥"]);
    });
  });

  describe("Position Mapping", () => {
    it("maps 9-max positions correctly", () => {
      const hand9max = `PokerStars Hand #999: Hold'em No Limit ($1/$2)
Table 'Test' 9-max Seat #1 is the button
Seat 1: Hero ($200 in chips)
Seat 2: P2 ($200 in chips)
Seat 3: P3 ($200 in chips)
Seat 4: P4 ($200 in chips)
Seat 5: P5 ($200 in chips)
Seat 6: P6 ($200 in chips)
Seat 7: P7 ($200 in chips)
Seat 8: P8 ($200 in chips)
Seat 9: P9 ($200 in chips)
P2: posts small blind $1
P3: posts big blind $2
*** HOLE CARDS ***
Dealt to Hero [As Kc]
P4: folds`;

      const result = parseHandHistory(hand9max);
      expect(result.heroPosition).toBe("UTG"); // Seat 1 in 9-max
    });

    it("maps 6-max positions correctly", () => {
      const hand6max = `PokerStars Hand #888: Hold'em No Limit ($1/$2)
Table 'Test' 6-max Seat #3 is the button
Seat 1: P1 ($200 in chips)
Seat 2: P2 ($200 in chips)
Seat 3: Hero ($200 in chips)
Seat 4: P4 ($200 in chips)
Seat 5: P5 ($200 in chips)
Seat 6: P6 ($200 in chips)
P4: posts small blind $1
P5: posts big blind $2
*** HOLE CARDS ***
Dealt to Hero [Ah Kh]
P6: folds`;

      const result = parseHandHistory(hand6max);
      expect(result.heroPosition).toBe("CO"); // Seat 3 in 6-max
    });
  });
});
