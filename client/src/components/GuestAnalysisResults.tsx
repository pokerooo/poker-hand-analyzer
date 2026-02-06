import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";

interface GuestAnalysisResultsProps {
  analysis: {
    overallRating: number;
    preflopRating: number;
    flopRating?: number;
    turnRating?: number;
    riverRating?: number;
    mistakeTags: string[];
    analysis: {
      preflop: string;
      flop?: string;
      turn?: string;
      river?: string;
      summary: string;
    };
  };
  onClose: () => void;
}

export default function GuestAnalysisResults({ analysis, onClose }: GuestAnalysisResultsProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-green-500";
    if (rating >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 8) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rating >= 6) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge variant="destructive">Needs Work</Badge>;
  };

  return (
    <div className="min-h-screen bg-background felt-texture py-8">
      <div className="container max-w-4xl">
        {/* Sign up prompt */}
        <Card className="mb-6 border-accent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Sign up to save your analysis</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a free account to save this hand, build your archive, track statistics, and access community features.
                </p>
                <div className="flex gap-3">
                  <Button asChild>
                    <a href={getLoginUrl()}>
                      Sign Up Free
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Analyze Another Hand
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Hand Analysis Results</CardTitle>
                <CardDescription>AI-powered analysis of your poker hand</CardDescription>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getRatingColor(analysis.overallRating)}`}>
                  {analysis.overallRating}/10
                </div>
                <div className="text-sm text-muted-foreground">Overall Rating</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Street Ratings */}
            <div>
              <h3 className="font-semibold mb-3">Street-by-Street Ratings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className={`text-2xl font-bold ${getRatingColor(analysis.preflopRating)}`}>
                    {analysis.preflopRating}/10
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Preflop</div>
                </div>
                {analysis.flopRating && (
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className={`text-2xl font-bold ${getRatingColor(analysis.flopRating)}`}>
                      {analysis.flopRating}/10
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Flop</div>
                  </div>
                )}
                {analysis.turnRating && (
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className={`text-2xl font-bold ${getRatingColor(analysis.turnRating)}`}>
                      {analysis.turnRating}/10
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Turn</div>
                  </div>
                )}
                {analysis.riverRating && (
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className={`text-2xl font-bold ${getRatingColor(analysis.riverRating)}`}>
                      {analysis.riverRating}/10
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">River</div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Mistake Tags */}
            {analysis.mistakeTags && analysis.mistakeTags.length > 0 && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Key Issues Identified</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.mistakeTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="border-destructive text-destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Detailed Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold">Detailed Analysis</h3>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Preflop</h4>
                <p className="text-sm leading-relaxed">{analysis.analysis.preflop}</p>
              </div>

              {analysis.analysis.flop && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Flop</h4>
                  <p className="text-sm leading-relaxed">{analysis.analysis.flop}</p>
                </div>
              )}

              {analysis.analysis.turn && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Turn</h4>
                  <p className="text-sm leading-relaxed">{analysis.analysis.turn}</p>
                </div>
              )}

              {analysis.analysis.river && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">River</h4>
                  <p className="text-sm leading-relaxed">{analysis.analysis.river}</p>
                </div>
              )}

              <div className="bg-accent/10 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  Summary
                </h4>
                <p className="text-sm leading-relaxed">{analysis.analysis.summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <Card className="mt-6 bg-accent/5">
          <CardContent className="pt-6 text-center">
            <h3 className="font-semibold text-lg mb-2">Want to save this analysis?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign up to save hands, track your progress, and improve your game over time.
            </p>
            <Button asChild size="lg">
              <a href={getLoginUrl()}>
                Create Free Account
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
