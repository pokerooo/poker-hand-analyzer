import { useMemo, useState, useEffect } from "react";

interface Player {
  position: string;
  isHero: boolean;
  holeCards?: string[] | null;
  hasFolded?: boolean;
  isActive?: boolean;
  betAmount?: number;
  isAllIn?: boolean;
  stackSize?: number;
}

interface PokerTableProps {
  players: Player[];
  communityCards: string[];
  potSize: number;
  currentAction?: { player: string; action: string; amount?: number } | null;
  street: "preflop" | "flop" | "turn" | "river";
  spr?: number | null;
}

// ─── Suit colours & symbols (Four-Colour Deck) ───────────────────────────────
// Hearts = Crimson Red | Spades = Dark Charcoal | Diamonds = Royal Blue | Clubs = Forest Green

const SUIT_META: Record<string, { bg: string; border: string; symbol: string }> = {
  s: { bg: "linear-gradient(145deg, #2d3748, #1a202c)", border: "rgba(160,174,192,0.25)", symbol: "♠" },
  h: { bg: "linear-gradient(145deg, #c0392b, #96281b)", border: "rgba(255,100,100,0.3)",   symbol: "♥" },
  d: { bg: "linear-gradient(145deg, #2563eb, #1d4ed8)", border: "rgba(96,165,250,0.3)",    symbol: "♦" },
  c: { bg: "linear-gradient(145deg, #16a34a, #15803d)", border: "rgba(74,222,128,0.25)",   symbol: "♣" },
};

const FALLBACK_META = { bg: "linear-gradient(145deg, #334155, #1e293b)", border: "rgba(148,163,184,0.2)", symbol: "?" };

function parseCard(card: string): { rank: string; suit: string; meta: typeof SUIT_META[string] } {
  if (!card || card.length < 2) return { rank: "?", suit: "?", meta: FALLBACK_META };
  const suit = card.slice(-1).toLowerCase();
  const rank = card.slice(0, -1).toUpperCase();
  return { rank, suit, meta: SUIT_META[suit] ?? FALLBACK_META };
}

// ─── Card Face Component ───────────────────────────────────────────────────────

function CardFace({ card, small = false, animate = false }: { card: string; small?: boolean; animate?: boolean }) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, [animate]);

  const { rank, meta } = parseCard(card);

  const w = small ? 28 : 40;
  const h = small ? 40 : 56;
  const cornerSize = small ? 9 : 12;

  return (
    <div
      style={{
        width: w,
        height: h,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.7) rotateY(90deg)",
        transition: "opacity 0.25s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        background: meta.bg,
        border: `1.5px solid ${meta.border}`,
        borderRadius: 5,
        position: "relative",
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Top-left corner */}
      <div style={{ position: "absolute", top: 2, left: 2.5, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, gap: 0 }}>
        <span style={{ fontSize: cornerSize, fontWeight: 900, color: "#fff", fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: cornerSize - 1, color: "rgba(255,255,255,0.85)", lineHeight: 1 }}>{meta.symbol}</span>
      </div>
      {/* Center watermark */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: cornerSize + 6, color: "rgba(255,255,255,0.15)", userSelect: "none" }}>{meta.symbol}</span>
      </div>
      {/* Bottom-right corner (rotated) */}
      <div style={{ position: "absolute", bottom: 2, right: 2.5, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, gap: 0, transform: "rotate(180deg)" }}>
        <span style={{ fontSize: cornerSize, fontWeight: 900, color: "#fff", fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: cornerSize - 1, color: "rgba(255,255,255,0.85)", lineHeight: 1 }}>{meta.symbol}</span>
      </div>
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  const w = small ? 28 : 40;
  const h = small ? 40 : 56;
  return (
    <div
      style={{
        width: w, height: h,
        background: "linear-gradient(145deg, #1e3a5f 0%, #0f172a 100%)",
        border: "1px solid #334155",
        borderRadius: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: w - 8, height: h - 8,
        border: "1px solid #1e40af40",
        borderRadius: 3,
        background: "repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 2px, #0f172a 2px, #0f172a 6px)",
      }} />
    </div>
  );
}

// ─── Community Cards ──────────────────────────────────────────────────────────

function CommunityCards({ cards, prevCount }: { cards: string[]; prevCount: number }) {
  return (
    <div className="flex gap-1.5 justify-center items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        if (i < cards.length) {
          return <CardFace key={`${cards[i]}-${i}`} card={cards[i]} animate={i >= prevCount} />;
        }
        return (
          <div
            key={`empty-${i}`}
            style={{
              width: 40, height: 56,
              borderRadius: 5,
              border: "1px dashed rgba(148,163,184,0.12)",
              background: "rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Seat Layout ──────────────────────────────────────────────────────────────

// Standard 8-max clockwise seat layout:
// Positions are fixed to visual slots regardless of who is hero.
// Clockwise from bottom-center:
//   Slot 0 = BTN (bottom-right)  — dealer
//   Slot 1 = SB  (bottom-left)
//   Slot 2 = BB  (left)
//   Slot 3 = UTG (top-left)
//   Slot 4 = UTG+1 (top-center-left)
//   Slot 5 = LJ  (top-center-right)
//   Slot 6 = HJ  (top-right)
//   Slot 7 = CO  (right)

// Visual positions for each of the 8 fixed slots
const SEAT_POSITIONS: Record<string, { top: string; left: string; transform: string }> = {
  BTN:    { top: "82%", left: "72%", transform: "translate(-50%, -50%)" },
  SB:     { top: "82%", left: "28%", transform: "translate(-50%, -50%)" },
  BB:     { top: "55%", left: "5%",  transform: "translate(-50%, -50%)" },
  UTG:    { top: "18%", left: "18%", transform: "translate(-50%, -50%)" },
  "UTG+1":{ top: "10%", left: "38%", transform: "translate(-50%, -50%)" },
  LJ:     { top: "10%", left: "62%", transform: "translate(-50%, -50%)" },
  HJ:     { top: "18%", left: "82%", transform: "translate(-50%, -50%)" },
  CO:     { top: "55%", left: "95%", transform: "translate(-50%, -50%)" },
};

// Canonical position order for 8-max (clockwise from BTN)
const CANONICAL_POSITIONS = ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"];

// Normalise position strings to canonical labels
function normalisePosition(pos: string): string {
  const p = pos.toUpperCase().trim();
  // Common aliases
  if (p === "MP" || p === "MP1" || p === "MP2") return "LJ";
  if (p === "EP" || p === "EP1") return "UTG";
  if (p === "EP2" || p === "UTG1") return "UTG+1";
  if (p === "BTN" || p === "BU" || p === "BUTTON") return "BTN";
  if (p === "SB" || p === "SMALL BLIND") return "SB";
  if (p === "BB" || p === "BIG BLIND") return "BB";
  if (p === "CO" || p === "CUTOFF") return "CO";
  if (p === "HJ" || p === "HIJACK") return "HJ";
  if (p === "LJ" || p === "LOJACK") return "LJ";
  if (p === "UTG+1" || p === "UTG1") return "UTG+1";
  if (p === "UTG" || p === "UNDER THE GUN") return "UTG";
  return pos; // keep as-is if unknown
}

// ─── Action colour ────────────────────────────────────────────────────────────

function getActionStyle(action: string): { bg: string; text: string; glow: string } {
  const a = action.toLowerCase();
  if (a === "fold")   return { bg: "#7f1d1d", text: "#fca5a5", glow: "#ef444440" };
  if (a === "call")   return { bg: "#1e3a5f", text: "#93c5fd", glow: "#3b82f640" };
  if (a === "check")  return { bg: "#14532d", text: "#86efac", glow: "#22c55e40" };
  if (a === "raise" || a === "bet") return { bg: "#78350f", text: "#fcd34d", glow: "#f59e0b60" };
  if (a === "allin")  return { bg: "#581c87", text: "#e879f9", glow: "#d946ef60" };
  return { bg: "#1e293b", text: "#e2e8f0", glow: "#64748b40" };
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ─── Main Table ───────────────────────────────────────────────────────────────

// Ghost seat for empty positions
function GhostSeat({ position }: { position: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="flex flex-col items-center px-2 py-1 rounded-lg text-center"
        style={{
          minWidth: 44,
          background: "rgba(15,23,42,0.3)",
          border: "1px dashed rgba(148,163,184,0.08)",
          opacity: 0.4,
        }}
      >
        <span className="text-[10px] font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>{position}</span>
        <span className="text-[9px]" style={{ color: "rgba(100,116,139,0.4)" }}>empty</span>
      </div>
    </div>
  );
}

export function PokerTable({ players, communityCards, potSize, currentAction, street, spr }: PokerTableProps) {
  // Build 8-seat layout: each canonical position maps to a fixed visual slot.
  // Active players are placed at their canonical position slot.
  // Empty positions get ghost seats.
  const fullSeats = useMemo(() => {
    // Normalise all player positions
    const normalisedPlayers = players.map((p) => ({
      ...p,
      position: normalisePosition(p.position),
    }));

    // Build a map from canonical position -> player (or null)
    const playerByPos = new Map<string, Player>();
    normalisedPlayers.forEach((p) => playerByPos.set(p.position, p));

    // Return one entry per canonical position in fixed order
    return CANONICAL_POSITIONS.map((pos) => ({
      player: playerByPos.get(pos) ?? null,
      ghostPos: pos,
      seatPos: SEAT_POSITIONS[pos],
    }));
  }, [players]);
  const [prevCardCount, setPrevCardCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPrevCardCount(communityCards.length), 400);
    return () => clearTimeout(t);
  }, [communityCards.length]);

  const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);

  return (
    <div className="relative w-full select-none" style={{ paddingBottom: "65%" }}>
      {/* ── Outer ambient glow ── */}
      <div
        className="absolute"
        style={{
          inset: "-20px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Table surface ── */}
      <div
        className="absolute inset-0 overflow-visible"
        style={{
          borderRadius: "50%",
          background: "var(--poker-table-felt)",
          border: "4px solid var(--poker-table-rim)",
          boxShadow: [
            `0 0 0 1px var(--poker-table-rim-glow)`,
            "0 16px 60px rgba(0,0,0,0.4)",
            "inset 0 2px 0 rgba(255,255,255,0.05)",
            "inset 0 -4px 16px rgba(0,0,0,0.2)",
          ].join(", "),
        }}
      >
        {/* Felt texture overlay */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "50%",
            backgroundImage: [
              "radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.04) 0%, transparent 65%)",
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.006) 3px, rgba(255,255,255,0.006) 6px)",
              "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.003) 3px, rgba(255,255,255,0.003) 6px)",
            ].join(", "),
            pointerEvents: "none",
          }}
        />
        {/* Gold rail ring */}
        <div
          className="absolute"
          style={{
            inset: 6,
            borderRadius: "50%",
            border: "1.5px solid rgba(212,175,55,0.12)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,175,55,0.06)",
            pointerEvents: "none",
          }}
        />
        {/* Inner glow ring */}
        <div
          className="absolute"
          style={{
            inset: 14,
            borderRadius: "50%",
            border: "1px solid rgba(16,185,129,0.06)",
            pointerEvents: "none",
          }}
        />

        {/* ── Centre: street + cards + pot ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* Street label */}
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#10b98180", letterSpacing: "0.25em" }}
          >
            {streetLabel}
          </span>

          {/* Community cards */}
          <CommunityCards cards={communityCards} prevCount={prevCardCount} />

          {/* Pot + SPR row */}
          {potSize > 0 && (
            <div className="flex items-center gap-2">
              {/* Pot */}
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--poker-green-subtle-border)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "radial-gradient(circle, #fbbf24, #d97706)",
                    boxShadow: "0 0 6px #f59e0b80",
                  }}
                />
                <span className="text-[11px] font-bold" style={{ color: "#fbbf24", textShadow: "0 0 8px #f59e0b60" }}>
                  {formatAmount(potSize)}
                </span>
              </div>

              {/* SPR badge — shown when pot > 0 and spr is known */}
              {spr != null && spr > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--poker-border)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>SPR</span>
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{
                      color: spr <= 4 ? "#f87171" : spr <= 13 ? "#fbbf24" : "#4ade80",
                    }}
                  >
                    {spr < 10 ? spr.toFixed(1) : Math.round(spr)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Player seats (always 8) ── */}
        {fullSeats.map((seat, idx) => {
          const pos = seat.seatPos;
          if (!pos) return null;

          // Ghost seat for empty positions
          if (!seat.player) {
            return (
              <div
                key={`ghost-${seat.ghostPos || idx}`}
                className="absolute"
                style={{ top: pos.top, left: pos.left, transform: pos.transform }}
              >
                <GhostSeat position={seat.ghostPos || "?"} />
              </div>
            );
          }

          const player = seat.player;
          const isCurrentActor = currentAction?.player === player.position;
          const actionStyle = isCurrentActor && currentAction ? getActionStyle(currentAction.action) : null;

          return (
            <div
              key={player.position}
              className="absolute flex flex-col items-center gap-0.5"
              style={{ top: pos.top, left: pos.left, transform: pos.transform }}
            >
              {/* Action bubble */}
              {isCurrentActor && currentAction && (
                <div
                  className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap mb-0.5"
                  style={{
                    background: actionStyle!.bg,
                    color: actionStyle!.text,
                    border: `1px solid ${actionStyle!.text}30`,
                    boxShadow: `0 0 10px ${actionStyle!.glow}`,
                    animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  {currentAction.action.toUpperCase()}
                  {currentAction.amount ? ` ${formatAmount(currentAction.amount)}` : ""}
                </div>
              )}

              {/* Player chip */}
              <div
                className="flex flex-col items-center px-2.5 py-1.5 rounded-lg text-center"
                style={{
                  minWidth: 54,
                  background: player.hasFolded
                    ? "var(--poker-surface-2)"
                    : player.isHero
                      ? "var(--poker-green)"
                      : "var(--poker-surface)",
                  border: player.isHero
                    ? "1px solid #10b98160"
                    : isCurrentActor
                      ? "1px solid #f59e0b60"
                      : "1px solid rgba(148,163,184,0.15)",
                  boxShadow: player.isHero
                    ? "0 0 16px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.5)"
                    : isCurrentActor
                      ? "0 0 12px rgba(245,158,11,0.25), 0 2px 8px rgba(0,0,0,0.5)"
                      : "0 2px 8px rgba(0,0,0,0.4)",
                  opacity: player.hasFolded ? 0.45 : 1,
                  transition: "all 0.3s ease",
                }}
              >
                <span
                  className="text-[11px] font-bold leading-tight"
                  style={{
                    color: player.isHero ? "var(--poker-green-fg)" : "var(--poker-text)",
                  }}
                >
                  {player.position}
                </span>

                {/* Active bet */}
                {player.betAmount != null && player.betAmount > 0 && (
                  <span
                    className="text-[10px] font-mono font-bold leading-tight"
                    style={{ color: "#fbbf24", textShadow: "0 0 6px #f59e0b50" }}
                  >
                    {formatAmount(player.betAmount)}
                  </span>
                )}

                {/* All-in badge */}
                {player.isAllIn && (
                  <span
                    className="text-[9px] font-black leading-tight px-1 rounded"
                    style={{ color: "#e879f9", background: "#581c8740", textShadow: "0 0 6px #d946ef60" }}
                  >
                    ALL IN
                  </span>
                )}
              </div>

              {/* Stack depth label — shown below chip for Hero always, non-folded participants */}
              {(player.isHero || !player.hasFolded) && player.stackSize != null && player.stackSize >= 0 && (
                <div
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: player.isHero ? "var(--poker-green)" : "var(--poker-text-muted)",
                    background: "rgba(0,0,0,0.3)",
                    border: player.isHero
                      ? "1px solid var(--poker-green-subtle-border)"
                      : "1px solid var(--poker-border)",
                    letterSpacing: "0.02em",
                    marginTop: 1,
                  }}
                >
                  {formatAmount(player.stackSize)}
                </div>
              )}

              {/* Hero hole cards */}
              {player.isHero && player.holeCards && player.holeCards.length > 0 && !player.hasFolded && (
                <div className="flex gap-1 mt-0.5">
                  {player.holeCards.map((c, ci) => <CardFace key={ci} card={c} small />)}
                </div>
              )}

              {/* Non-hero cards (face down) */}
              {!player.isHero && !player.hasFolded && (
                <div className="flex gap-0.5 mt-0.5">
                  <CardBack small />
                  <CardBack small />
                </div>
              )}

              {player.hasFolded && (
                <span className="text-[9px] italic mt-0.5" style={{ color: "var(--poker-text-muted)" }}>
                  folded
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
