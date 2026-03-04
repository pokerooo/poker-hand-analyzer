import { useMemo } from "react";

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
  h: "#ef4444",
  d: "#ef4444",
  s: "#1e293b",
  c: "#166534",
};

const SUIT_SYMBOLS: Record<string, string> = {
  h: "♥",
  d: "♦",
  s: "♠",
  c: "♣",
};

function parseCard(card: string) {
  if (!card || card.length < 2) return { rank: "?", suit: "s", display: "?" };
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  return { rank, suit, display: `${rank}${SUIT_SYMBOLS[suit] || suit}` };
}

function CardFace({ card, small = false }: { card: string; small?: boolean }) {
  const { rank, suit } = parseCard(card);
  const color = SUIT_COLORS[suit] || "#1e293b";
  const size = small ? "w-7 h-10" : "w-10 h-14";
  const textSize = small ? "text-xs" : "text-sm";

  return (
    <div
      className={`${size} rounded bg-white border border-gray-200 flex flex-col items-center justify-center shadow-md select-none`}
      style={{ color }}
    >
      <span className={`font-bold ${textSize} leading-none`}>{rank}</span>
      <span className={`${textSize} leading-none`}>{SUIT_SYMBOLS[suit] || suit}</span>
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  const size = small ? "w-7 h-10" : "w-10 h-14";
  return (
    <div className={`${size} rounded bg-gradient-to-br from-blue-800 to-blue-900 border border-blue-700 flex items-center justify-center shadow-md`}>
      <div className="w-4 h-6 rounded border border-blue-600 opacity-50" />
    </div>
  );
}

// Position seats around the table (normalized 0-1 coordinates)
function getSeatPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  // Always place hero at bottom center
  const heroAngle = Math.PI / 2; // 90 degrees = bottom
  for (let i = 0; i < count; i++) {
    const angle = heroAngle - (2 * Math.PI * i) / count;
    const rx = 0.42; // horizontal radius
    const ry = 0.38; // vertical radius
    positions.push({
      x: 0.5 + rx * Math.cos(angle),
      y: 0.5 + ry * Math.sin(angle),
    });
  }
  return positions;
}

export function PokerTable({ players, communityCards, potSize, currentAction, street }: PokerTableProps) {
  const seatPositions = useMemo(() => getSeatPositions(players.length), [players.length]);

  const formatAmount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="relative w-full" style={{ paddingBottom: "62%" }}>
      {/* Table felt */}
      <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-emerald-800 to-emerald-900 border-4 border-amber-700/60 shadow-2xl overflow-visible">
        {/* Inner felt ring */}
        <div className="absolute inset-3 rounded-[50%] border border-emerald-600/40" />

        {/* Community cards + pot */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* Street label */}
          <span className="text-xs text-emerald-300/70 uppercase tracking-widest font-medium">
            {street}
          </span>

          {/* Community cards */}
          <div className="flex gap-1.5 items-center">
            {communityCards.length === 0 ? (
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-11 rounded border border-emerald-600/30 bg-emerald-700/20" />
                ))}
              </div>
            ) : (
              communityCards.map((card, i) => (
                <CardFace key={i} card={card} small />
              ))
            )}
          </div>

          {/* Pot */}
          {potSize > 0 && (
            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-amber-300 text-xs font-bold">{formatAmount(potSize)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Players */}
      {players.map((player, i) => {
        const pos = seatPositions[i];
        if (!pos) return null;

        const isCurrentActor = currentAction?.player === player.position;
        const left = `${pos.x * 100}%`;
        const top = `${pos.y * 100}%`;

        return (
          <div
            key={player.position}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left, top }}
          >
            <div className={`flex flex-col items-center gap-1 ${player.hasFolded ? "opacity-40" : ""}`}>
              {/* Cards above player (except hero who is at bottom) */}
              {player.holeCards && player.holeCards.length > 0 && !player.hasFolded && (
                <div className="flex gap-0.5">
                  {player.isHero
                    ? player.holeCards.map((c, ci) => <CardFace key={ci} card={c} small />)
                    : player.holeCards.map((_, ci) => <CardBack key={ci} small />)
                  }
                </div>
              )}
              {player.hasFolded && (
                <div className="text-xs text-gray-400 italic">folded</div>
              )}

              {/* Player chip / name */}
              <div
                className={`
                  relative flex flex-col items-center px-2 py-1 rounded-lg text-center min-w-[52px]
                  ${player.isHero
                    ? "bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/30"
                    : "bg-gray-800/90 text-white border border-gray-600"
                  }
                  ${isCurrentActor ? "ring-2 ring-white animate-pulse" : ""}
                `}
              >
                <span className="text-xs font-semibold leading-tight">{player.position}</span>
                {player.betAmount && player.betAmount > 0 && (
                  <span className="text-xs text-amber-300 font-mono leading-tight">
                    {formatAmount(player.betAmount)}
                  </span>
                )}
                {player.isAllIn && (
                  <span className="text-xs text-red-400 font-bold leading-tight">ALL IN</span>
                )}
              </div>

              {/* Current action bubble */}
              {isCurrentActor && currentAction && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                  {currentAction.action.toUpperCase()}
                  {currentAction.amount ? ` ${formatAmount(currentAction.amount)}` : ""}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
