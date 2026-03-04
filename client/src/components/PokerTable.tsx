import { useMemo, useRef, useEffect, useState } from "react";

interface Player {
  position: string;
  isHero: boolean;
  holeCards?: string[] | null;
  hasFolded?: boolean;
  isActive?: boolean;
  betAmount?: number;
  isAllIn?: boolean;
}

interface PokerTableProps {
  players: Player[];
  communityCards: string[];
  potSize: number;
  currentAction?: { player: string; action: string; amount?: number } | null;
  street: "preflop" | "flop" | "turn" | "river";
}

const SUIT_COLORS: Record<string, string> = {
  h: "#e11d48",
  d: "#e11d48",
  s: "#1e293b",
  c: "#15803d",
};

const SUIT_SYMBOLS: Record<string, string> = {
  h: "♥",
  d: "♦",
  s: "♠",
  c: "♣",
};

function parseCard(card: string) {
  if (!card || card.length < 2) return { rank: "?", suit: "s" };
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  return { rank, suit };
}

// Animated card that plays deal animation when it first appears
function CardFace({ card, small = false, animate = false }: { card: string; small?: boolean; animate?: boolean }) {
  const { rank, suit } = parseCard(card);
  const color = SUIT_COLORS[suit] || "#1e293b";
  const w = small ? 28 : 40;
  const h = small ? 40 : 56;
  const rankSize = small ? "text-[11px]" : "text-sm";
  const suitSize = small ? "text-[10px]" : "text-xs";

  return (
    <div
      className={`rounded-md bg-white shadow-md border border-gray-100 flex flex-col items-center justify-center select-none shrink-0 ${animate ? "card-deal" : ""}`}
      style={{ width: w, height: h, color }}
    >
      <span className={`font-black ${rankSize} leading-none`}>{rank}</span>
      <span className={`${suitSize} leading-none`}>{SUIT_SYMBOLS[suit] || suit}</span>
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  const w = small ? 28 : 40;
  const h = small ? 40 : 56;
  return (
    <div
      className="rounded-md shadow-md border border-blue-700 flex items-center justify-center shrink-0"
      style={{
        width: w,
        height: h,
        background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
      }}
    >
      <div
        className="rounded border border-blue-500/40 opacity-60"
        style={{ width: w * 0.55, height: h * 0.65 }}
      />
    </div>
  );
}

// Track which community cards are new in this render to trigger animation
function CommunityCards({ cards }: { cards: string[] }) {
  const prevCardsRef = useRef<string[]>([]);
  const [newCardIndices, setNewCardIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prev = prevCardsRef.current;
    const newIndices = new Set<number>();
    for (let i = 0; i < cards.length; i++) {
      if (i >= prev.length || prev[i] !== cards[i]) {
        newIndices.add(i);
      }
    }
    if (newIndices.size > 0) {
      setNewCardIndices(newIndices);
      const timer = setTimeout(() => setNewCardIndices(new Set()), 500);
      prevCardsRef.current = [...cards];
      return () => clearTimeout(timer);
    }
    prevCardsRef.current = [...cards];
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-md border border-white/10 bg-white/5"
            style={{ width: 28, height: 40 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 items-center">
      {cards.map((card, i) => (
        <CardFace key={`${card}-${i}`} card={card} small animate={newCardIndices.has(i)} />
      ))}
    </div>
  );
}

// Seat positions around the ellipse — hero always at index 0 = bottom center
function getSeatPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const heroAngle = Math.PI / 2; // 90° = bottom
  for (let i = 0; i < count; i++) {
    const angle = heroAngle - (2 * Math.PI * i) / count;
    const rx = 0.42;
    const ry = 0.36;
    positions.push({
      x: 0.5 + rx * Math.cos(angle),
      y: 0.5 + ry * Math.sin(angle),
    });
  }
  return positions;
}

const ACTION_COLORS: Record<string, string> = {
  fold: "bg-gray-500 text-white",
  check: "bg-sky-500 text-white",
  call: "bg-emerald-500 text-white",
  bet: "bg-amber-500 text-black",
  raise: "bg-orange-500 text-white",
  "all-in": "bg-red-500 text-white",
  allin: "bg-red-500 text-white",
  jam: "bg-red-500 text-white",
};

export function PokerTable({ players, communityCards, potSize, currentAction, street }: PokerTableProps) {
  const seatPositions = useMemo(() => getSeatPositions(players.length), [players.length]);

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);

  return (
    <div className="relative w-full select-none" style={{ paddingBottom: "60%" }}>
      {/* Table felt — bright green with warm rim */}
      <div
        className="absolute inset-0 overflow-visible"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 40% 35%, #22c55e 0%, #16a34a 45%, #15803d 100%)",
          border: "5px solid #92400e",
          boxShadow: "0 0 0 2px #d97706, 0 8px 32px rgba(0,0,0,0.35), inset 0 2px 8px rgba(255,255,255,0.12)",
        }}
      >
        {/* Inner felt ring */}
        <div
          className="absolute"
          style={{
            inset: 10,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />

        {/* Center: street label + community cards + pot */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">
            {streetLabel}
          </span>

          <CommunityCards cards={communityCards} />

          {potSize > 0 && (
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full mt-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span className="text-amber-300 text-xs font-bold tracking-wide">{formatAmount(potSize)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Players */}
      {players.map((player, i) => {
        const pos = seatPositions[i];
        if (!pos) return null;

        const isCurrentActor = currentAction?.player === player.position;
        const actionKey = currentAction?.action?.toLowerCase() || "";
        const actionColorClass = ACTION_COLORS[actionKey] || "bg-white text-black";

        return (
          <div
            key={player.position}
            className="absolute"
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className={`flex flex-col items-center gap-0.5 ${player.hasFolded ? "opacity-35" : ""}`}>
              {/* Hole cards (above name for non-hero, below for hero) */}
              {!player.isHero && player.holeCards && player.holeCards.length > 0 && !player.hasFolded && (
                <div className="flex gap-0.5 mb-0.5">
                  {player.holeCards.map((_, ci) => <CardBack key={ci} small />)}
                </div>
              )}

              {/* Action bubble */}
              {isCurrentActor && currentAction && (
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg mb-0.5 ${actionColorClass}`}>
                  {currentAction.action.toUpperCase()}
                  {currentAction.amount ? ` ${formatAmount(currentAction.amount)}` : ""}
                </div>
              )}

              {/* Player chip */}
              <div
                className={`
                  flex flex-col items-center px-2 py-1 rounded-lg text-center
                  ${player.isHero
                    ? "bg-amber-400 text-gray-900 font-bold shadow-lg shadow-amber-400/40 ring-2 ring-amber-300"
                    : "bg-white/90 text-gray-800 border border-gray-200 shadow-md"
                  }
                  ${isCurrentActor && !currentAction ? "ring-2 ring-white animate-pulse" : ""}
                `}
                style={{ minWidth: 52 }}
              >
                <span className="text-[11px] font-bold leading-tight">{player.position}</span>
                {player.betAmount && player.betAmount > 0 && (
                  <span className={`text-[10px] font-mono leading-tight ${player.isHero ? "text-gray-700" : "text-emerald-600 font-semibold"}`}>
                    {formatAmount(player.betAmount)}
                  </span>
                )}
                {player.isAllIn && (
                  <span className="text-[9px] text-red-600 font-black leading-tight">ALL IN</span>
                )}
              </div>

              {/* Hero hole cards below */}
              {player.isHero && player.holeCards && player.holeCards.length > 0 && !player.hasFolded && (
                <div className="flex gap-0.5 mt-0.5">
                  {player.holeCards.map((c, ci) => <CardFace key={ci} card={c} small />)}
                </div>
              )}

              {player.hasFolded && (
                <span className="text-[9px] text-white/50 italic mt-0.5">folded</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
