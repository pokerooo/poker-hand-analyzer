/**
 * Casino Noir Design Philosophy:
 * - Deep charcoal/navy backgrounds with metallic gold accents
 * - Playfair Display for elegant headings, Inter for body text
 * - Card-like modules with subtle felt texture
 * - Asymmetric layout with strategic information hierarchy
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center py-20 border-b border-border"
        style={{
          backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/X1F9AFyeGpOrfmKOxPNlIi/sandbox/DzCqIvhu85aHghSC3lC6lM-img-1_1770192263000_na1fn_aGVyby1iYWNrZ3JvdW5k.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvWDFGOUFGeWVHcE9yZm1LT3hQTmxJaS9zYW5kYm94L0R6Q3FJdmh1ODVhSGdoU0MzbEM2bE0taW1nLTFfMTc3MDE5MjI2MzAwMF9uYTFmbl9hR1Z5YnkxaVlXTnJaM0p2ZFc1ay5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=OUFcfuewFQUVbPrfFWRvUIVqAxiS34w3lVqGsJMCTxw8ERz2nttcwQtDnhZ682gQPIDyjrda67ILWjuYiJ4iD2TetU4neeX9sevr4F1f80lR3cjZaE820epYoRx8uspR-qYebDeim2a1PIwSB5-9DG95003HXsf9SBOiXYCyDWGfESckzx9AMjjZiu1Ae~n9DEOhR2aTLjE19fSxw9zKOwXmZT8GZzsPXdBonRKT5MWlmyPspdosua2sBdGABPZ4oAMw3kagikmHae-npiylGbyj6K0fgvrhe8ty2NmGuVBaC~R9UBIAf-ay7vNTcY2e1oXULOUY7ldB8UVmJCa2sw__')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl text-accent">♠</span>
              <h1 className="text-6xl font-bold text-foreground tracking-tight">
                Poker Hand Analyzer
              </h1>
            </div>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Professional hand analysis for serious players. Dissect every street, understand every decision, and elevate your game with data-driven insights.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Hand Setup */}
          <div className="lg:col-span-4">
            <Card className="bg-card border-border sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-accent">♦</span>
                  Hand Setup
                </CardTitle>
                <CardDescription>ATo from UTG+1</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hero Info */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Hero</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Position</span>
                      <span className="font-mono font-semibold text-accent">UTG+1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cards</span>
                      <span className="font-mono font-semibold">A♠ T♣</span>
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
                      <span className="font-mono font-semibold">200 / 400</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ante</span>
                      <span className="font-mono font-semibold">400</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Board */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Final Board</h3>
                  <div className="flex gap-2 justify-center py-4">
                    <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                      A♦
                    </div>
                    <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                      8♦
                    </div>
                    <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                      4♠
                    </div>
                    <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                      2x
                    </div>
                    <div className="w-12 h-16 bg-card-foreground rounded flex items-center justify-center font-mono font-bold text-background">
                      9x
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Overall Rating */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Overall Rating</h3>
                  <div className="text-center py-4">
                    <div className="text-6xl font-bold text-accent mb-2">5/10</div>
                    <Badge variant="outline" className="text-xs">Passive Play</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-8 space-y-6">
            {/* Street-by-Street Analysis */}
            <Tabs defaultValue="preflop" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-card">
                <TabsTrigger value="preflop">Preflop</TabsTrigger>
                <TabsTrigger value="flop">Flop</TabsTrigger>
                <TabsTrigger value="turn">Turn</TabsTrigger>
                <TabsTrigger value="river">River</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              {/* Preflop */}
              <TabsContent value="preflop" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Preflop Analysis</CardTitle>
                      <Badge className="bg-accent text-accent-foreground">7/10</Badge>
                    </div>
                    <CardDescription>Open raise to 800 from UTG+1</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Action</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>Hero (UTG+1)</span>
                          <span className="font-mono text-accent">Raise to 800</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>MP</span>
                          <span className="font-mono">Call 800</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>All others</span>
                          <span className="font-mono text-muted-foreground">Fold</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Evaluation</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        ATo is a marginal hand from early position. The standard play depends on table dynamics and stack sizes, but opening from UTG+1 is acceptable in most games, though some tight players would fold. Against a single MP caller, Hero is likely ahead or flipping.
                      </p>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm">Key Takeaway</h4>
                      <p className="text-sm text-muted-foreground">
                        Standard open from UTG+1. ATo is at the bottom of most opening ranges from this position, but the play is defensible.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flop */}
              <TabsContent value="flop" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Flop Analysis</CardTitle>
                      <Badge variant="outline" className="border-yellow-600 text-yellow-500">5/10</Badge>
                    </div>
                    <CardDescription>A♦ 8♦ 4♠ - Top pair, weak kicker</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Action</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>Hero</span>
                          <span className="font-mono text-muted-foreground">Check</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>MP</span>
                          <span className="font-mono">Bet 1,000 (42% pot)</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>Hero</span>
                          <span className="font-mono text-accent">Call 1,000</span>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                        Pot: 2,400 → 4,400
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Hero's Hand Strength</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Made Hand</span>
                          <span className="font-semibold">Top Pair, Ten Kicker</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Board Texture</span>
                          <span className="text-destructive">Flush Draw Present (♦♦)</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Critical Decision: The Check</h4>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded">
                          <h5 className="text-xs font-semibold text-destructive mb-2">Arguments FOR Checking</h5>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Pot control with weak kicker</li>
                            <li>• Induces bluffs</li>
                            <li>• Avoids difficult spots if raised</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                          <h5 className="text-xs font-semibold text-accent mb-2">Arguments FOR Betting</h5>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Build pot for value</li>
                            <li>• Charge flush draws</li>
                            <li>• Maintain initiative</li>
                            <li>• Define villain's range</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm text-destructive">Key Mistake</h4>
                      <p className="text-sm text-muted-foreground">
                        Most players would continuation bet this flop (~50-60% pot) as the preflop raiser with top pair. Checking is non-standard and loses value while allowing villain to control the action.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Turn */}
              <TabsContent value="turn" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Turn Analysis</CardTitle>
                      <Badge variant="destructive">4/10</Badge>
                    </div>
                    <CardDescription>A♦ 8♦ 4♠ 2x - Brick card</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Action</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>Hero</span>
                          <span className="font-mono text-muted-foreground">Check</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>MP</span>
                          <span className="font-mono">Bet 2,600 (59% pot)</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>Hero</span>
                          <span className="font-mono text-accent">Call 2,600</span>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                        Pot: 4,400 → 9,600
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Turn Card Impact</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The 2 is a complete brick that changes nothing. It doesn't complete any draws and is unlikely to have helped either player. Villain continues with increased sizing, showing continued aggression.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Range Analysis</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Villain's Value Hands</span>
                            <span className="font-mono text-xs">~60%</span>
                          </div>
                          <Progress value={60} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Better aces (AJ+), two pair, sets</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Flush Draws</span>
                            <span className="font-mono text-xs">~25%</span>
                          </div>
                          <Progress value={25} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Still drawing with 9 outs</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Bluffs</span>
                            <span className="font-mono text-xs">~15%</span>
                          </div>
                          <Progress value={15} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Representing strength</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm text-destructive">Key Concern</h4>
                      <p className="text-sm text-muted-foreground">
                        By checking twice and calling twice, Hero has defined their hand very narrowly. Villain knows Hero likely has weak top pair, middle pair, or a weak draw. This passive line loses value and puts Hero in a defensive position.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* River */}
              <TabsContent value="river" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>River Analysis</CardTitle>
                      <Badge className="bg-accent text-accent-foreground">6/10</Badge>
                    </div>
                    <CardDescription>A♦ 8♦ 4♠ 2x 9x - Decision point</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Action</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>MP</span>
                          <span className="font-mono text-destructive font-bold">Bet 12,000 (125% pot overbet!)</span>
                        </div>
                        <div className="flex justify-between p-2 bg-accent/20 border border-accent rounded">
                          <span className="font-semibold">Hero Decision?</span>
                          <span className="font-mono text-accent font-bold">Call, Raise, or Fold?</span>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                        Pot: 9,600 | Bet: 12,000 | Total: 21,600
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Mathematical Analysis</h4>
                      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Pot Odds</span>
                          <span className="font-mono font-bold text-accent">1.8:1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Required Equity</span>
                          <span className="font-mono font-bold text-accent">55.6%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Call Amount</span>
                          <span className="font-mono">12,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Win Amount</span>
                          <span className="font-mono text-accent">21,600</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Decision Matrix</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded">
                          <h5 className="text-sm font-semibold text-destructive mb-2">Option 1: FOLD</h5>
                          <p className="text-xs text-muted-foreground mb-2">
                            The 125% pot overbet is very strong. Hero has weak kicker and passive line may discourage bluffs.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            ❌ Reasonable if villain rarely bluffs
                          </div>
                        </div>

                        <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                          <h5 className="text-sm font-semibold text-accent mb-2">Option 2: CALL ✓ Recommended</h5>
                          <p className="text-xs text-muted-foreground mb-2">
                            Getting 1.8:1 odds, only need to be good 55.6% of the time. Villain's range should contain enough missed flush draws and bluffs.
                          </p>
                          <div className="text-xs font-semibold text-accent">
                            ✓ Mathematically correct with top pair
                          </div>
                        </div>

                        <div className="p-3 bg-muted/30 border border-border rounded">
                          <h5 className="text-sm font-semibold text-muted-foreground mb-2">Option 3: RAISE</h5>
                          <p className="text-xs text-muted-foreground mb-2">
                            Rarely correct. Any raise gets called by better hands and folds out bluffs.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            ❌ Almost never correct
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Expected Value Calculation</h4>
                      <div className="bg-accent/10 border border-accent/30 p-4 rounded-lg">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>If villain bluffs 40% of time:</span>
                            <span className="font-mono text-accent">+1,440 chips</span>
                          </div>
                          <div className="flex justify-between">
                            <span>If villain bluffs 35.7% of time:</span>
                            <span className="font-mono">Break even</span>
                          </div>
                          <div className="flex justify-between">
                            <span>If villain bluffs less than 35.7%:</span>
                            <span className="font-mono text-destructive">Folding is better</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent/10 border border-accent/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm text-accent">Final Recommendation: CALL</h4>
                      <p className="text-sm text-muted-foreground">
                        The pot odds justify calling with top pair. Hero beats all missed flush draws (K♦Q♦, Q♦J♦, J♦T♦, etc.) and some thin value bets. While Hero loses to sets and two pair, the math supports a call.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary */}
              <TabsContent value="summary" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Hand Summary</CardTitle>
                    <CardDescription>Overall performance: 5/10 - Passive play</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Street-by-Street Ratings</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Preflop</span>
                            <span className="font-mono font-semibold text-accent">7/10</span>
                          </div>
                          <Progress value={70} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Standard open from UTG+1</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Flop</span>
                            <span className="font-mono font-semibold text-yellow-500">5/10</span>
                          </div>
                          <Progress value={50} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Should c-bet for value and protection</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Turn</span>
                            <span className="font-mono font-semibold text-destructive">4/10</span>
                          </div>
                          <Progress value={40} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Passive play loses value</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>River</span>
                            <span className="font-mono font-semibold text-accent">6/10</span>
                          </div>
                          <Progress value={60} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Call is correct, but shouldn't be in this spot</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Key Mistakes</h4>
                      <div className="space-y-2">
                        <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded">
                          <span className="text-destructive text-xl">1</span>
                          <div>
                            <h5 className="font-semibold text-sm text-destructive">Flop Check</h5>
                            <p className="text-xs text-muted-foreground">
                              Should continuation bet for value and protection with top pair
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded">
                          <span className="text-destructive text-xl">2</span>
                          <div>
                            <h5 className="font-semibold text-sm text-destructive">Turn Check</h5>
                            <p className="text-xs text-muted-foreground">
                              Should consider betting or check-raising to define villain's range
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded">
                          <span className="text-destructive text-xl">3</span>
                          <div>
                            <h5 className="font-semibold text-sm text-destructive">Passive Line</h5>
                            <p className="text-xs text-muted-foreground">
                              Checking twice allowed villain to control action and put hero in difficult spot
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">What Would Be Better</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                          <h5 className="font-semibold text-sm text-accent mb-1">Flop</h5>
                          <p className="text-xs text-muted-foreground">
                            Bet 1,400-1,600 (60-70% pot) for value and protection. This builds the pot and charges draws.
                          </p>
                        </div>
                        <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                          <h5 className="font-semibold text-sm text-accent mb-1">Turn</h5>
                          <p className="text-xs text-muted-foreground">
                            If villain calls flop bet, hero can bet again for value or check-call depending on villain's tendencies.
                          </p>
                        </div>
                        <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                          <h5 className="font-semibold text-sm text-accent mb-1">River</h5>
                          <p className="text-xs text-muted-foreground">
                            Hero wouldn't face this difficult decision if the hand was played more aggressively earlier.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">The Bottom Line</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Hero played this hand too passively from the start, which allowed villain to control the action and put hero in a difficult river spot. The river call is correct given the pot odds, but better play on earlier streets would have either built a bigger pot (if hero is ahead) or allowed hero to fold earlier (if hero is behind).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Pot Odds Calculator Card */}
            <Card 
              className="bg-card border-border"
              style={{
                backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/X1F9AFyeGpOrfmKOxPNlIi/sandbox/DzCqIvhu85aHghSC3lC6lM-img-4_1770192261000_na1fn_ZGVjaXNpb24tbWF0cml4LWJn.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvWDFGOUFGeWVHcE9yZm1LT3hQTmxJaS9zYW5kYm94L0R6Q3FJdmh1ODVhSGdoU0MzbEM2bE0taW1nLTRfMTc3MDE5MjI2MTAwMF9uYTFmbl9aR1ZqYVhOcGIyNHRiV0YwY21sNExXSm4ucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=MHJyZkVEwJbsgeNVgTQXAnUscuypaVebZbheEEu~vpt5U~tEswxA0QFjesBhn~of7awDaHIZpR3WUwGtsOlh-IG9~iiLsu0zojjDDFy0IEBlC9ukw2mYEPyFFJTD61TsY0Ev9UTJ-SthdcAJkMS0uIT3oJpYdFLoFmHvAKrOZi3aiTDZhQRyzv2G2pkZdsWzEoqmMjW1Zyt8rtgbcs2IXCRCGLfx8AH6OBGXwidd9pzzh3kac0T0mAnueLkbziArgmtH1zCiZVoZZ-Io7AyDiwA-yLs1uEn3a3u2ybXdQzPIILEESHfv4PU-eNv6qz0sBagZJVyHIEKske44uK2CAQ__')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="bg-background/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-accent">♣</span>
                    Quick Reference: Pot Odds
                  </CardTitle>
                  <CardDescription>Understanding the mathematics of poker decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold font-mono text-accent mb-1">2:1</div>
                      <div className="text-xs text-muted-foreground">Need 33% equity</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold font-mono text-accent mb-1">3:1</div>
                      <div className="text-xs text-muted-foreground">Need 25% equity</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold font-mono text-accent mb-1">4:1</div>
                      <div className="text-xs text-muted-foreground">Need 20% equity</div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-2xl text-accent">♠</span>
              <span className="text-sm">Poker Hand Analyzer</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Professional analysis for serious players
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
