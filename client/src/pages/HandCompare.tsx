import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

export default function HandCompare() {
  const [selectedHandIds, setSelectedHandIds] = useState<number[]>([]);
  const { data: hands, isLoading } = trpc.hands.list.useQuery();

  const toggleHandSelection = (handId: number) => {
    setSelectedHandIds((prev) =>
      prev.includes(handId)
        ? prev.filter((id) => id !== handId)
        : prev.length < 3
        ? [...prev, handId]
        : prev
    );
  };

  const selectedHands = hands?.filter((h) => selectedHandIds.includes(h.id)) || [];

  const formatCard = (card: string) => {
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitSymbol = { h: "♥", d: "♦", s: "♠", c: "♣" }[suit] || suit;
    const isRed = suit === "h" || suit === "d";
    return (
      <span className={isRed ? "text-red-500" : ""}>
        {rank}
        {suitSymbol}
      </span>
    );
  };

  const getRatingColor = (rating: number | null): string => {
    if (!rating) return "text-muted-foreground";
    if (rating >= 8) return "text-green-500";
    if (rating >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  // Pattern detection
  const detectPatterns = () => {
    if (selectedHands.length < 2) return null;

    const commonMistakes: Record<string, number> = {};
    const positionCounts: Record<string, number> = {};
    const avgRatings: Record<string, number[]> = {
      preflop: [],
      flop: [],
      turn: [],
      river: [],
      overall: [],
    };

    selectedHands.forEach((hand) => {
      // Count mistakes
      const mistakes = Array.isArray(hand.mistakeTags) ? hand.mistakeTags : [];
      mistakes.forEach((tag: string) => {
        commonMistakes[tag] = (commonMistakes[tag] || 0) + 1;
      });

      // Count positions
      positionCounts[hand.heroPosition] = (positionCounts[hand.heroPosition] || 0) + 1;

      // Collect ratings
      if (hand.preflopRating) avgRatings.preflop.push(Number(hand.preflopRating));
      if (hand.flopRating) avgRatings.flop.push(Number(hand.flopRating));
      if (hand.turnRating) avgRatings.turn.push(Number(hand.turnRating));
      if (hand.riverRating) avgRatings.river.push(Number(hand.riverRating));
      if (hand.overallRating) avgRatings.overall.push(Number(hand.overallRating));
    });

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      commonMistakes: Object.entries(commonMistakes)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]),
      positions: Object.entries(positionCounts),
      avgRatings: {
        preflop: avg(avgRatings.preflop),
        flop: avg(avgRatings.flop),
        turn: avg(avgRatings.turn),
        river: avg(avgRatings.river),
        overall: avg(avgRatings.overall),
      },
    };
  };

  const patterns = detectPatterns();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/archive">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Archive
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-bold">Compare Hands</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedHandIds.length}/3 selected
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {selectedHandIds.length === 0 ? (
          /* Hand Selection View */
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Hands to Compare</CardTitle>
                <CardDescription>
                  Choose 2-3 hands from your archive to analyze side-by-side. Look for patterns in similar
                  scenarios (same position, similar cards, etc.)
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hands?.map((hand) => (
                <Card
                  key={hand.id}
                  className={`cursor-pointer transition-all ${
                    selectedHandIds.includes(hand.id)
                      ? "border-accent border-2 bg-accent/10"
                      : "hover:border-accent/50"
                  }`}
                  onClick={() => toggleHandSelection(hand.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {hand.title || `${hand.heroPosition} Hand`}
                        </CardTitle>
                        <CardDescription>
                          {new Date(hand.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Checkbox
                        checked={selectedHandIds.includes(hand.id)}
                        onCheckedChange={() => toggleHandSelection(hand.id)}
                        disabled={!selectedHandIds.includes(hand.id) && selectedHandIds.length >= 3}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Position</span>
                        <Badge variant="outline">{hand.heroPosition}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cards</span>
                        <span className="font-mono font-semibold">
                          {formatCard(hand.heroCard1)} {formatCard(hand.heroCard2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rating</span>
                        <span
                          className={`font-mono font-semibold ${getRatingColor(
                            hand.overallRating ? Number(hand.overallRating) : null
                          )}`}
                        >
                          {hand.overallRating ? Number(hand.overallRating).toFixed(1) : "N/A"}/10
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedHandIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
                <Button
                  size="lg"
                  onClick={() => {
                    // Scroll to comparison view
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={selectedHandIds.length < 2}
                >
                  Compare {selectedHandIds.length} Hand{selectedHandIds.length > 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Comparison View */
          <div className="space-y-6">
            {/* Pattern Insights */}
            {patterns && (
              <Card className="bg-accent/10 border-accent/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent" />
                    Pattern Insights
                  </CardTitle>
                  <CardDescription>Common tendencies across selected hands</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patterns.commonMistakes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Recurring Mistakes</h3>
                      <div className="flex flex-wrap gap-2">
                        {patterns.commonMistakes.map(([mistake, count]) => (
                          <Badge key={mistake} variant="destructive">
                            {mistake.replace(/_/g, " ")} ({count}x)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Average Ratings</h3>
                      <div className="space-y-2">
                        {patterns.avgRatings.preflop > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Preflop</span>
                            <span className={getRatingColor(patterns.avgRatings.preflop)}>
                              {patterns.avgRatings.preflop.toFixed(1)}/10
                            </span>
                          </div>
                        )}
                        {patterns.avgRatings.flop > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Flop</span>
                            <span className={getRatingColor(patterns.avgRatings.flop)}>
                              {patterns.avgRatings.flop.toFixed(1)}/10
                            </span>
                          </div>
                        )}
                        {patterns.avgRatings.turn > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Turn</span>
                            <span className={getRatingColor(patterns.avgRatings.turn)}>
                              {patterns.avgRatings.turn.toFixed(1)}/10
                            </span>
                          </div>
                        )}
                        {patterns.avgRatings.river > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>River</span>
                            <span className={getRatingColor(patterns.avgRatings.river)}>
                              {patterns.avgRatings.river.toFixed(1)}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-2">Positions</h3>
                      <div className="space-y-2">
                        {patterns.positions.map(([pos, count]) => (
                          <div key={pos} className="flex justify-between text-sm">
                            <span>{pos}</span>
                            <span className="text-muted-foreground">{count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedHands.map((hand) => {
                const mistakes = Array.isArray(hand.mistakeTags) ? hand.mistakeTags : [];
                return (
                  <Card key={hand.id} className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {hand.title || `${hand.heroPosition} Hand`}
                      </CardTitle>
                      <CardDescription>
                        {new Date(hand.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Hero Info */}
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Hero</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Position</span>
                            <Badge variant="outline">{hand.heroPosition}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Cards</span>
                            <span className="font-mono font-semibold">
                              {formatCard(hand.heroCard1)} {formatCard(hand.heroCard2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Blinds */}
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Blinds</h3>
                        <div className="text-sm font-mono">
                          {hand.smallBlind}/{hand.bigBlind}
                          {hand.ante && hand.ante > 0 ? ` (${hand.ante})` : ""}
                        </div>
                      </div>

                      <Separator />

                      {/* Ratings */}
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Ratings</h3>
                        <div className="space-y-2">
                          {hand.preflopRating && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Preflop</span>
                                <span className="font-mono">
                                  {Number(hand.preflopRating).toFixed(1)}/10
                                </span>
                              </div>
                              <Progress value={Number(hand.preflopRating) * 10} className="h-1" />
                            </div>
                          )}
                          {hand.flopRating && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Flop</span>
                                <span className="font-mono">{Number(hand.flopRating).toFixed(1)}/10</span>
                              </div>
                              <Progress value={Number(hand.flopRating) * 10} className="h-1" />
                            </div>
                          )}
                          {hand.turnRating && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Turn</span>
                                <span className="font-mono">{Number(hand.turnRating).toFixed(1)}/10</span>
                              </div>
                              <Progress value={Number(hand.turnRating) * 10} className="h-1" />
                            </div>
                          )}
                          {hand.riverRating && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>River</span>
                                <span className="font-mono">
                                  {Number(hand.riverRating).toFixed(1)}/10
                                </span>
                              </div>
                              <Progress value={Number(hand.riverRating) * 10} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Overall */}
                      <div className="text-center py-2">
                        <div
                          className={`text-4xl font-bold ${getRatingColor(
                            hand.overallRating ? Number(hand.overallRating) : null
                          )}`}
                        >
                          {hand.overallRating ? Number(hand.overallRating).toFixed(1) : "N/A"}/10
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
                      </div>

                      {/* Mistakes */}
                      {mistakes.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                              Mistakes
                            </h3>
                            <div className="flex flex-wrap gap-1">
                              {mistakes.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {tag.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* View Details */}
                      <Link href={`/hand/${hand.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Full Analysis
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setSelectedHandIds([])}>
                Select Different Hands
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
