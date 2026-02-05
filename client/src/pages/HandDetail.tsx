import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";

export default function HandDetail() {
  const [, params] = useRoute("/hand/:id");
  const handId = parseInt(params?.id || "0");

  const { data: hand, isLoading, error } = trpc.hands.get.useQuery({ id: handId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-accent" />
      </div>
    );
  }

  if (error || !hand) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Hand Not Found</CardTitle>
            <CardDescription>The requested hand could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/archive">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Archive
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCard = (card: string) => {
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitSymbol = { h: "♥", d: "♦", s: "♠", c: "♣" }[suit.toLowerCase()] || suit;
    const isRed = suit.toLowerCase() === "h" || suit.toLowerCase() === "d";
    return (
      <span className={isRed ? "text-red-600" : ""}>
        {rank}
        {suitSymbol}
      </span>
    );
  };

  const getMistakeExplanation = (tag: string): string => {
    const explanations: Record<string, string> = {
      overcalling_river: "Called a large river bet without sufficient pot odds or hand strength.",
      passive_flop_play: "As the preflop aggressor, should consider betting for value or protection.",
      missing_turn_probe: "After checking the flop, a turn bet (probe bet) can take down the pot or define opponent's range.",
      not_charging_draws: "With draws on the board, should bet to make drawing hands pay.",
      poor_pot_odds_call: "Called without getting the correct pot odds for your hand.",
      limping_preflop: "Limping is generally weaker than raising or folding in most situations.",
      leaking_in_3bet_spots: "Calling 3-bets from early position can be a leak; consider 4-betting or folding.",
      overvaluing_weak_top_pair: "Top pair with a weak kicker may not be strong enough to call large bets.",
    };
    return explanations[tag] || "This is a common strategic error.";
  };

  const formatMistakeTag = (tag: string): string => {
    return tag
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 8) return "text-green-500";
    if (rating >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const mistakeTags = (hand.mistakeTags as unknown as string[]) || [];

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
              <h1 className="text-2xl font-bold">Hand Analysis</h1>
            </div>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Hand Setup */}
          <div className="lg:col-span-4">
            <Card className="bg-card border-border sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-accent">♦</span>
                  Hand Setup
                </CardTitle>
                <CardDescription>
                  {hand.title || `Hand #${hand.id}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hero Info */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Hero</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Position</span>
                      <span className="font-mono font-semibold text-accent">{hand.heroPosition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cards</span>
                      <span className="font-mono font-semibold text-lg">
                        {formatCard(hand.heroCard1)} {formatCard(hand.heroCard2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Blinds */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Blinds</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">SB / BB</span>
                      <span className="font-mono font-semibold">
                        {hand.smallBlind} / {hand.bigBlind}
                      </span>
                    </div>
                    {hand.ante > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">Ante</span>
                        <span className="font-mono font-semibold">{hand.ante}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Board */}
                {(hand.flopCard1 || hand.turnCard || hand.riverCard) && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">Board</h3>
                      <div className="flex gap-2 justify-center py-4 flex-wrap">
                        {hand.flopCard1 && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                            {formatCard(hand.flopCard1)}
                          </div>
                        )}
                        {hand.flopCard2 && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                            {formatCard(hand.flopCard2)}
                          </div>
                        )}
                        {hand.flopCard3 && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                            {formatCard(hand.flopCard3)}
                          </div>
                        )}
                        {hand.turnCard && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                            {formatCard(hand.turnCard)}
                          </div>
                        )}
                        {hand.riverCard && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                            {formatCard(hand.riverCard)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Overall Rating */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Overall Rating</h3>
                  <div className="text-center py-4">
                    <div className={`text-6xl font-bold mb-2 ${getRatingColor(parseFloat(hand.overallRating || "0"))}`}>
                      {parseFloat(hand.overallRating || "0").toFixed(1)}/10
                    </div>
                    {mistakeTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-3">
                        {mistakeTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {formatMistakeTag(tag)}
                          </Badge>
                        ))}
                        {mistakeTags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mistakeTags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mistake Tags */}
            {mistakeTags.length > 0 && (
              <Card className="bg-destructive/10 border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-destructive">Detected Mistakes</CardTitle>
                  <CardDescription>Common errors identified in this hand</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mistakeTags.map((tag) => (
                      <div key={tag} className="flex gap-3 p-3 bg-background/50 rounded">
                        <span className="text-destructive text-xl font-bold">•</span>
                        <div>
                          <h5 className="font-semibold text-sm text-destructive">{formatMistakeTag(tag)}</h5>
                          <p className="text-xs text-muted-foreground mt-1">{getMistakeExplanation(tag)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Street-by-Street Analysis */}
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-card">
                <TabsTrigger value="preflop">Preflop</TabsTrigger>
                <TabsTrigger value="flop" disabled={!hand.flopCard1}>
                  Flop
                </TabsTrigger>
                <TabsTrigger value="turn" disabled={!hand.turnCard}>
                  Turn
                </TabsTrigger>
                <TabsTrigger value="river" disabled={!hand.riverCard}>
                  River
                </TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              {/* Preflop */}
              <TabsContent value="preflop" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Preflop Analysis</CardTitle>
                      <Badge className={`${getRatingColor(parseFloat(hand.preflopRating || "0"))} bg-accent/20`}>
                        {parseFloat(hand.preflopRating || "0").toFixed(1)}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <p>Your preflop play from {hand.heroPosition} position was rated {parseFloat(hand.preflopRating || "0").toFixed(1)}/10.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flop */}
              {hand.flopCard1 && hand.flopRating && (
                <TabsContent value="flop" className="space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Flop Analysis</CardTitle>
                        <Badge className={`${getRatingColor(parseFloat(hand.flopRating))} bg-accent/20`}>
                          {parseFloat(hand.flopRating).toFixed(1)}/10
                        </Badge>
                      </div>
                      <CardDescription>
                        Board: {formatCard(hand.flopCard1)} {formatCard(hand.flopCard2!)} {formatCard(hand.flopCard3!)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <p>Your flop play was rated {parseFloat(hand.flopRating).toFixed(1)}/10.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Turn */}
              {hand.turnCard && hand.turnRating && (
                <TabsContent value="turn" className="space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Turn Analysis</CardTitle>
                        <Badge className={`${getRatingColor(parseFloat(hand.turnRating))} bg-accent/20`}>
                          {parseFloat(hand.turnRating).toFixed(1)}/10
                        </Badge>
                      </div>
                      <CardDescription>Turn card: {formatCard(hand.turnCard)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <p>Your turn play was rated {parseFloat(hand.turnRating).toFixed(1)}/10.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* River */}
              {hand.riverCard && hand.riverRating && (
                <TabsContent value="river" className="space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>River Analysis</CardTitle>
                        <Badge className={`${getRatingColor(parseFloat(hand.riverRating))} bg-accent/20`}>
                          {parseFloat(hand.riverRating).toFixed(1)}/10
                        </Badge>
                      </div>
                      <CardDescription>River card: {formatCard(hand.riverCard)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <p>Your river play was rated {parseFloat(hand.riverRating).toFixed(1)}/10.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Summary */}
              <TabsContent value="summary" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Hand Summary</CardTitle>
                    <CardDescription>
                      Overall performance: {parseFloat(hand.overallRating || "0").toFixed(1)}/10
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Street Ratings */}
                    <div>
                      <h4 className="font-semibold mb-3">Street-by-Street Ratings</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Preflop</span>
                            <span className={`font-mono font-semibold ${getRatingColor(parseFloat(hand.preflopRating || "0"))}`}>
                              {parseFloat(hand.preflopRating || "0").toFixed(1)}/10
                            </span>
                          </div>
                          <Progress value={parseFloat(hand.preflopRating || "0") * 10} className="h-2" />
                        </div>
                        {hand.flopRating && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Flop</span>
                              <span className={`font-mono font-semibold ${getRatingColor(parseFloat(hand.flopRating))}`}>
                                {parseFloat(hand.flopRating).toFixed(1)}/10
                              </span>
                            </div>
                            <Progress value={parseFloat(hand.flopRating) * 10} className="h-2" />
                          </div>
                        )}
                        {hand.turnRating && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Turn</span>
                              <span className={`font-mono font-semibold ${getRatingColor(parseFloat(hand.turnRating))}`}>
                                {parseFloat(hand.turnRating).toFixed(1)}/10
                              </span>
                            </div>
                            <Progress value={parseFloat(hand.turnRating) * 10} className="h-2" />
                          </div>
                        )}
                        {hand.riverRating && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>River</span>
                              <span className={`font-mono font-semibold ${getRatingColor(parseFloat(hand.riverRating))}`}>
                                {parseFloat(hand.riverRating).toFixed(1)}/10
                              </span>
                            </div>
                            <Progress value={parseFloat(hand.riverRating) * 10} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Full Analysis Text */}
                    {hand.analysis && (
                      <div>
                        <h4 className="font-semibold mb-3">Detailed Analysis</h4>
                        <div className="prose prose-invert prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                          <Streamdown>{hand.analysis}</Streamdown>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
