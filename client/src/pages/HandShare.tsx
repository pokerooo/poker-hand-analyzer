import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { useRoute, Link } from "wouter";

/**
 * Public share page - displays hand analysis without requiring authentication
 */
export default function HandShare() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token || "";

  const { data: hand, isLoading, error } = trpc.hands.getByShareToken.useQuery({ token });

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
            <CardDescription>
              This hand analysis is not available or has been made private.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
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
    const suitSymbol = { h: "♥", d: "♦", s: "♠", c: "♣" }[suit] || suit;
    const isRed = suit === "h" || suit === "d";
    return (
      <span className={isRed ? "text-red-500" : ""}>{rank}{suitSymbol}</span>
    );
  };

  const getRatingColor = (rating: number | null): string => {
    if (!rating) return "bg-muted";
    if (rating >= 8) return "bg-green-600";
    if (rating >= 6) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getRatingLabel = (rating: number | null): string => {
    if (!rating) return "N/A";
    if (rating >= 8) return "Excellent";
    if (rating >= 6) return "Good";
    if (rating >= 4) return "Marginal";
    return "Poor";
  };

  const mistakeTags = Array.isArray(hand.mistakeTags) ? hand.mistakeTags : [];

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-bold">Shared Hand Analysis</h1>
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Main Content - Reuse HandDetail structure */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <Card className="bg-card border-border sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-accent">♦</span>
                  Hand Setup
                </CardTitle>
                <CardDescription>
                  {hand.title || `${hand.heroPosition} Hand`}
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
                      <span className="font-mono font-semibold">
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
                      <span className="font-mono font-semibold">{hand.smallBlind} / {hand.bigBlind}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ante</span>
                      <span className="font-mono font-semibold">{hand.ante || 0}</span>
                    </div>
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
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                            {formatCard(hand.flopCard1)}
                          </div>
                        )}
                        {hand.flopCard2 && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                            {formatCard(hand.flopCard2)}
                          </div>
                        )}
                        {hand.flopCard3 && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                            {formatCard(hand.flopCard3)}
                          </div>
                        )}
                        {hand.turnCard && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                            {formatCard(hand.turnCard)}
                          </div>
                        )}
                        {hand.riverCard && (
                          <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
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
                    <div className="text-6xl font-bold text-accent mb-2">
                      {hand.overallRating ? Number(hand.overallRating).toFixed(1) : "N/A"}/10
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getRatingLabel(hand.overallRating ? Number(hand.overallRating) : null)}
                    </Badge>
                  </div>
                </div>

                {/* Mistake Tags */}
                {mistakeTags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">Detected Mistakes</h3>
                      <div className="flex flex-wrap gap-2">
                        {mistakeTags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {tag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Analysis */}
          <div className="lg:col-span-8">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Hand Analysis</CardTitle>
                <CardDescription>Street-by-street breakdown and strategic evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                {hand.analysis ? (
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                      {hand.analysis}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No detailed analysis available for this hand.</p>
                )}

                {/* Street Ratings */}
                <div className="mt-8 space-y-4">
                  <h3 className="font-semibold">Street-by-Street Ratings</h3>
                  {hand.preflopRating && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Preflop</span>
                        <span className="font-mono font-semibold">
                          {Number(hand.preflopRating).toFixed(1)}/10
                        </span>
                      </div>
                      <Progress
                        value={Number(hand.preflopRating) * 10}
                        className="h-2"
                      />
                    </div>
                  )}
                  {hand.flopRating && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Flop</span>
                        <span className="font-mono font-semibold">
                          {Number(hand.flopRating).toFixed(1)}/10
                        </span>
                      </div>
                      <Progress
                        value={Number(hand.flopRating) * 10}
                        className="h-2"
                      />
                    </div>
                  )}
                  {hand.turnRating && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Turn</span>
                        <span className="font-mono font-semibold">
                          {Number(hand.turnRating).toFixed(1)}/10
                        </span>
                      </div>
                      <Progress
                        value={Number(hand.turnRating) * 10}
                        className="h-2"
                      />
                    </div>
                  )}
                  {hand.riverRating && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>River</span>
                        <span className="font-mono font-semibold">
                          {Number(hand.riverRating).toFixed(1)}/10
                        </span>
                      </div>
                      <Progress
                        value={Number(hand.riverRating) * 10}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-accent/10 border-accent/30 mt-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Want to analyze your own hands?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign up for free and start improving your poker game with AI-powered analysis.
                  </p>
                  <Link href="/">
                    <Button size="lg" className="gap-2">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
