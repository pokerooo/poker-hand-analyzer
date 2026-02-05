import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Target, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function UserStats() {
  const { data: stats, isLoading } = trpc.stats.overview.useQuery();
  const { data: mistakes } = trpc.stats.mistakes.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-accent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Start analyzing hands to see your statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/input">
              <Button className="w-full">Input Your First Hand</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatMistakeTag = (tag: string): string => {
    return tag
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 8) return "#22c55e"; // green
    if (rating >= 6) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const mistakeChartData = (mistakes || []).slice(0, 7).map((m) => ({
    name: formatMistakeTag(m.mistake),
    count: m.count,
  }));

  const positionChartData = Object.entries(stats.positionPerformance).map(([position, data]) => ({
    position,
    rating: data.avgRating,
    count: data.count,
  }));

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
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-2xl text-accent">♠</span>
              <h1 className="text-xl sm:text-2xl font-bold">Your Statistics</h1>
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Performance */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-6xl font-bold text-accent mb-2">
                  {stats.averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-3xl font-bold">{stats.totalHands}</div>
                  <div className="text-xs text-muted-foreground">Total Hands Analyzed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Most Common Mistake */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Top Mistake
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mistakes && mistakes.length > 0 ? (
                <div className="py-4">
                  <div className="text-center mb-4">
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      {formatMistakeTag(mistakes[0].mistake)}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-destructive mb-1">
                      {mistakes[0].count}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Occurrences ({((mistakes[0].count / stats.totalHands) * 100).toFixed(1)}% of hands)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No mistakes detected yet!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Trend */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Recent Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.ratingTrend.length > 0 ? (
                <div className="py-4">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={stats.ratingTrend.slice(-10)}>
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#d4af37"
                        strokeWidth={2}
                        dot={false}
                      />
                      <YAxis domain={[0, 10]} hide />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-4">
                    <div className="text-sm text-muted-foreground">
                      Last {Math.min(10, stats.ratingTrend.length)} hands
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Not enough data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mistake Frequency Chart */}
        {mistakeChartData.length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Mistake Frequency</CardTitle>
              <CardDescription>Your most common strategic errors</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mistakeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fill: "#888", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Position Performance */}
        {positionChartData.length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Performance by Position</CardTitle>
              <CardDescription>Average rating across different positions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={positionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="position" tick={{ fill: "#888" }} />
                  <YAxis domain={[0, 10]} tick={{ fill: "#888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border p-3 rounded-lg">
                            <div className="font-semibold">{data.position}</div>
                            <div className="text-sm text-muted-foreground">
                              Rating: {data.rating.toFixed(1)}/10
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.count} hands
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rating" radius={[8, 8, 0, 0]}>
                    {positionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRatingColor(entry.rating)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Rating Trend Over Time */}
        {stats.ratingTrend.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Rating Improvement Trend</CardTitle>
              <CardDescription>Your performance over the last {stats.ratingTrend.length} hands</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.ratingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="handNumber"
                    tick={{ fill: "#888" }}
                    label={{ value: "Hand Number", position: "insideBottom", offset: -5, fill: "#888" }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: "#888" }}
                    label={{ value: "Rating", angle: -90, position: "insideLeft", fill: "#888" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border p-3 rounded-lg">
                            <div className="font-semibold">Hand #{data.handNumber}</div>
                            <div className="text-sm text-accent">
                              Rating: {data.rating.toFixed(1)}/10
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(data.date).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#d4af37"
                    strokeWidth={3}
                    dot={{ fill: "#d4af37", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* All Mistakes List */}
        {mistakes && mistakes.length > 0 && (
          <Card className="bg-card border-border mt-8">
            <CardHeader>
              <CardTitle>All Detected Mistakes</CardTitle>
              <CardDescription>Complete breakdown of your strategic errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mistakes.map((mistake, index) => (
                  <div key={mistake.mistake} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{formatMistakeTag(mistake.mistake)}</div>
                        <div className="text-xs text-muted-foreground">
                          {((mistake.count / stats.totalHands) * 100).toFixed(1)}% of hands
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-destructive">{mistake.count}</div>
                        <div className="text-xs text-muted-foreground">occurrences</div>
                      </div>
                      <Progress
                        value={(mistake.count / mistakes[0].count) * 100}
                        className="w-24 h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
