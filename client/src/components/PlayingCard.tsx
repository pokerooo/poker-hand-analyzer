/**
 * PlayingCard — Four-Colour Deck Design
 * Hearts = Crimson Red | Spades = Dark Charcoal | Diamonds = Royal Blue | Clubs = Forest Green
 * Coloured card backgrounds with white rank/suit text for instant suit recognition.
 */

import React from "react";

interface PlayingCardProps {
  card?: string | null;   // e.g. "Ah", "Kd", "2c", "Ts" — or null for face-down
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ── Four-colour suit metadata ──────────────────────────────────────────────────

const SUIT_META: Record<string, { bg: string; border: string; symbol: string }> = {
  s: { bg: "linear-gradient(145deg, #2d3748, #1a202c)", border: "rgba(160,174,192,0.25)", symbol: "♠" },
  h: { bg: "linear-gradient(145deg, #c0392b, #96281b)", border: "rgba(255,100,100,0.3)",   symbol: "♥" },
  d: { bg: "linear-gradient(145deg, #2563eb, #1d4ed8)", border: "rgba(96,165,250,0.3)",    symbol: "♦" },
  c: { bg: "linear-gradient(145deg, #16a34a, #15803d)", border: "rgba(74,222,128,0.25)",   symbol: "♣" },
};

const FALLBACK_META = { bg: "linear-gradient(145deg, #334155, #1e293b)", border: "rgba(148,163,184,0.2)", symbol: "?" };

const RANK_MAP: Record<string, string> = {
  A: "A", K: "K", Q: "Q", J: "J", T: "10",
  "2": "2", "3": "3", "4": "4", "5": "5",
  "6": "6", "7": "7", "8": "8", "9": "9", "10": "10",
};

function parseCard(card: string): { rank: string; meta: typeof SUIT_META[string] } | null {
  if (!card || card === "?" || card === "x" || card === "X") return null;

  const cleaned = card.trim();
  let rank = "";
  let suitChar = "";

  if (cleaned.length >= 2) {
    if (cleaned.startsWith("10") || cleaned.startsWith("T") || cleaned.startsWith("t")) {
      rank = cleaned.startsWith("10") ? "10" : "T";
      suitChar = cleaned.slice(cleaned.startsWith("10") ? 2 : 1);
    } else {
      rank = cleaned[0].toUpperCase();
      suitChar = cleaned.slice(1);
    }
  }

  const displayRank = RANK_MAP[rank] || rank;
  const meta = SUIT_META[suitChar.toLowerCase()] ?? FALLBACK_META;
  return { rank: displayRank, meta };
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

  // ── Face-up card (four-colour filled) ────────────────────────────────────────
  const { rank, meta } = parsed;

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background: meta.bg,
        border: `1.5px solid ${meta.border}`,
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
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
            color: "#ffffff",
            fontFamily: "'Arial Black', 'Arial', sans-serif",
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
        <span
          style={{
            fontSize: cfg.cornerSize - 1,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1,
          }}
        >
          {meta.symbol}
        </span>
      </div>

      {/* Center suit watermark */}
      <span
        style={{
          fontSize: cfg.suitSize + 4,
          color: "rgba(255,255,255,0.15)",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          userSelect: "none",
        }}
      >
        {meta.symbol}
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
            color: "#ffffff",
            fontFamily: "'Arial Black', 'Arial', sans-serif",
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
        <span
          style={{
            fontSize: cfg.cornerSize - 1,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1,
          }}
        >
          {meta.symbol}
        </span>
      </div>
    </div>
  );
}

export default PlayingCard;
