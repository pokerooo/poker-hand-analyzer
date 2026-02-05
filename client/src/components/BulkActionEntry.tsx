import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseBulkActions, BulkAction } from "@/utils/pokerUtils";
import { AlertCircle, Check } from "lucide-react";

interface BulkActionEntryProps {
  onApply: (actions: BulkAction[]) => void;
  onCancel: () => void;
}

export function BulkActionEntry({ onApply, onCancel }: BulkActionEntryProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const result = parseBulkActions(text);
    
    if (!result.success) {
      setError(result.error || "Invalid format");
      return;
    }

    if (result.actions) {
      onApply(result.actions);
      setText("");
      setError(null);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Quick Entry Mode</CardTitle>
        <CardDescription>
          Enter multiple actions at once using this format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-2">
          <p className="font-semibold">Format:</p>
          <code className="block text-xs">POSITION ACTION [AMOUNT], POSITION ACTION [AMOUNT], ...</code>
          <p className="text-muted-foreground text-xs mt-2">Example:</p>
          <code className="block text-xs text-accent">
            UTG fold, UTG+1 raise 800, MP call 800, CO fold
          </code>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Enter Actions</label>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="UTG fold, UTG+1 raise 800, MP call 800"
            className="min-h-[100px] font-mono text-sm"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-1">
          <p className="font-semibold mb-1">Valid Actions:</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li><code>fold</code> - Fold (no amount needed)</li>
            <li><code>check</code> - Check (no amount needed)</li>
            <li><code>call AMOUNT</code> - Call with amount</li>
            <li><code>bet AMOUNT</code> - Bet with amount</li>
            <li><code>raise AMOUNT</code> - Raise to amount</li>
            <li><code>allin</code> - All-in (no amount needed)</li>
          </ul>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Check className="mr-2 h-4 w-4" />
            Apply Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
