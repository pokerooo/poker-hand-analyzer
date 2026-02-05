import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

type Platform = "instagram" | "twitter" | "tiktok" | "whatsapp";

type SocialMediaExportProps = {
  hand: any;
  onClose: () => void;
};

const PLATFORM_SPECS = {
  instagram: { width: 1080, height: 1920, name: "Instagram Reels", ratio: "9:16" },
  twitter: { width: 1200, height: 675, name: "X/Twitter", ratio: "16:9" },
  tiktok: { width: 1080, height: 1920, name: "TikTok", ratio: "9:16" },
  whatsapp: { width: 1080, height: 1080, name: "WhatsApp", ratio: "1:1" },
};

export default function SocialMediaExport({ hand, onClose }: SocialMediaExportProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("instagram");
  const [isGenerating, setIsGenerating] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const formatCard = (card: string) => {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitMap: Record<string, string> = { h: "♥", d: "♦", s: "♠", c: "♣" };
    const suitSymbol = suitMap[suit] || suit;
    return `${rank}${suitSymbol}`;
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsGenerating(true);
    try {
      const spec = PLATFORM_SPECS[selectedPlatform];
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#0a0a0a",
        width: spec.width,
        height: spec.height,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `poker-hand-${hand.id}-${selectedPlatform}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const spec = PLATFORM_SPECS[selectedPlatform];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Export for Social Media</CardTitle>
            <CardDescription>Generate platform-optimized images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3">Select Platform</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(PLATFORM_SPECS) as Platform[]).map((platform) => (
                  <Button
                    key={platform}
                    variant={selectedPlatform === platform ? "default" : "outline"}
                    onClick={() => setSelectedPlatform(platform)}
                    className="flex flex-col h-auto py-4"
                  >
                    <span className="font-semibold">{PLATFORM_SPECS[platform].name}</span>
                    <span className="text-xs opacity-70">{PLATFORM_SPECS[platform].ratio}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-3">Preview</label>
              <div className="flex justify-center bg-muted/30 p-6 rounded-lg">
                <div
                  style={{
                    width: spec.width / 4,
                    height: spec.height / 4,
                    maxWidth: "100%",
                  }}
                  className="bg-background border-2 border-accent/30 rounded-lg overflow-hidden shadow-2xl"
                >
                  <div
                    ref={exportRef}
                    style={{
                      width: spec.width,
                      height: spec.height,
                      transform: "scale(0.25)",
                      transformOrigin: "top left",
                    }}
                    className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-16 flex flex-col"
                  >
                    <div className="text-center mb-12">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <span className="text-8xl">♠</span>
                        <h1 className="text-7xl font-bold text-white">Poker Hand Analysis</h1>
                      </div>
                      <p className="text-4xl text-zinc-400">Professional breakdown</p>
                    </div>
                    <div className="bg-zinc-800/80 backdrop-blur rounded-3xl p-12 mb-8 border-2 border-zinc-700">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-3xl font-semibold text-zinc-400 mb-4">Hero</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-4xl">
                              <span className="text-zinc-300">Position:</span>
                              <span className="font-bold text-yellow-500">{hand.heroPosition}</span>
                            </div>
                            <div className="flex justify-between text-4xl">
                              <span className="text-zinc-300">Cards:</span>
                              <span className="font-bold text-white">
                                {formatCard(hand.heroCard1)} {formatCard(hand.heroCard2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-semibold text-zinc-400 mb-4">Game</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-4xl">
                              <span className="text-zinc-300">Blinds:</span>
                              <span className="font-mono text-white">{hand.smallBlind}/{hand.bigBlind}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {hand.flopCard1 && (
                      <div className="bg-zinc-800/80 backdrop-blur rounded-3xl p-12 mb-8 border-2 border-zinc-700">
                        <h3 className="text-3xl font-semibold text-zinc-400 mb-6">Board</h3>
                        <div className="flex gap-4 justify-center">
                          {[hand.flopCard1, hand.flopCard2, hand.flopCard3, hand.turnCard, hand.riverCard]
                            .filter(Boolean)
                            .map((card: string, idx: number) => (
                              <div
                                key={idx}
                                className="w-32 h-48 bg-white rounded-2xl flex items-center justify-center text-6xl font-bold text-zinc-900 shadow-xl"
                              >
                                {formatCard(card)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="bg-zinc-800/80 backdrop-blur rounded-3xl p-12 border-2 border-zinc-700 mt-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-3xl font-semibold text-zinc-400 mb-2">Overall Rating</h3>
                          <div className="text-9xl font-bold text-yellow-500">
                            {hand.overallRating || "N/A"}
                            <span className="text-5xl text-zinc-500">/10</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-12">
                      <p className="text-4xl text-zinc-500">Poker Hand Analyzer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleExport} disabled={isGenerating} className="flex-1" size="lg">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Download for {spec.name}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} size="lg">Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
