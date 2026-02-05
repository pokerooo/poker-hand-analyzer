import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export type Action = {
  street: "preflop" | "flop" | "turn" | "river";
  player: string;
  action: "fold" | "check" | "call" | "bet" | "raise" | "allin";
  amount?: number;
};

interface ActionTrackerProps {
  street: "preflop" | "flop" | "turn" | "river";
  actions: Action[];
  onChange: (actions: Action[]) => void;
}

export function ActionTracker({ street, actions, onChange }: ActionTrackerProps) {
  const [player, setPlayer] = useState("");
  const [actionType, setActionType] = useState<Action["action"]>("fold");
  const [amount, setAmount] = useState("");

  const streetActions = actions.filter((a) => a.street === street);

  const handleAddAction = () => {
    if (!player.trim()) return;

    const newAction: Action = {
      street,
      player: player.trim(),
      action: actionType,
      amount: amount ? parseInt(amount) : undefined,
    };

    onChange([...actions, newAction]);
    setPlayer("");
    setAmount("");
  };

  const handleRemoveAction = (index: number) => {
    const globalIndex = actions.findIndex(
      (a, i) => a.street === street && actions.slice(0, i + 1).filter((x) => x.street === street).length === index + 1
    );
    if (globalIndex !== -1) {
      onChange(actions.filter((_, i) => i !== globalIndex));
    }
  };

  const needsAmount = actionType === "bet" || actionType === "raise" || actionType === "allin";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`player-${street}`}>Player</Label>
            <Input
              id={`player-${street}`}
              placeholder="e.g., Hero, MP, BTN"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
            />
          </div>
          <div>
            <Label htmlFor={`action-${street}`}>Action</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as Action["action"])}>
              <SelectTrigger id={`action-${street}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fold">Fold</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="bet">Bet</SelectItem>
                <SelectItem value="raise">Raise</SelectItem>
                <SelectItem value="allin">All-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {needsAmount && (
          <div>
            <Label htmlFor={`amount-${street}`}>Amount</Label>
            <Input
              id={`amount-${street}`}
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
            />
          </div>
        )}

        <Button onClick={handleAddAction} className="w-full" size="sm">
          Add Action
        </Button>
      </div>

      {streetActions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Actions:</p>
          <div className="space-y-1">
            {streetActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{action.player}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="capitalize">{action.action}</span>
                  {action.amount && (
                    <span className="font-mono text-accent">{action.amount}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAction(index)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
