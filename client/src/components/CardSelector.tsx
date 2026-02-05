import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { symbol: "♠", name: "spades", color: "text-foreground", code: "s" },
  { symbol: "♥", name: "hearts", color: "text-red-500", code: "h" },
  { symbol: "♦", name: "diamonds", color: "text-red-500", code: "d" },
  { symbol: "♣", name: "clubs", color: "text-foreground", code: "c" },
];

interface CardSelectorProps {
  value?: string; // e.g., "As", "Kh"
  onChange: (card: string) => void;
  label?: string;
  disabled?: boolean;
  excludeCards?: string[]; // Cards already selected
}

export function CardSelector({
  value,
  onChange,
  label,
  disabled,
  excludeCards = [],
}: CardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);

  const handleRankSelect = (rank: string) => {
    setSelectedRank(rank);
  };

  const handleSuitSelect = (suitCode: string) => {
    if (selectedRank) {
      const card = `${selectedRank}${suitCode}`;
      onChange(card);
      setIsOpen(false);
      setSelectedRank(null);
    }
  };

  const displayCard = value ? (
    <div className="flex items-center gap-1">
      <span className="font-bold">{value[0]}</span>
      <span
        className={cn(
          "text-xl",
          value[1] === "h" || value[1] === "d" ? "text-red-500" : "text-foreground"
        )}
      >
        {value[1] === "s" && "♠"}
        {value[1] === "h" && "♥"}
        {value[1] === "d" && "♦"}
        {value[1] === "c" && "♣"}
      </span>
    </div>
  ) : (
    <span className="text-muted-foreground">Select card</span>
  );

  if (!isOpen) {
    return (
      <div>
        {label && <label className="text-sm font-medium mb-2 block">{label}</label>}
        <Button
          variant="outline"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className="w-full justify-start h-12 text-base"
        >
          {displayCard}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="text-sm font-medium mb-2 block">{label}</label>}
      <div className="border border-border rounded-lg p-4 bg-card">
        {!selectedRank ? (
          <>
            <p className="text-sm text-muted-foreground mb-3">Select rank:</p>
            <div className="grid grid-cols-7 gap-2">
              {RANKS.map((rank) => (
                <Button
                  key={rank}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRankSelect(rank)}
                  className="h-10 font-bold"
                >
                  {rank}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Select suit for <span className="font-bold">{selectedRank}</span>:
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRank(null)}
                className="h-6 px-2 text-xs"
              >
                Back
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SUITS.map((suit) => {
                const card = `${selectedRank}${suit.code}`;
                const isExcluded = excludeCards.includes(card);
                return (
                  <Button
                    key={suit.code}
                    variant="outline"
                    size="lg"
                    onClick={() => !isExcluded && handleSuitSelect(suit.code)}
                    disabled={isExcluded}
                    className={cn("h-16 text-3xl", suit.color)}
                  >
                    {suit.symbol}
                  </Button>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              setSelectedRank(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
