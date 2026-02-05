import { useAuth } from "@/_core/hooks/useAuth";
import { ActionTracker, type Action } from "@/components/ActionTracker";
import { CardSelector } from "@/components/CardSelector";
import { PositionSelector } from "@/components/PositionSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function HandInput() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Form state
  const [step, setStep] = useState(1);
  const [smallBlind, setSmallBlind] = useState("200");
  const [bigBlind, setBigBlind] = useState("400");
  const [ante, setAnte] = useState("400");
  const [heroPosition, setHeroPosition] = useState<string>("");
  const [heroCard1, setHeroCard1] = useState<string>("");
  const [heroCard2, setHeroCard2] = useState<string>("");
  const [flopCard1, setFlopCard1] = useState<string>("");
  const [flopCard2, setFlopCard2] = useState<string>("");
  const [flopCard3, setFlopCard3] = useState<string>("");
  const [turnCard, setTurnCard] = useState<string>("");
  const [riverCard, setRiverCard] = useState<string>("");
  const [actions, setActions] = useState<Action[]>([]);
  const [title, setTitle] = useState("");

  const createHandMutation = trpc.hands.create.useMutation({
    onSuccess: () => {
      toast.success("Hand saved successfully!");
      setLocation("/archive");
    },
    onError: (error) => {
      toast.error(`Failed to save hand: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please log in to input and analyze hands</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!heroPosition || !heroCard1 || !heroCard2) {
      toast.error("Please complete all required fields");
      return;
    }

    createHandMutation.mutate({
      title: title || undefined,
      smallBlind: parseInt(smallBlind),
      bigBlind: parseInt(bigBlind),
      ante: parseInt(ante),
      heroPosition: heroPosition as any,
      heroCard1,
      heroCard2,
      flopCard1: flopCard1 || undefined,
      flopCard2: flopCard2 || undefined,
      flopCard3: flopCard3 || undefined,
      turnCard: turnCard || undefined,
      riverCard: riverCard || undefined,
      actions,
    });
  };

  const allSelectedCards = [
    heroCard1,
    heroCard2,
    flopCard1,
    flopCard2,
    flopCard3,
    turnCard,
    riverCard,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Input Hand</h1>
                <p className="text-sm text-muted-foreground">
                  Step {step} of 4
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={createHandMutation.isPending || !heroPosition || !heroCard1 || !heroCard2}
              className="gap-2"
            >
              {createHandMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Hand
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={`step${step}`} onValueChange={(v) => setStep(parseInt(v.replace("step", "")))}>
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="step1">Game Info</TabsTrigger>
              <TabsTrigger value="step2">Hero</TabsTrigger>
              <TabsTrigger value="step3">Actions</TabsTrigger>
              <TabsTrigger value="step4">Board</TabsTrigger>
            </TabsList>

            {/* Step 1: Game Info */}
            <TabsContent value="step1">
              <Card>
                <CardHeader>
                  <CardTitle>Game Information</CardTitle>
                  <CardDescription>Enter the blinds and antes for this hand</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title">Hand Title (Optional)</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Tough river decision with ATo"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sb">Small Blind</Label>
                      <Input
                        id="sb"
                        type="number"
                        value={smallBlind}
                        onChange={(e) => setSmallBlind(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bb">Big Blind</Label>
                      <Input
                        id="bb"
                        type="number"
                        value={bigBlind}
                        onChange={(e) => setBigBlind(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ante">Ante</Label>
                      <Input
                        id="ante"
                        type="number"
                        value={ante}
                        onChange={(e) => setAnte(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={() => setStep(2)} className="w-full">
                    Next: Hero Cards
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Hero */}
            <TabsContent value="step2">
              <Card>
                <CardHeader>
                  <CardTitle>Hero Information</CardTitle>
                  <CardDescription>Select your position and hole cards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PositionSelector
                    label="Your Position"
                    value={heroPosition}
                    onChange={setHeroPosition}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <CardSelector
                      label="First Card"
                      value={heroCard1}
                      onChange={setHeroCard1}
                      excludeCards={allSelectedCards}
                    />
                    <CardSelector
                      label="Second Card"
                      value={heroCard2}
                      onChange={setHeroCard2}
                      excludeCards={allSelectedCards}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!heroPosition || !heroCard1 || !heroCard2}
                      className="flex-1"
                    >
                      Next: Actions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Actions */}
            <TabsContent value="step3">
              <Card>
                <CardHeader>
                  <CardTitle>Hand Actions</CardTitle>
                  <CardDescription>Record the action for each street</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="preflop" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="preflop">Preflop</TabsTrigger>
                      <TabsTrigger value="flop">Flop</TabsTrigger>
                      <TabsTrigger value="turn">Turn</TabsTrigger>
                      <TabsTrigger value="river">River</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preflop" className="mt-4">
                      <ActionTracker street="preflop" actions={actions} onChange={setActions} />
                    </TabsContent>
                    <TabsContent value="flop" className="mt-4">
                      <ActionTracker street="flop" actions={actions} onChange={setActions} />
                    </TabsContent>
                    <TabsContent value="turn" className="mt-4">
                      <ActionTracker street="turn" actions={actions} onChange={setActions} />
                    </TabsContent>
                    <TabsContent value="river" className="mt-4">
                      <ActionTracker street="river" actions={actions} onChange={setActions} />
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(4)} className="flex-1">
                      Next: Board Cards
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 4: Board */}
            <TabsContent value="step4">
              <Card>
                <CardHeader>
                  <CardTitle>Board Cards</CardTitle>
                  <CardDescription>Select the community cards (optional)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Flop</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <CardSelector
                        value={flopCard1}
                        onChange={setFlopCard1}
                        excludeCards={allSelectedCards}
                      />
                      <CardSelector
                        value={flopCard2}
                        onChange={setFlopCard2}
                        excludeCards={allSelectedCards}
                      />
                      <CardSelector
                        value={flopCard3}
                        onChange={setFlopCard3}
                        excludeCards={allSelectedCards}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <CardSelector
                      label="Turn"
                      value={turnCard}
                      onChange={setTurnCard}
                      excludeCards={allSelectedCards}
                    />
                    <CardSelector
                      label="River"
                      value={riverCard}
                      onChange={setRiverCard}
                      excludeCards={allSelectedCards}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createHandMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      {createHandMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save Hand
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
