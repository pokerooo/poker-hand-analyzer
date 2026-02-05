import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import VisualCardSelector from "@/components/VisualCardSelector";
import { PlayerActionInterface, ActionHistory, PlayerAction as ActionData } from "@/components/PlayerActionInterface";

type Position = "UTG" | "UTG+1" | "UTG+2" | "MP" | "MP+1" | "CO" | "BTN" | "SB" | "BB";
type Action = "fold" | "check" | "call" | "bet" | "raise" | "allin";

interface PlayerAction {
  position: Position;
  action: Action;
  amount?: number;
}

interface HandState {
  // Game setup
  smallBlind: number;
  bigBlind: number;
  ante: number;
  
  // Hero info
  heroPosition: Position | null;
  heroCard1: string;
  heroCard2: string;
  
  // Actions by street
  preflopActions: PlayerAction[];
  flopActions: PlayerAction[];
  turnActions: PlayerAction[];
  riverActions: PlayerAction[];
  
  // Board cards
  flopCard1: string;
  flopCard2: string;
  flopCard3: string;
  turnCard: string;
  riverCard: string;
  
  // Active players (not folded)
  activePlayers: Position[];
}

const POSITIONS: Position[] = ["UTG", "UTG+1", "UTG+2", "MP", "MP+1", "CO", "BTN", "SB", "BB"];

export default function HandInputSequential() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [handState, setHandState] = useState<HandState>({
    smallBlind: 200,
    bigBlind: 400,
    ante: 0,
    heroPosition: null,
    heroCard1: "",
    heroCard2: "",
    preflopActions: [],
    flopActions: [],
    turnActions: [],
    riverActions: [],
    flopCard1: "",
    flopCard2: "",
    flopCard3: "",
    turnCard: "",
    riverCard: "",
    activePlayers: [...POSITIONS],
  });

  const createMutation = trpc.hands.create.useMutation({
    onSuccess: () => {
      toast.success("Hand saved successfully!");
      setLocation("/archive");
    },
    onError: (error) => {
      toast.error(`Failed to save hand: ${error.message}`);
    },
  });

  const formatCard = (card: string) => {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitSymbol = { h: "♥", d: "♦", s: "♠", c: "♣" }[suit] || suit;
    const suitColor = suit === "h" || suit === "d" ? "text-red-500" : "";
    return (
      <span className={suitColor}>
        {rank}
        {suitSymbol}
      </span>
    );
  };

  const handleNext = () => {
    // Validation
    if (step === 1 && (!handState.smallBlind || !handState.bigBlind)) {
      toast.error("Please enter blinds");
      return;
    }
    if (step === 2 && (!handState.heroPosition || !handState.heroCard1 || !handState.heroCard2)) {
      toast.error("Please select your position and cards");
      return;
    }
    if (step === 4 && (!handState.flopCard1 || !handState.flopCard2 || !handState.flopCard3)) {
      toast.error("Please select all 3 flop cards");
      return;
    }
    if (step === 6 && !handState.turnCard) {
      toast.error("Please select the turn card");
      return;
    }
    if (step === 8 && !handState.riverCard) {
      toast.error("Please select the river card");
      return;
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!handState.heroPosition) {
      toast.error("Invalid hand data");
      return;
    }

    createMutation.mutate({
      title: `${handState.heroPosition} Hand`,
      smallBlind: handState.smallBlind,
      bigBlind: handState.bigBlind,
      ante: handState.ante,
      heroPosition: handState.heroPosition,
      heroCard1: handState.heroCard1,
      heroCard2: handState.heroCard2,
      flopCard1: handState.flopCard1 || undefined,
      flopCard2: handState.flopCard2 || undefined,
      flopCard3: handState.flopCard3 || undefined,
      turnCard: handState.turnCard || undefined,
      riverCard: handState.riverCard || undefined,
      actions: [
        ...handState.preflopActions.map(a => ({ street: 'preflop' as const, player: a.position, action: a.action, amount: a.amount })),
        ...handState.flopActions.map(a => ({ street: 'flop' as const, player: a.position, action: a.action, amount: a.amount })),
        ...handState.turnActions.map(a => ({ street: 'turn' as const, player: a.position, action: a.action, amount: a.amount })),
        ...handState.riverActions.map(a => ({ street: 'river' as const, player: a.position, action: a.action, amount: a.amount })),
      ],
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to input hands.</CardDescription>
          </CardHeader>
        </Card>
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
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-accent text-2xl">♠</span>
              <h1 className="text-2xl font-bold">Input Hand</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {step} of 10
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(step / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Game Setup */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Game Setup</CardTitle>
              <CardDescription>Enter the blinds and ante for this hand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Small Blind</label>
                  <Input
                    type="number"
                    value={handState.smallBlind}
                    onChange={(e) =>
                      setHandState({ ...handState, smallBlind: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Big Blind</label>
                  <Input
                    type="number"
                    value={handState.bigBlind}
                    onChange={(e) =>
                      setHandState({ ...handState, bigBlind: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Ante (Optional)</label>
                  <Input
                    type="number"
                    value={handState.ante}
                    onChange={(e) =>
                      setHandState({ ...handState, ante: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext}>
                  Next: Your Position
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Hero Position & Cards */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Position</CardTitle>
                <CardDescription>Select where you're sitting at the table</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {POSITIONS.map((pos) => (
                    <Button
                      key={pos}
                      variant={handState.heroPosition === pos ? "default" : "outline"}
                      onClick={() => setHandState({ ...handState, heroPosition: pos })}
                      className="h-16"
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <VisualCardSelector
              label="First Card"
              value={handState.heroCard1}
              onChange={(card) => setHandState({ ...handState, heroCard1: card })}
            />

            <VisualCardSelector
              label="Second Card"
              value={handState.heroCard2}
              onChange={(card) => setHandState({ ...handState, heroCard2: card })}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Preflop Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preflop Actions */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preflop Action</CardTitle>
                <CardDescription>
                  You have {formatCard(handState.heroCard1)} {formatCard(handState.heroCard2)} in{" "}
                  {handState.heroPosition}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Record each player's action in order. Select a player below and record their action.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Player</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map((pos) => (
                      <Button
                        key={pos}
                        variant={handState.activePlayers.includes(pos) ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => {
                          // Set this as current player for action
                          const currentPot = handState.smallBlind + handState.bigBlind + (handState.ante * 9);
                          const lastBet = handState.preflopActions.length > 0 
                            ? Math.max(...handState.preflopActions.filter(a => a.amount).map(a => a.amount || 0), handState.bigBlind)
                            : handState.bigBlind;
                          // Store current player in a temporary state if needed
                        }}
                        disabled={!handState.activePlayers.includes(pos)}
                      >
                        {pos}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <PlayerActionInterface
              currentPlayer={handState.heroPosition || "UTG"}
              currentPot={handState.smallBlind + handState.bigBlind + (handState.ante * 9)}
              lastBet={handState.preflopActions.length > 0 
                ? Math.max(...handState.preflopActions.filter(a => a.amount).map(a => a.amount || 0), handState.bigBlind)
                : handState.bigBlind}
              onAction={(action: ActionData) => {
                const newAction: PlayerAction = {
                  position: action.player as Position,
                  action: action.action,
                  amount: action.amount,
                };
                setHandState({
                  ...handState,
                  preflopActions: [...handState.preflopActions, newAction],
                  activePlayers: action.action === "fold" 
                    ? handState.activePlayers.filter(p => p !== action.player)
                    : handState.activePlayers,
                });
              }}
            />

            <ActionHistory 
              actions={handState.preflopActions.map(a => ({
                player: a.position,
                action: a.action,
                amount: a.amount,
              }))}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Flop Cards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Flop Cards */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Flop Cards</CardTitle>
                <CardDescription>Select the 3 cards that came on the flop</CardDescription>
              </CardHeader>
            </Card>

            <VisualCardSelector
              label="First Flop Card"
              value={handState.flopCard1}
              onChange={(card) => setHandState({ ...handState, flopCard1: card })}
            />

            <VisualCardSelector
              label="Second Flop Card"
              value={handState.flopCard2}
              onChange={(card) => setHandState({ ...handState, flopCard2: card })}
            />

            <VisualCardSelector
              label="Third Flop Card"
              value={handState.flopCard3}
              onChange={(card) => setHandState({ ...handState, flopCard3: card })}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Flop Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Flop Actions */}
        {step === 5 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Flop Action</CardTitle>
                <CardDescription>
                  Board: {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                  {formatCard(handState.flopCard3)}
                </CardDescription>
              </CardHeader>
            </Card>

            <PlayerActionInterface
              currentPlayer={handState.heroPosition || "UTG"}
              currentPot={handState.smallBlind + handState.bigBlind + (handState.ante * 9) + 
                handState.preflopActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0)}
              lastBet={handState.flopActions.length > 0 
                ? Math.max(...handState.flopActions.filter(a => a.amount).map(a => a.amount || 0), 0)
                : 0}
              onAction={(action: ActionData) => {
                const newAction: PlayerAction = {
                  position: action.player as Position,
                  action: action.action,
                  amount: action.amount,
                };
                setHandState({
                  ...handState,
                  flopActions: [...handState.flopActions, newAction],
                  activePlayers: action.action === "fold" 
                    ? handState.activePlayers.filter(p => p !== action.player)
                    : handState.activePlayers,
                });
              }}
            />

            <ActionHistory 
              actions={handState.flopActions.map(a => ({
                player: a.position,
                action: a.action,
                amount: a.amount,
              }))}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Turn Card
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Turn Card */}
        {step === 6 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Turn Card</CardTitle>
                <CardDescription>
                  Board so far: {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                  {formatCard(handState.flopCard3)}
                </CardDescription>
              </CardHeader>
            </Card>

            <VisualCardSelector
              label="Turn Card"
              value={handState.turnCard}
              onChange={(card) => setHandState({ ...handState, turnCard: card })}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Turn Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 7: Turn Actions */}
        {step === 7 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Turn Action</CardTitle>
                <CardDescription>
                  Board: {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                  {formatCard(handState.flopCard3)} {formatCard(handState.turnCard)}
                </CardDescription>
              </CardHeader>
            </Card>

            <PlayerActionInterface
              currentPlayer={handState.heroPosition || "UTG"}
              currentPot={handState.smallBlind + handState.bigBlind + (handState.ante * 9) + 
                handState.preflopActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0) +
                handState.flopActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0)}
              lastBet={handState.turnActions.length > 0 
                ? Math.max(...handState.turnActions.filter(a => a.amount).map(a => a.amount || 0), 0)
                : 0}
              onAction={(action: ActionData) => {
                const newAction: PlayerAction = {
                  position: action.player as Position,
                  action: action.action,
                  amount: action.amount,
                };
                setHandState({
                  ...handState,
                  turnActions: [...handState.turnActions, newAction],
                  activePlayers: action.action === "fold" 
                    ? handState.activePlayers.filter(p => p !== action.player)
                    : handState.activePlayers,
                });
              }}
            />

            <ActionHistory 
              actions={handState.turnActions.map(a => ({
                player: a.position,
                action: a.action,
                amount: a.amount,
              }))}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: River Card
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 8: River Card */}
        {step === 8 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>River Card</CardTitle>
                <CardDescription>
                  Board so far: {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                  {formatCard(handState.flopCard3)} {formatCard(handState.turnCard)}
                </CardDescription>
              </CardHeader>
            </Card>

            <VisualCardSelector
              label="River Card"
              value={handState.riverCard}
              onChange={(card) => setHandState({ ...handState, riverCard: card })}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: River Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 9: River Actions */}
        {step === 9 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>River Action</CardTitle>
                <CardDescription>
                  Final Board: {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                  {formatCard(handState.flopCard3)} {formatCard(handState.turnCard)}{" "}
                  {formatCard(handState.riverCard)}
                </CardDescription>
              </CardHeader>
            </Card>

            <PlayerActionInterface
              currentPlayer={handState.heroPosition || "UTG"}
              currentPot={handState.smallBlind + handState.bigBlind + (handState.ante * 9) + 
                handState.preflopActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0) +
                handState.flopActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0) +
                handState.turnActions.filter(a => a.amount).reduce((sum, a) => sum + (a.amount || 0), 0)}
              lastBet={handState.riverActions.length > 0 
                ? Math.max(...handState.riverActions.filter(a => a.amount).map(a => a.amount || 0), 0)
                : 0}
              onAction={(action: ActionData) => {
                const newAction: PlayerAction = {
                  position: action.player as Position,
                  action: action.action,
                  amount: action.amount,
                };
                setHandState({
                  ...handState,
                  riverActions: [...handState.riverActions, newAction],
                  activePlayers: action.action === "fold" 
                    ? handState.activePlayers.filter(p => p !== action.player)
                    : handState.activePlayers,
                });
              }}
            />

            <ActionHistory 
              actions={handState.riverActions.map(a => ({
                player: a.position,
                action: a.action,
                amount: a.amount,
              }))}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next: Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 10: Review & Submit */}
        {step === 10 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Hand</CardTitle>
              <CardDescription>Check your hand details before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Game Info</h3>
                  <div className="text-sm text-muted-foreground">
                    Blinds: {handState.smallBlind}/{handState.bigBlind}
                    {handState.ante > 0 && ` (Ante: ${handState.ante})`}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Your Hand</h3>
                  <div className="text-sm">
                    Position: <Badge>{handState.heroPosition}</Badge>
                  </div>
                  <div className="text-lg font-mono mt-2">
                    {formatCard(handState.heroCard1)} {formatCard(handState.heroCard2)}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Board</h3>
                  <div className="text-lg font-mono">
                    {formatCard(handState.flopCard1)} {formatCard(handState.flopCard2)}{" "}
                    {formatCard(handState.flopCard3)} {formatCard(handState.turnCard)}{" "}
                    {formatCard(handState.riverCard)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-accent text-accent-foreground"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Submit Hand
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
