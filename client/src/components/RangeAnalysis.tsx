import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evaluateHandInRange, getRangeHands, getRangePercentage } from "@shared/gtoRanges";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface RangeAnalysisProps {
  heroHand: string; // e.g., "AKs", "QQ", "T9o"
  heroPosition: string; // e.g., "UTG", "BTN"
}

export function RangeAnalysis({ heroHand, heroPosition }: RangeAnalysisProps) {
  const evaluation = evaluateHandInRange(heroHand, heroPosition);
  const rangeHands = getRangeHands(heroPosition);
  const rangePercentage = getRangePercentage(heroPosition);

  // All possible hands in a poker range chart (13x13 grid)
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  // Generate all hands for the chart
  const allHands: string[][] = [];
  for (let i = 0; i < ranks.length; i++) {
    const row: string[] = [];
    for (let j = 0; j < ranks.length; j++) {
      if (i === j) {
        // Pairs on diagonal
        row.push(ranks[i] + ranks[i]);
      } else if (i < j) {
        // Suited hands above diagonal
        row.push(ranks[i] + ranks[j] + 's');
      } else {
        // Offsuit hands below diagonal
        row.push(ranks[j] + ranks[i] + 'o');
      }
    }
    allHands.push(row);
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premium':
        return 'text-green-500';
      case 'strong':
        return 'text-blue-500';
      case 'playable':
        return 'text-yellow-500';
      case 'marginal':
        return 'text-orange-500';
      default:
        return 'text-red-500';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'premium':
        return <Badge className="bg-green-600">Premium</Badge>;
      case 'strong':
        return <Badge className="bg-blue-600">Strong</Badge>;
      case 'playable':
        return <Badge className="bg-yellow-600">Playable</Badge>;
      case 'marginal':
        return <Badge className="bg-orange-600">Marginal</Badge>;
      default:
        return <Badge variant="destructive">Fold</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Evaluation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {evaluation.inRange ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Range Analysis: {heroHand} from {heroPosition}
          </CardTitle>
          <CardDescription>
            GTO opening range evaluation for {heroPosition} position ({rangePercentage}% of hands)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hand Category</p>
              <div className="flex items-center gap-2">
                {getCategoryBadge(evaluation.category)}
                <span className={`font-semibold ${getCategoryColor(evaluation.category)}`}>
                  {evaluation.percentile}th percentile
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">In Range?</p>
              <p className={`font-bold text-lg ${evaluation.inRange ? 'text-green-500' : 'text-red-500'}`}>
                {evaluation.inRange ? 'YES' : 'NO'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">Recommendation</p>
                <p className="text-sm text-muted-foreground">{evaluation.recommendation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Range Chart */}
      <Card>
        <CardHeader>
          <CardTitle>GTO Range Chart for {heroPosition}</CardTitle>
          <CardDescription>
            Green = in range, Gray = not in range, Yellow = your hand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-13 gap-1">
                {allHands.map((row, i) => (
                  row.map((hand, j) => {
                    const isInRange = rangeHands.includes(hand);
                    const isHeroHand = hand === heroHand;
                    
                    return (
                      <div
                        key={`${i}-${j}`}
                        className={`
                          w-10 h-10 flex items-center justify-center text-xs font-mono font-semibold rounded
                          ${isHeroHand 
                            ? 'bg-yellow-500 text-black ring-2 ring-yellow-300' 
                            : isInRange 
                              ? 'bg-green-600/80 text-white' 
                              : 'bg-muted text-muted-foreground'
                          }
                        `}
                      >
                        {hand.replace('s', '♠').replace('o', '♢')}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600/80 rounded"></div>
              <span>In Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted rounded"></div>
              <span>Not in Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded ring-2 ring-yellow-300"></div>
              <span>Your Hand</span>
            </div>
          </div>

          {/* Range Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Range Size</p>
              <p className="text-2xl font-bold">{rangePercentage}%</p>
              <p className="text-xs text-muted-foreground">{rangeHands.length} hand combos</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Position</p>
              <p className="text-2xl font-bold">{heroPosition}</p>
              <p className="text-xs text-muted-foreground">
                {heroPosition === 'UTG' || heroPosition === 'UTG+1' || heroPosition === 'UTG+2' 
                  ? 'Early Position' 
                  : heroPosition === 'CO' || heroPosition === 'BTN' 
                    ? 'Late Position' 
                    : 'Blinds'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
