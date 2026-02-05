import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { parseHandHistory, type ParsedHandHistory } from "@/utils/handHistoryParser";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type BatchHandHistoryImportProps = {
  onComplete: (successCount: number, failCount: number) => void;
  onCancel: () => void;
};

export default function BatchHandHistoryImport({ onComplete, onCancel }: BatchHandHistoryImportProps) {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: [],
  });

  const createHandMutation = trpc.hands.create.useMutation();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Read all files
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        })
      );
    }

    Promise.all(readers).then((texts) => {
      setInputText(texts.join("\n\n---\n\n"));
    });
  };

  const splitHandHistories = (text: string): string[] => {
    // Split by common hand separators
    const hands: string[] = [];
    
    // Try splitting by PokerStars/GGPoker hand markers
    const pokerstarsHands = text.split(/(?=PokerStars Hand #|GGPoker Hand #)/);
    
    if (pokerstarsHands.length > 1) {
      return pokerstarsHands.filter(h => h.trim().length > 0);
    }
    
    // Try splitting by common separators
    const separatedHands = text.split(/\n\n---\n\n|\n\n\n/);
    return separatedHands.filter(h => h.trim().length > 0);
  };

  const handleBatchImport = async () => {
    if (!inputText.trim()) {
      toast.error("Please paste hand histories");
      return;
    }

    setIsProcessing(true);
    setResults({ success: 0, failed: 0, errors: [] });
    setProgress(0);

    const handTexts = splitHandHistories(inputText);
    const total = handTexts.length;

    if (total === 0) {
      toast.error("No valid hand histories found");
      setIsProcessing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < handTexts.length; i++) {
      try {
        // Parse hand history
        const parsed = parseHandHistory(handTexts[i]);
        
        // Convert to hand creation format
        const actions = [
          ...parsed.preflopActions.map(a => ({
            street: "preflop" as const,
            player: a.player,
            action: a.action,
            amount: a.amount,
          })),
          ...(parsed.flopActions?.map(a => ({
            street: "flop" as const,
            player: a.player,
            action: a.action,
            amount: a.amount,
          })) || []),
          ...(parsed.turnActions?.map(a => ({
            street: "turn" as const,
            player: a.player,
            action: a.action,
            amount: a.amount,
          })) || []),
          ...(parsed.riverActions?.map(a => ({
            street: "river" as const,
            player: a.player,
            action: a.action,
            amount: a.amount,
          })) || []),
        ];

        // Create hand
        await createHandMutation.mutateAsync({
          title: `${parsed.site} - ${parsed.heroPosition} Hand`,
          smallBlind: parsed.smallBlind,
          bigBlind: parsed.bigBlind,
          ante: parsed.ante || 0,
          heroPosition: parsed.heroPosition as any,
          heroCard1: parsed.heroCards[0]?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c') || '',
          heroCard2: parsed.heroCards[1]?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c') || '',
          flopCard1: parsed.flopCards?.[0]?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c'),
          flopCard2: parsed.flopCards?.[1]?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c'),
          flopCard3: parsed.flopCards?.[2]?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c'),
          turnCard: parsed.turnCard?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c'),
          riverCard: parsed.riverCard?.replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c'),
          actions,
        });

        successCount++;
      } catch (err) {
        failCount++;
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Hand ${i + 1}: ${errorMsg}`);
      }

      setProgress(((i + 1) / total) * 100);
      setResults({ success: successCount, failed: failCount, errors });
    }

    setIsProcessing(false);
    toast.success(`Batch import complete: ${successCount} succeeded, ${failCount} failed`);
    
    // Auto-close after 3 seconds if all succeeded
    if (failCount === 0) {
      setTimeout(() => {
        onComplete(successCount, failCount);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent" />
              Batch Import Hand Histories
            </CardTitle>
            <CardDescription>
              Import multiple hands at once from PokerStars or GGPoker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isProcessing && results.success === 0 && results.failed === 0 && (
              <>
                {/* File Upload */}
                <div>
                  <label htmlFor="batch-file-upload" className="block text-sm font-semibold mb-2">
                    Upload Multiple Files (.txt)
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="relative"
                      onClick={() => document.getElementById('batch-file-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Files
                    </Button>
                    <input
                      id="batch-file-upload"
                      type="file"
                      accept=".txt"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <span className="text-sm text-muted-foreground">
                      or paste multiple hands below
                    </span>
                  </div>
                </div>

                {/* Text Input */}
                <div>
                  <label htmlFor="batch-hand-text" className="block text-sm font-semibold mb-2">
                    Paste Multiple Hand Histories
                  </label>
                  <Textarea
                    id="batch-hand-text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste multiple hand histories here (separated by blank lines)...&#10;&#10;PokerStars Hand #123...&#10;&#10;PokerStars Hand #456..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: Each hand should start with "PokerStars Hand #" or "GGPoker Hand #"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleBatchImport}
                    disabled={!inputText.trim()}
                    className="flex-1"
                  >
                    Import All Hands
                  </Button>
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="space-y-4">
                <Alert className="bg-accent/10 border-accent/30">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <AlertDescription className="text-accent">
                    Processing hand histories... {Math.round(progress)}% complete
                  </AlertDescription>
                </Alert>
                <Progress value={progress} className="h-2" />
                <div className="text-sm text-muted-foreground text-center">
                  {results.success} succeeded, {results.failed} failed
                </div>
              </div>
            )}

            {/* Results Display */}
            {!isProcessing && (results.success > 0 || results.failed > 0) && (
              <div className="space-y-4">
                <Alert className="bg-accent/10 border-accent/30">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-accent">
                    Batch import complete! {results.success} hands imported successfully.
                    {results.failed > 0 && ` ${results.failed} hands failed.`}
                  </AlertDescription>
                </Alert>

                {/* Error List */}
                {results.errors.length > 0 && (
                  <Card className="bg-destructive/10 border-destructive/30">
                    <CardHeader>
                      <CardTitle className="text-sm text-destructive">Errors ({results.errors.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {results.errors.map((error, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground font-mono">
                            {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Done Button */}
                <Button
                  onClick={() => onComplete(results.success, results.failed)}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
