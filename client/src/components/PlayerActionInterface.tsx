import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface PlayerAction {
  player: string;
  action: "fold" | "check" | "call" | "bet" | "raise" | "allin";
  amount?: number;
}

interface PlayerActionInterfaceProps {
  currentPlayer: string;
  currentPot: number;
  lastBet: number;
  onAction: (action: PlayerAction) => void;
  disabled?: boolean;
}

export function PlayerActionInterface({
  currentPlayer,
  currentPot,
  lastBet,
  onAction,
  disabled = false,
}: PlayerActionInterfaceProps) {
  const [betAmount, setBetAmount] = useState<string>("");
  const [raiseAmount, setRaiseAmount] = useState<string>("");

  const handleAction = (actionType: PlayerAction["action"], amount?: number) => {
    onAction({
      player: currentPlayer,
      action: actionType,
      amount,
    });
    // Reset inputs after action
    setBetAmount("");
    setRaiseAmount("");
  };

  const canCheck = lastBet === 0;
  const canCall = lastBet > 0;
  const callAmount = lastBet;

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Current Player Info */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Current Player:</span>
            <span className="font-mono font-bold text-accent">{currentPlayer}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Pot:</span>
            <span className="font-mono font-semibold">{currentPot}</span>
          </div>
          {lastBet > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">To Call:</span>
              <span className="font-mono font-semibold text-accent">{lastBet}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Row 1: Fold, Check/Call */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                onClick={() => handleAction("fold")}
                disabled={disabled}
                className="w-full"
              >
                Fold
              </Button>
              {canCheck ? (
                <Button
                  variant="outline"
                  onClick={() => handleAction("check")}
                  disabled={disabled}
                  className="w-full"
                >
                  Check
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleAction("call", callAmount)}
                  disabled={disabled}
                  className="w-full"
                >
                  Call {callAmount}
                </Button>
              )}
            </div>

            {/* Row 2: Bet */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Bet amount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={disabled || lastBet > 0}
                  className="flex-1"
                  min="0"
                />
                <Button
                  variant="default"
                  onClick={() => {
                    const amount = parseInt(betAmount);
                    if (amount > 0) {
                      handleAction("bet", amount);
                    }
                  }}
                  disabled={disabled || !betAmount || lastBet > 0}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Bet
                </Button>
              </div>
              {lastBet > 0 && (
                <p className="text-xs text-muted-foreground">
                  Cannot bet - there's already a bet to call
                </p>
              )}
            </div>

            {/* Row 3: Raise */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Raise to (min: ${lastBet * 2})`}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  disabled={disabled || lastBet === 0}
                  className="flex-1"
                  min={lastBet * 2}
                />
                <Button
                  variant="default"
                  onClick={() => {
                    const amount = parseInt(raiseAmount);
                    if (amount >= lastBet * 2) {
                      handleAction("raise", amount);
                    }
                  }}
                  disabled={disabled || !raiseAmount || lastBet === 0}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Raise
                </Button>
              </div>
              {lastBet === 0 && (
                <p className="text-xs text-muted-foreground">
                  Cannot raise - no bet to raise
                </p>
              )}
            </div>

            {/* Row 4: All-In */}
            <Button
              variant="outline"
              onClick={() => handleAction("allin")}
              disabled={disabled}
              className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              All-In
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionHistoryProps {
  actions: PlayerAction[];
}

export function ActionHistory({ actions }: ActionHistoryProps) {
  if (actions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No actions yet. Select an action above to begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold mb-3">Action History</h4>
          {actions.map((action, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
            >
              <span className="font-mono">{action.player}</span>
              <span className="flex items-center gap-2">
                <span
                  className={`font-semibold ${
                    action.action === "fold"
                      ? "text-destructive"
                      : action.action === "check"
                      ? "text-muted-foreground"
                      : "text-accent"
                  }`}
                >
                  {action.action.charAt(0).toUpperCase() + action.action.slice(1)}
                </span>
                {action.amount && (
                  <span className="font-mono text-accent">{action.amount}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
