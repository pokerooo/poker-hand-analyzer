import { Card, CardContent } from "@/components/ui/card";

interface HandInputPreviewProps {
  heroPosition?: string | null;
  heroCard1?: string;
  heroCard2?: string;
  flopCard1?: string;
  flopCard2?: string;
  flopCard3?: string;
  turnCard?: string;
  riverCard?: string;
  smallBlind?: number;
  bigBlind?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: "♥",
  d: "♦",
  s: "♠",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  h: "text-red-500",
  d: "text-blue-500",
  s: "text-foreground",
  c: "text-green-500",
};

function formatCard(card: string) {
  if (!card) return null;
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const symbol = SUIT_SYMBOLS[suit] || suit;
  const color = SUIT_COLORS[suit] || "text-foreground";
  
  return (
    <span className={`font-mono font-bold ${color}`}>
      {rank}{symbol}
    </span>
  );
}

export default function HandInputPreview({
  heroPosition,
  heroCard1,
  heroCard2,
  flopCard1,
  flopCard2,
  flopCard3,
  turnCard,
  riverCard,
  smallBlind,
  bigBlind,
}: HandInputPreviewProps) {
  // Don't show preview if nothing is selected yet
  const hasAnyData = heroPosition || heroCard1 || heroCard2 || flopCard1 || flopCard2 || flopCard3 || turnCard || riverCard;
  
  if (!hasAnyData) return null;

  return (
    <Card className="bg-muted/30 border-accent/30 sticky top-0 z-10 mb-3">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Hero Info */}
          {(heroPosition || heroCard1 || heroCard2) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Hero:</span>
              {heroPosition && (
                <span className="font-semibold text-accent">{heroPosition}</span>
              )}
              {(heroCard1 || heroCard2) && (
                <div className="flex gap-1">
                  {heroCard1 && formatCard(heroCard1)}
                  {heroCard2 && formatCard(heroCard2)}
                </div>
              )}
            </div>
          )}

          {/* Blinds */}
          {(smallBlind || bigBlind) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Blinds:</span>
              <span className="font-mono">{smallBlind}/{bigBlind}</span>
            </div>
          )}

          {/* Board */}
          {(flopCard1 || flopCard2 || flopCard3 || turnCard || riverCard) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Board:</span>
              <div className="flex gap-1">
                {flopCard1 && formatCard(flopCard1)}
                {flopCard2 && formatCard(flopCard2)}
                {flopCard3 && formatCard(flopCard3)}
                {(flopCard1 || flopCard2 || flopCard3) && (turnCard || riverCard) && (
                  <span className="text-muted-foreground mx-1">|</span>
                )}
                {turnCard && formatCard(turnCard)}
                {turnCard && riverCard && (
                  <span className="text-muted-foreground mx-1">|</span>
                )}
                {riverCard && formatCard(riverCard)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
