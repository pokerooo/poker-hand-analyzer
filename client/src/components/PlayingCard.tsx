/**
 * PlayingCard — Premium gaming aesthetic
 * - Crisp white card face with sharp rank/suit typography
 * - Red suits (♥ ♦) vs black suits (♠ ♣) with proper contrast
 * - Subtle inner shadow and rounded corners for depth
 * - Face-down (back) card with elegant diamond pattern
 * - Compact size optimised for the poker table view
 */

import React from "react";

interface PlayingCardProps {
  card?: string | null;   // e.g. "Ah", "Kd", "2c", "Ts" — or null for face-down
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ── Parsing helpers ────────────────────────────────────────────────────────────

const RANK_MAP: Record<string, string> = {
  A: "A", K: "K", Q: "Q", J: "J", T: "10",
  "2": "2", "3": "3", "4": "4", "5": "5",
  "6": "6", "7": "7", "8": "8", "9": "9", "10": "10",
};

const SUIT_MAP: Record<string, { symbol: string; color: string }> = {
  s: { symbol: "♠", color: "#1a1a2e" },
  c: { symbol: "♣", color: "#1a2e1a" },
  h: { symbol: "♥", color: "#c0392b" },
  d: { symbol: "♦", color: "#c0392b" },
  S: { symbol: "♠", color: "#1a1a2e" },
  C: { symbol: "♣", color: "#1a2e1a" },
  H: { symbol: "♥", color: "#c0392b" },
  D: { symbol: "♦", color: "#c0392b" },
};

function parseCard(card: string): { rank: string; suit: { symbol: string; color: string } } | null {
  if (!card || card === "?" || card === "x" || card === "X") return null;

  const cleaned = card.trim();
  let rank = "";
  let suitChar = "";

  if (cleaned.length >= 2) {
    // Handle "10s", "10h" etc.
    if (cleaned.startsWith("10") || cleaned.startsWith("T") || cleaned.startsWith("t")) {
      rank = cleaned.startsWith("10") ? "10" : "T";
      suitChar = cleaned.slice(cleaned.startsWith("10") ? 2 : 1);
    } else {
      rank = cleaned[0].toUpperCase();
      suitChar = cleaned.slice(1);
    }
  }

  const displayRank = RANK_MAP[rank] || rank;
  const suit = SUIT_MAP[suitChar.toLowerCase()] || SUIT_MAP[suitChar] || { symbol: "?", color: "#666" };

  return { rank: displayRank, suit };
}

// ── Size config ────────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { width: 28, height: 40, rankSize: 10, suitSize: 8, cornerSize: 8, borderRadius: 4 },
  md: { width: 40, height: 56, rankSize: 14, suitSize: 11, cornerSize: 11, borderRadius: 6 },
  lg: { width: 52, height: 72, rankSize: 18, suitSize: 14, cornerSize: 14, borderRadius: 7 },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function PlayingCard({ card, size = "md", faceDown = false, className = "", style }: PlayingCardProps) {
  const cfg = SIZE_CONFIG[size];
  const parsed = card ? parseCard(card) : null;
  const isUnknown = !parsed || faceDown;

  const baseStyle: React.CSSProperties = {
    width: cfg.width,
    height: cfg.height,
    borderRadius: cfg.borderRadius,
    flexShrink: 0,
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  // ── Face-down / unknown card ─────────────────────────────────────────────────
  if (isUnknown) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #1e3a5f 100%)",
          border: "1.5px solid rgba(255,255,255,0.12)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Diamond pattern */}
        <svg
          width={cfg.width - 4}
          height={cfg.height - 4}
          viewBox="0 0 36 52"
          style={{ opacity: 0.35 }}
        >
          <pattern id="dp" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="none" />
            <path d="M4.5 0 L9 4.5 L4.5 9 L0 4.5 Z" fill="#4fc3f7" />
          </pattern>
          <rect width="36" height="52" fill="url(#dp)" />
        </svg>
        {/* Border overlay */}
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: cfg.borderRadius - 1,
            border: "1px solid rgba(79,195,247,0.2)",
          }}
        />
      </div>
    );
  }

  // ── Face-up card ─────────────────────────────────────────────────────────────
  const { rank, suit } = parsed;
  const isRed = suit.color === "#c0392b";

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background: "linear-gradient(160deg, #ffffff 0%, #f8f8f8 100%)",
        border: "1.5px solid rgba(0,0,0,0.15)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
        overflow: "hidden",
      }}
    >
      {/* Top-left corner */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          gap: 0,
        }}
      >
        <span
          style={{
            fontSize: cfg.cornerSize,
            fontWeight: 800,
            color: suit.color,
            fontFamily: "'Arial Black', 'Arial', sans-serif",
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
        <span
          style={{
            fontSize: cfg.cornerSize - 1,
            color: suit.color,
            lineHeight: 1,
          }}
        >
          {suit.symbol}
        </span>
      </div>

      {/* Center suit */}
      <span
        style={{
          fontSize: cfg.suitSize + 4,
          color: suit.color,
          opacity: 0.15,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          userSelect: "none",
        }}
      >
        {suit.symbol}
      </span>

      {/* Bottom-right corner (rotated) */}
      <div
        style={{
          position: "absolute",
          bottom: 2,
          right: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          gap: 0,
          transform: "rotate(180deg)",
        }}
      >
        <span
          style={{
            fontSize: cfg.cornerSize,
            fontWeight: 800,
            color: suit.color,
            fontFamily: "'Arial Black', 'Arial', sans-serif",
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
        <span
          style={{
            fontSize: cfg.cornerSize - 1,
            color: suit.color,
            lineHeight: 1,
          }}
        >
          {suit.symbol}
        </span>
      </div>

      {/* Red tint overlay for hearts/diamonds */}
      {isRed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(192,57,43,0.03)",
            borderRadius: cfg.borderRadius - 1,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

export default PlayingCard;
