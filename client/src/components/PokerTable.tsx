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
}

// ─── Suit colours & symbols ───────────────────────────────────────────────────

const SUIT_META: Record<string, { color: string; symbol: string; isRed: boolean }> = {
  s: { color: "#1a1a2e", symbol: "♠", isRed: false },
  h: { color: "#c0392b", symbol: "♥", isRed: true },
  d: { color: "#c0392b", symbol: "♦", isRed: true },
  c: { color: "#1a2e1a", symbol: "♣", isRed: false },
};

function parseCard(card: string): { rank: string; suit: string; meta: typeof SUIT_META[string] } {
  if (!card || card.length < 2) return { rank: "?", suit: "?", meta: { color: "#94a3b8", symbol: "?", isRed: false } };
  const suit = card.slice(-1).toLowerCase();
  const rank = card.slice(0, -1).toUpperCase();
  return { rank, suit, meta: SUIT_META[suit] ?? { color: "#94a3b8", symbol: suit, isRed: false } };
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
        background: "linear-gradient(160deg, #ffffff 0%, #f5f5f5 100%)",
        border: "1.5px solid rgba(0,0,0,0.18)",
        borderRadius: 5,
        position: "relative",
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Top-left corner */}
      <div style={{ position: "absolute", top: 2, left: 2.5, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, gap: 0 }}>
        <span style={{ fontSize: cornerSize, fontWeight: 900, color: meta.color, fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: cornerSize - 1, color: meta.color, lineHeight: 1 }}>{meta.symbol}</span>
      </div>
      {/* Center watermark */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: cornerSize + 6, color: meta.color, opacity: 0.12, userSelect: "none" }}>{meta.symbol}</span>
      </div>
      {/* Bottom-right corner (rotated) */}
      <div style={{ position: "absolute", bottom: 2, right: 2.5, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, gap: 0, transform: "rotate(180deg)" }}>
        <span style={{ fontSize: cornerSize, fontWeight: 900, color: meta.color, fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: cornerSize - 1, color: meta.color, lineHeight: 1 }}>{meta.symbol}</span>
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

// Fixed 8-max seat positions — hero always at bottom-center (index 0)
const EIGHT_MAX_SEATS: Array<{ top: string; left: string; transform: string }> = [
  { top: "88%", left: "50%", transform: "translate(-50%, -50%)" },   // 0 hero bottom-center
  { top: "12%", left: "50%", transform: "translate(-50%, -50%)" },   // 1 top-center
  { top: "50%", left: "5%",  transform: "translate(-50%, -50%)" },   // 2 left
  { top: "50%", left: "95%", transform: "translate(-50%, -50%)" },   // 3 right
  { top: "20%", left: "18%", transform: "translate(-50%, -50%)" },   // 4 top-left
  { top: "20%", left: "82%", transform: "translate(-50%, -50%)" },   // 5 top-right
  { top: "75%", left: "15%", transform: "translate(-50%, -50%)" },   // 6 bottom-left
  { top: "75%", left: "85%", transform: "translate(-50%, -50%)" },   // 7 bottom-right
];

// Canonical 8-max position order (hero-relative rotation is handled by buildReplaySteps)
const CANONICAL_POSITIONS = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "HJ", "CO"];

function getSeatPositions(count: number): Array<{ top: string; left: string; transform: string }> {
  return EIGHT_MAX_SEATS.slice(0, Math.max(count, 0));
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

export function PokerTable({ players, communityCards, potSize, currentAction, street }: PokerTableProps) {
  // Build 8-seat layout: hero at index 0, fill remaining seats with active players then ghost seats
  const fullSeats = useMemo(() => {
    const hero = players.find((p) => p.isHero);
    const villains = players.filter((p) => !p.isHero);

    // Determine which canonical positions are NOT in the hand
    const activePosSet = new Set(players.map((p) => p.position.toUpperCase()));
    const emptyPositions = CANONICAL_POSITIONS.filter((pos) => !activePosSet.has(pos));

    // Seat 0 = hero, seats 1..N = villains, remaining = ghost seats up to 8 total
    const seats: Array<{ player: Player | null; ghostPos?: string }> = [];
    if (hero) seats.push({ player: hero });
    villains.forEach((v) => seats.push({ player: v }));

    // Fill up to 8 seats with ghost positions
    let ghostIdx = 0;
    while (seats.length < 8 && ghostIdx < emptyPositions.length) {
      seats.push({ player: null, ghostPos: emptyPositions[ghostIdx++] });
    }

    return seats;
  }, [players]);

  const seatPositions = EIGHT_MAX_SEATS; // always 8 fixed positions
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
          background: "radial-gradient(ellipse at 40% 35%, #0f4a2a 0%, #063a1a 40%, #021a0d 100%)",
          border: "4px solid #0a3d20",
          boxShadow: [
            "0 0 0 1px rgba(16,185,129,0.15)",
            "0 0 0 5px #080e0a",
            "0 0 0 7px rgba(16,185,129,0.08)",
            "0 0 0 8px #080e0a",
            "0 16px 60px rgba(0,0,0,0.85)",
            "inset 0 2px 0 rgba(255,255,255,0.05)",
            "inset 0 -4px 16px rgba(0,0,0,0.5)",
            "inset 0 0 80px rgba(0,0,0,0.3)",
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

          {/* Pot */}
          {potSize > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full mt-0.5"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(16,185,129,0.25)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 12px rgba(16,185,129,0.15)",
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
          )}
        </div>

        {/* ── Player seats (always 8) ── */}
        {fullSeats.map((seat, idx) => {
          const pos = seatPositions[idx];
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
                    ? "rgba(15,23,42,0.6)"
                    : player.isHero
                      ? "linear-gradient(135deg, #065f46 0%, #047857 100%)"
                      : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
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
                    color: player.isHero ? "#6ee7b7" : "#cbd5e1",
                    textShadow: player.isHero ? "0 0 8px rgba(16,185,129,0.5)" : "none",
                  }}
                >
                  {player.position}
                </span>

                {/* Stack size (when no active bet) */}
                {player.stackSize != null && player.stackSize > 0 &&
                  !(player.betAmount && player.betAmount > 0) && !player.isAllIn && (
                  <span className="text-[10px] font-mono leading-tight" style={{ color: "#64748b" }}>
                    {formatAmount(player.stackSize)}
                  </span>
                )}

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
                <span className="text-[9px] italic mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>
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
