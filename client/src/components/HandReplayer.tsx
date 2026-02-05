import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

interface HandReplayerProps {
  hand: any; // Full hand object with all data
}

interface ReplayStep {
  type: 'deal_hero' | 'preflop_action' | 'deal_flop' | 'flop_action' | 'deal_turn' | 'turn_action' | 'deal_river' | 'river_action' | 'showdown';
  description: string;
  cards?: string[];
  action?: { player: string; type: string; amount?: number };
  pot?: number;
}

export function HandReplayer({ hand }: HandReplayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5x, 1x, 2x
  
  // Build replay timeline
  const steps: ReplayStep[] = [];
  
  // Step 1: Deal hero cards
  steps.push({
    type: 'deal_hero',
    description: `Hero dealt ${hand.heroCard1} ${hand.heroCard2} at ${hand.heroPosition}`,
    cards: [hand.heroCard1, hand.heroCard2]
  });
  
  // Step 2: Preflop actions
  if (hand.preflopActions) {
    try {
      const preflopActions = JSON.parse(hand.preflopActions);
      preflopActions.forEach((action: any) => {
        steps.push({
          type: 'preflop_action',
          description: `${action.player} ${action.action}${action.amount ? ` ${action.amount}` : ''}`,
          action: { player: action.player, type: action.action, amount: action.amount }
        });
      });
    } catch (e) {
      // Handle parsing error
    }
  }
  
  // Step 3: Deal flop
  if (hand.flopCard1) {
    steps.push({
      type: 'deal_flop',
      description: `Flop: ${hand.flopCard1} ${hand.flopCard2} ${hand.flopCard3}`,
      cards: [hand.flopCard1, hand.flopCard2, hand.flopCard3]
    });
    
    // Flop actions
    if (hand.flopActions) {
      try {
        const flopActions = JSON.parse(hand.flopActions);
        flopActions.forEach((action: any) => {
          steps.push({
            type: 'flop_action',
            description: `${action.player} ${action.action}${action.amount ? ` ${action.amount}` : ''}`,
            action: { player: action.player, type: action.action, amount: action.amount }
          });
        });
      } catch (e) {
        // Handle parsing error
      }
    }
  }
  
  // Step 4: Deal turn
  if (hand.turnCard) {
    steps.push({
      type: 'deal_turn',
      description: `Turn: ${hand.turnCard}`,
      cards: [hand.turnCard]
    });
    
    // Turn actions
    if (hand.turnActions) {
      try {
        const turnActions = JSON.parse(hand.turnActions);
        turnActions.forEach((action: any) => {
          steps.push({
            type: 'turn_action',
            description: `${action.player} ${action.action}${action.amount ? ` ${action.amount}` : ''}`,
            action: { player: action.player, type: action.action, amount: action.amount }
          });
        });
      } catch (e) {
        // Handle parsing error
      }
    }
  }
  
  // Step 5: Deal river
  if (hand.riverCard) {
    steps.push({
      type: 'deal_river',
      description: `River: ${hand.riverCard}`,
      cards: [hand.riverCard]
    });
    
    // River actions
    if (hand.riverActions) {
      try {
        const riverActions = JSON.parse(hand.riverActions);
        riverActions.forEach((action: any) => {
          steps.push({
            type: 'river_action',
            description: `${action.player} ${action.action}${action.amount ? ` ${action.amount}` : ''}`,
            action: { player: action.player, type: action.action, amount: action.amount }
          });
        });
      } catch (e) {
        // Handle parsing error
      }
    }
  }
  
  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500 / speed);
    
    return () => clearInterval(interval);
  }, [isPlaying, speed, steps.length]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [steps.length]);
  
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
  
  const currentStepData = steps[currentStep];
  
  // Determine which cards to show based on current step
  const visibleHeroCards = currentStep >= 0 ? [hand.heroCard1, hand.heroCard2] : [];
  const visibleFlopCards = currentStep >= steps.findIndex(s => s.type === 'deal_flop') && hand.flopCard1
    ? [hand.flopCard1, hand.flopCard2, hand.flopCard3]
    : [];
  const visibleTurnCard = currentStep >= steps.findIndex(s => s.type === 'deal_turn') && hand.turnCard
    ? [hand.turnCard]
    : [];
  const visibleRiverCard = currentStep >= steps.findIndex(s => s.type === 'deal_river') && hand.riverCard
    ? [hand.riverCard]
    : [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hand Replayer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Visualization */}
        <div className="relative bg-green-900/20 border-2 border-green-700/30 rounded-lg p-8 min-h-[400px]">
          {/* Board Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex gap-2">
              {visibleFlopCards.map((card, i) => (
                <div
                  key={`flop-${i}`}
                  className="w-16 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold animate-in fade-in zoom-in duration-300"
                >
                  {formatCard(card)}
                </div>
              ))}
              {visibleTurnCard.map((card, i) => (
                <div
                  key={`turn-${i}`}
                  className="w-16 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold animate-in fade-in zoom-in duration-300"
                >
                  {formatCard(card)}
                </div>
              ))}
              {visibleRiverCard.map((card, i) => (
                <div
                  key={`river-${i}`}
                  className="w-16 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold animate-in fade-in zoom-in duration-300"
                >
                  {formatCard(card)}
                </div>
              ))}
            </div>
            
            {/* Pot Display */}
            <div className="mt-4 text-center">
              <Badge className="bg-yellow-600 text-lg px-4 py-2">
                Pot: {hand.potSize || 0}
              </Badge>
            </div>
          </div>
          
          {/* Hero Cards */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="text-center mb-2">
              <Badge variant="outline">{hand.heroPosition}</Badge>
            </div>
            <div className="flex gap-2">
              {visibleHeroCards.map((card, i) => (
                <div
                  key={`hero-${i}`}
                  className="w-16 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold animate-in fade-in zoom-in duration-300"
                >
                  {formatCard(card)}
                </div>
              ))}
            </div>
          </div>
          
          {/* Current Action Display */}
          {currentStepData && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-full max-w-md">
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-4 text-center animate-in fade-in slide-in-from-top duration-300">
                <p className="font-semibold">{currentStepData.description}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Step {currentStep + 1} / {steps.length}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              title="Reset (R)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              title="Previous (←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              title="Next (→)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            {/* Speed Control */}
            <div className="flex gap-1 ml-4">
              {[0.5, 1, 2].map(s => (
                <Button
                  key={s}
                  variant={speed === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
          
          {/* Action History */}
          <div className="bg-muted/30 rounded-lg p-4 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Action History</p>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded ${
                    i === currentStep
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : i < currentStep
                        ? 'text-muted-foreground'
                        : 'text-foreground/50'
                  }`}
                >
                  {i + 1}. {step.description}
                </div>
              ))}
            </div>
          </div>
          
          {/* Keyboard Shortcuts Help */}
          <div className="text-xs text-muted-foreground text-center">
            <p>
              <kbd className="px-2 py-1 bg-muted rounded">Space</kbd> Play/Pause •{" "}
              <kbd className="px-2 py-1 bg-muted rounded">←</kbd> Previous •{" "}
              <kbd className="px-2 py-1 bg-muted rounded">→</kbd> Next
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
