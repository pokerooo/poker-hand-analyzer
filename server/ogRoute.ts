import type { Express } from "express";
import { getHandBySlug } from "./db";
import { generateOgImage } from "./ogImage";

export function registerOgRoute(app: Express) {
  app.get("/api/og/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const hand = await getHandBySlug(slug);

      if (!hand) {
        // Return a generic OG image for unknown slugs
        const img = await generateOgImage({
          heroCards: [],
          boardCards: [],
          heroPosition: "?",
        });
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.send(img);
      }

      // Parse stored data
      const parsed = typeof hand.parsedData === "string"
        ? JSON.parse(hand.parsedData)
        : hand.parsedData;

      const analysis = hand.coachAnalysis
        ? (typeof hand.coachAnalysis === "string" ? JSON.parse(hand.coachAnalysis) : hand.coachAnalysis)
        : null;

      // Collect all board cards
      const boardCards: string[] = [];
      if (parsed?.streets) {
        for (const street of parsed.streets) {
          if (street.board) boardCards.push(...street.board);
        }
      }

      // Extract blinds string
      const sb = parsed?.smallBlind;
      const bb = parsed?.bigBlind;
      const blindsLabel = sb && bb ? `${sb}/${bb}` : undefined;

      const img = await generateOgImage({
        title: hand.title || undefined,
        heroCards: parsed?.heroCards || [],
        boardCards,
        heroPosition: parsed?.heroPosition || "?",
        grade: analysis?.grade || undefined,
        gameType: parsed?.gameType || undefined,
        blinds: blindsLabel,
      });

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
      res.send(img);
    } catch (err) {
      console.error("[OG Route Error]", err);
      res.status(500).send("Failed to generate OG image");
    }
  });
}
