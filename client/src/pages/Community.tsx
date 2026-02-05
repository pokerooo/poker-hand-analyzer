import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, ThumbsUp, MessageCircle, TrendingUp, Clock, Award } from "lucide-react";
import { Link } from "wouter";

export default function Community() {
  const [sortBy, setSortBy] = useState<"recent" | "top" | "rating">("top");
  
  const { data: publicHands, isLoading } = trpc.hands.getPublic.useQuery({ limit: 50, sortBy });

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

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-2xl text-accent">♠</span>
              <h1 className="text-2xl font-bold">Community Hands</h1>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Sort Tabs */}
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="top">
              <TrendingUp className="mr-2 h-4 w-4" />
              Top Rated
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="mr-2 h-4 w-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="rating">
              <Award className="mr-2 h-4 w-4" />
              Best Plays
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Hands Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-accent" />
          </div>
        ) : publicHands && publicHands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicHands.map((hand: any) => (
              <Link key={hand.id} href={`/hand/${hand.id}`}>
                <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {hand.title || `${hand.heroPosition} Hand`}
                      </CardTitle>
                      <Badge className={getRatingColor(parseFloat(hand.overallRating || "0"))}>
                        {parseFloat(hand.overallRating || "0").toFixed(1)}/10
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(hand.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Hero Cards */}
                    <div>
                      <div className="flex gap-2 mb-2">
                        <div className="w-10 h-14 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                          {formatCard(hand.heroCard1)}
                        </div>
                        <div className="w-10 h-14 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-sm">
                          {formatCard(hand.heroCard2)}
                        </div>
                        <div className="flex items-center ml-2">
                          <Badge variant="outline">{hand.heroPosition}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Board */}
                    {hand.flopCard1 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Board</div>
                        <div className="flex gap-1">
                          {[hand.flopCard1, hand.flopCard2, hand.flopCard3, hand.turnCard, hand.riverCard]
                            .filter(Boolean)
                            .map((card, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-11 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background text-xs"
                              >
                                {formatCard(card!)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{hand.upvoteCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{hand.commentCount || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No public hands yet. Be the first to share your analysis!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
