import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseHandHistory, type ParsedHandHistory } from "@/utils/handHistoryParser";

type HandHistoryImportProps = {
  onImport: (parsedData: ParsedHandHistory) => void;
  onCancel: () => void;
};

export default function HandHistoryImport({ onImport, onCancel }: HandHistoryImportProps) {
  const [inputText, setInputText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedHandHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleParse = (text: string) => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      const parsed = parseHandHistory(text);
      setParsedData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse hand history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClick = () => {
    if (parsedData) {
      onImport(parsedData);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent" />
              Import Hand History
            </CardTitle>
            <CardDescription>
              Upload a hand history file or paste the text from PokerStars or GGPoker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div>
              <label htmlFor="file-upload" className="block text-sm font-semibold mb-2">
                Upload File (.txt)
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="relative"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="text-sm text-muted-foreground">
                  or paste text below
                </span>
              </div>
            </div>

            {/* Text Input */}
            <div>
              <label htmlFor="hand-text" className="block text-sm font-semibold mb-2">
                Paste Hand History
              </label>
              <Textarea
                id="hand-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your hand history here...&#10;&#10;Example:&#10;PokerStars Hand #123456789: Hold'em No Limit ($0.50/$1.00)&#10;Table 'Example' 9-max Seat #3 is the button&#10;..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Parse Button */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleParse(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? "Parsing..." : "Parse Hand History"}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Display with Preview */}
            {parsedData && (
              <div className="space-y-4">
                <Alert className="bg-accent/10 border-accent/30">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-accent">
                    Hand history parsed successfully! Review the data below and click Import to continue.
                  </AlertDescription>
                </Alert>

                <Card className="bg-muted/30 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Parsed Data Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Game Info */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Game Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Site:</span>{" "}
                          <span className="font-mono">{parsedData.site}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Blinds:</span>{" "}
                          <span className="font-mono">
                            {parsedData.smallBlind}/{parsedData.bigBlind}
                          </span>
                        </div>
                        {parsedData.ante && (
                          <div>
                            <span className="text-muted-foreground">Ante:</span>{" "}
                            <span className="font-mono">{parsedData.ante}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hero Info */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Hero</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Position:</span>{" "}
                          <span className="font-mono font-semibold text-accent">
                            {parsedData.heroPosition}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cards:</span>{" "}
                          <span className="font-mono font-semibold">
                            {parsedData.heroCards.join(" ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Board */}
                    {parsedData.flopCards && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Board</h4>
                        <div className="flex gap-2 text-sm font-mono">
                          {parsedData.flopCards.map((card, idx) => (
                            <span key={idx} className="px-2 py-1 bg-card rounded">
                              {card}
                            </span>
                          ))}
                          {parsedData.turnCard && (
                            <span className="px-2 py-1 bg-card rounded">
                              {parsedData.turnCard}
                            </span>
                          )}
                          {parsedData.riverCard && (
                            <span className="px-2 py-1 bg-card rounded">
                              {parsedData.riverCard}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Summary */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Actions</h4>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Preflop:</span>{" "}
                          <span className="font-mono">{parsedData.preflopActions.length}</span>
                        </div>
                        {parsedData.flopActions && (
                          <div>
                            <span className="text-muted-foreground">Flop:</span>{" "}
                            <span className="font-mono">{parsedData.flopActions.length}</span>
                          </div>
                        )}
                        {parsedData.turnActions && (
                          <div>
                            <span className="text-muted-foreground">Turn:</span>{" "}
                            <span className="font-mono">{parsedData.turnActions.length}</span>
                          </div>
                        )}
                        {parsedData.riverActions && (
                          <div>
                            <span className="text-muted-foreground">River:</span>{" "}
                            <span className="font-mono">{parsedData.riverActions.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Import Button */}
                <Button onClick={handleImportClick} className="w-full" size="lg">
                  Import Hand Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
