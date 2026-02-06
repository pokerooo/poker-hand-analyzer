import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface VisualCardSelectorProps {
  value?: string;
  onChange: (card: string) => void;
  label?: string;
}

const SUITS = [
  { symbol: "♠", name: "s", color: "text-foreground", bgColor: "bg-foreground/10" },
  { symbol: "♥", name: "h", color: "text-red-500", bgColor: "bg-red-500/10" },
  { symbol: "♣", name: "c", color: "text-green-500", bgColor: "bg-green-500/10" },
  { symbol: "♦", name: "d", color: "text-blue-500", bgColor: "bg-blue-500/10" },
];

const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

export default function VisualCardSelector({ value, onChange, label }: VisualCardSelectorProps) {
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);

  // Parse existing value if provided
  const currentRank = value ? value.slice(0, -1) : null;
  const currentSuit = value ? value.slice(-1) : null;

  const handleSuitClick = (suitName: string) => {
    setSelectedSuit(suitName);
    if (selectedRank) {
      onChange(`${selectedRank}${suitName}`);
    }
  };

  const handleRankClick = (rank: string) => {
    setSelectedRank(rank);
    if (selectedSuit) {
      onChange(`${rank}${selectedSuit}`);
    }
  };

  const handleClear = () => {
    setSelectedRank(null);
    setSelectedSuit(null);
    onChange("");
  };

  const handleRandom = () => {
    const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    setSelectedRank(randomRank);
    setSelectedSuit(randomSuit.name);
    onChange(`${randomRank}${randomSuit.name}`);
  };

  const displayRank = selectedRank || currentRank;
  const displaySuit = selectedSuit || currentSuit;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-2 sm:p-3 space-y-2">
          {/* Suit Selection - Top Row */}
          <div className="flex items-center gap-1.5">
            <div className="grid grid-cols-4 gap-1 flex-1">
              {SUITS.map((suit) => (
                <button
                  key={suit.name}
                  onClick={() => handleSuitClick(suit.name)}
                  className={`
                    aspect-[3/4] rounded-lg border-2 bg-background
                    flex flex-col items-center justify-center
                    transition-all hover:scale-105 active:scale-95
                    min-h-[50px]
                    ${
                      displaySuit === suit.name
                        ? `border-accent ${suit.bgColor} shadow-lg scale-105`
                        : "border-border hover:border-accent/50"
                    }
                  `}
                >
                  <div className="text-lg sm:text-xl font-bold">
                    {displayRank || "A"}
                  </div>
                  <div className={`text-2xl sm:text-3xl ${suit.color}`}>
                    {suit.symbol}
                  </div>
                </button>
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 min-h-[40px] text-xs px-2"
            >
              Clear
            </Button>
          </div>

          {/* Rank Selection - Compact Grid */}
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {RANKS.slice(0, 7).map((rank) => (
                <button
                  key={rank}
                  onClick={() => handleRankClick(rank)}
                  className={`
                    aspect-square rounded border-2
                    flex items-center justify-center
                    text-sm sm:text-base font-bold
                    transition-all hover:scale-105 active:scale-95
                    min-h-[36px] min-w-[36px]
                    ${
                      displayRank === rank
                        ? "border-accent bg-accent/20 text-accent shadow-lg scale-105"
                        : "border-border bg-background/50 hover:border-accent/50 hover:bg-accent/10"
                    }
                  `}
                >
                  {rank}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {RANKS.slice(7).map((rank) => (
                <button
                  key={rank}
                  onClick={() => handleRankClick(rank)}
                  className={`
                    aspect-square rounded border-2
                    flex items-center justify-center
                    text-sm sm:text-base font-bold
                    transition-all hover:scale-105 active:scale-95
                    min-h-[36px] min-w-[36px]
                    ${
                      displayRank === rank
                        ? "border-accent bg-accent/20 text-accent shadow-lg scale-105"
                        : "border-border bg-background/50 hover:border-accent/50 hover:bg-accent/10"
                    }
                  `}
                >
                  {rank}
                </button>
              ))}
              
              {/* Random button in the grid */}
              <button
                onClick={handleRandom}
                className="aspect-square rounded border-2 border-border bg-background/50 hover:border-accent/50 hover:bg-accent/10 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all hover:scale-105 min-h-[36px]"
              >
                Rng
              </button>
            </div>
          </div>

          {/* Selected Card Display - Compact */}
          {displayRank && displaySuit && (
            <div className="text-center p-2 bg-accent/10 rounded border border-accent/30">
              <div className="text-xs text-muted-foreground">Selected</div>
              <div className="text-xl font-mono font-bold">
                {displayRank}
                <span className={SUITS.find(s => s.name === displaySuit)?.color}>
                  {SUITS.find(s => s.name === displaySuit)?.symbol}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
