import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HandComparison() {
  const [hand1Id, setHand1Id] = useState<number | null>(null);
  const [hand2Id, setHand2Id] = useState<number | null>(null);

  const { data: hands, isLoading: handsLoading } = trpc.hands.list.useQuery();
  const { data: hand1 } = trpc.hands.get.useQuery({ id: hand1Id! }, { enabled: !!hand1Id });
  const { data: hand2 } = trpc.hands.get.useQuery({ id: hand2Id! }, { enabled: !!hand2Id });

  const formatCard = (card: string) => {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitMap: Record<string, string> = { h: "♥", d: "♦", s: "♠", c: "♣" };
    const suitSymbol = suitMap[suit.toLowerCase()] || suit;
    const isRed = suit.toLowerCase() === "h" || suit.toLowerCase() === "d";
    return (
      <span className={isRed ? "text-red-600" : ""}>
        {rank}
        {suitSymbol}
      </span>
    );
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 8) return "text-green-500";
    if (rating >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const findCommonPatterns = () => {
    if (!hand1 || !hand2) return [];
    const patterns: string[] = [];
    
    // Check for common positions
    if (hand1.heroPosition === hand2.heroPosition) {
      patterns.push(`Both played from ${hand1.heroPosition}`);
    }
    
    // Check for similar mistakes
    const mistakes1 = (hand1.mistakeTags as unknown as string[]) || [];
    const mistakes2 = (hand2.mistakeTags as unknown as string[]) || [];
    const commonMistakes = mistakes1.filter(m => mistakes2.includes(m));
    if (commonMistakes.length > 0) {
      patterns.push(`Common mistakes: ${commonMistakes.join(", ")}`);
    }
    
    // Check for similar ratings
    const rating1 = parseFloat(hand1.overallRating || "0");
    const rating2 = parseFloat(hand2.overallRating || "0");
    if (Math.abs(rating1 - rating2) < 1) {
      patterns.push(`Similar overall performance (${rating1.toFixed(1)} vs ${rating2.toFixed(1)})`);
    }
    
    return patterns;
  };

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
              <span className="text-2xl text-accent">♠</span>
              <h1 className="text-2xl font-bold">Hand Comparison</h1>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Hand Selectors */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Hands to Compare</CardTitle>
            <CardDescription>Choose two hands from your archive to analyze side-by-side</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Hand 1</label>
                <Select value={hand1Id?.toString()} onValueChange={(v) => setHand1Id(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first hand" />
                  </SelectTrigger>
                  <SelectContent>
                    {handsLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                      </div>
                    ) : (
                      hands?.map((hand: any) => (
                        <SelectItem key={hand.id} value={hand.id.toString()}>
                          {hand.title || `${hand.heroPosition} - ${formatCard(hand.heroCard1)} ${formatCard(hand.heroCard2)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hand 2</label>
                <Select value={hand2Id?.toString()} onValueChange={(v) => setHand2Id(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second hand" />
                  </SelectTrigger>
                  <SelectContent>
                    {handsLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                      </div>
                    ) : (
                      hands?.map((hand: any) => (
                        <SelectItem key={hand.id} value={hand.id.toString()}>
                          {hand.title || `${hand.heroPosition} - ${formatCard(hand.heroCard1)} ${formatCard(hand.heroCard2)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Patterns */}
        {hand1 && hand2 && (
          <Card className="mb-6 bg-accent/10 border-accent/30">
            <CardHeader>
              <CardTitle className="text-accent">Pattern Analysis</CardTitle>
              <CardDescription>Common elements between these hands</CardDescription>
            </CardHeader>
            <CardContent>
              {findCommonPatterns().length > 0 ? (
                <ul className="space-y-2">
                  {findCommonPatterns().map((pattern, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No common patterns detected between these hands.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hand 1 */}
          <div>
            {hand1 ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{hand1.title || "Hand 1"}</CardTitle>
                    <Badge className={getRatingColor(parseFloat(hand1.overallRating || "0"))}>
                      {parseFloat(hand1.overallRating || "0").toFixed(1)}/10
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(hand1.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hero Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Hero</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Position:</span>
                        <span className="font-mono font-semibold text-accent">{hand1.heroPosition}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cards:</span>
                        <span className="font-mono font-semibold">
                          {formatCard(hand1.heroCard1)} {formatCard(hand1.heroCard2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Game Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Game</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Blinds:</span>
                        <span className="font-mono">{hand1.smallBlind}/{hand1.bigBlind}</span>
                      </div>
                      {hand1.ante > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Ante:</span>
                          <span className="font-mono">{hand1.ante}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Board */}
                  {hand1.flopCard1 && (
                    <div>
                      <h4 className="font-semibold mb-2">Board</h4>
                      <div className="flex gap-2 flex-wrap">
                        {[hand1.flopCard1, hand1.flopCard2, hand1.flopCard3, hand1.turnCard, hand1.riverCard]
                          .filter(Boolean)
                          .map((card, idx) => (
                            <div
                              key={idx}
                              className="w-10 h-14 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm"
                            >
                              {formatCard(card!)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Ratings */}
                  <div>
                    <h4 className="font-semibold mb-2">Street Ratings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Preflop:</span>
                        <span className={`font-mono ${getRatingColor(parseFloat(hand1.preflopRating || "0"))}`}>
                          {parseFloat(hand1.preflopRating || "0").toFixed(1)}/10
                        </span>
                      </div>
                      {hand1.flopRating && (
                        <div className="flex justify-between text-sm">
                          <span>Flop:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand1.flopRating))}`}>
                            {parseFloat(hand1.flopRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                      {hand1.turnRating && (
                        <div className="flex justify-between text-sm">
                          <span>Turn:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand1.turnRating))}`}>
                            {parseFloat(hand1.turnRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                      {hand1.riverRating && (
                        <div className="flex justify-between text-sm">
                          <span>River:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand1.riverRating))}`}>
                            {parseFloat(hand1.riverRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/hand/${hand1.id}`}>
                    <Button variant="outline" className="w-full">View Full Analysis</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a hand to compare
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hand 2 */}
          <div>
            {hand2 ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{hand2.title || "Hand 2"}</CardTitle>
                    <Badge className={getRatingColor(parseFloat(hand2.overallRating || "0"))}>
                      {parseFloat(hand2.overallRating || "0").toFixed(1)}/10
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(hand2.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hero Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Hero</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Position:</span>
                        <span className="font-mono font-semibold text-accent">{hand2.heroPosition}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cards:</span>
                        <span className="font-mono font-semibold">
                          {formatCard(hand2.heroCard1)} {formatCard(hand2.heroCard2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Game Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Game</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Blinds:</span>
                        <span className="font-mono">{hand2.smallBlind}/{hand2.bigBlind}</span>
                      </div>
                      {hand2.ante > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Ante:</span>
                          <span className="font-mono">{hand2.ante}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Board */}
                  {hand2.flopCard1 && (
                    <div>
                      <h4 className="font-semibold mb-2">Board</h4>
                      <div className="flex gap-2 flex-wrap">
                        {[hand2.flopCard1, hand2.flopCard2, hand2.flopCard3, hand2.turnCard, hand2.riverCard]
                          .filter(Boolean)
                          .map((card, idx) => (
                            <div
                              key={idx}
                              className="w-10 h-14 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm"
                            >
                              {formatCard(card!)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Ratings */}
                  <div>
                    <h4 className="font-semibold mb-2">Street Ratings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Preflop:</span>
                        <span className={`font-mono ${getRatingColor(parseFloat(hand2.preflopRating || "0"))}`}>
                          {parseFloat(hand2.preflopRating || "0").toFixed(1)}/10
                        </span>
                      </div>
                      {hand2.flopRating && (
                        <div className="flex justify-between text-sm">
                          <span>Flop:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand2.flopRating))}`}>
                            {parseFloat(hand2.flopRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                      {hand2.turnRating && (
                        <div className="flex justify-between text-sm">
                          <span>Turn:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand2.turnRating))}`}>
                            {parseFloat(hand2.turnRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                      {hand2.riverRating && (
                        <div className="flex justify-between text-sm">
                          <span>River:</span>
                          <span className={`font-mono ${getRatingColor(parseFloat(hand2.riverRating))}`}>
                            {parseFloat(hand2.riverRating).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/hand/${hand2.id}`}>
                    <Button variant="outline" className="w-full">View Full Analysis</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a hand to compare
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
