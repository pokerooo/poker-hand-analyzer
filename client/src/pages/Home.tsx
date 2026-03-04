import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Sparkles, Share2, Users, ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";

const EXAMPLE_HANDS = [
  {
    label: "Flopped top pair",
    text: "500/1000 utg open 2500, we co ATo flat, btn flat, bb fold\nFlop A84r hero bet 3500 btn call utg fold\nTurn 2s hero bet 9000 btn raise 22000 hero fold",
  },
  {
    label: "River bluff spot",
    text: "200/400 we btn KQs open 900, bb call\nFlop J72r bb check hero bet 600 bb call\nTurn 5h both check\nRiver 4s bb bet 2500 hero raise 7000 bb fold hero wins",
  },
  {
    label: "Big pot 3bet",
    text: "1000/2000 utg open 4500, we btn 3bet AKo 13500, utg call\nFlop K82r utg check hero bet 9000 utg call\nTurn 3h utg check hero bet 22000 utg allin 60000 hero call\nRiver Jd hero wins",
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [handText, setHandText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parseMutation = trpc.hands.parseText.useMutation();
  const createMutation = trpc.hands.create.useMutation();

  const handleVisualize = async () => {
    const text = handText.trim();
    if (!text || text.length < 10) {
      toast.error("Please describe your hand first");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Parse the text
      const { parsed } = await parseMutation.mutateAsync({ text });

      // Step 2: Save and get share slug
      const { shareSlug } = await createMutation.mutateAsync({
        rawText: text,
        parsedData: parsed,
      });

      // Step 3: Navigate to the replayer
      navigate(`/hand/${shareSlug}`);
    } catch (err: any) {
      toast.error("Couldn't read your hand", { description: "Try describing it a bit more clearly — e.g. 'we have AK on the BTN'" });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExample = (text: string) => {
    setHandText(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">♠</span>
          <span className="font-bold text-lg tracking-tight">PokerReplay</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={() => navigate("/my-hands")}>
              My Hands
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full gap-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Share your poker hands
            <br />
            <span className="text-primary">in seconds</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Type your hand the way you'd describe it on WhatsApp. We'll turn it into a visual replay you can share anywhere.
          </p>
        </div>

        {/* Input Box */}
        <div className="w-full space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={handText}
              onChange={(e) => setHandText(e.target.value)}
              placeholder={`Type your hand here...\n\nExample:\n500/1000 utg open 2500, we co ATo flat, btn flat\nFlop A84r hero bet 3500 btn call\nTurn 2s hero bet 9000 btn raise 22000 hero fold`}
              className="min-h-[180px] sm:min-h-[200px] text-base resize-none font-mono leading-relaxed pr-4 pb-14"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleVisualize();
                }
              }}
            />
            <div className="absolute bottom-3 right-3">
              <Button
                onClick={handleVisualize}
                disabled={isProcessing || !handText.trim()}
                size="sm"
                className="gap-2 font-semibold"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Reading hand...</>
                ) : (
                  <><Play className="h-4 w-4" /> Visualise</>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">⌘ Enter</kbd> to visualise · No signup required
          </p>
        </div>

        {/* Example Hands */}
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_HANDS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => loadExample(ex.text)}
                className="text-sm px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-foreground"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="w-full grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[
            { icon: "✍️", title: "Type it", desc: "Describe your hand like you would on WhatsApp" },
            { icon: "🎬", title: "Replay it", desc: "See it come to life on an animated poker table" },
            { icon: "📤", title: "Share it", desc: "One tap to share on TikTok, IG, WhatsApp & more" },
          ].map((step) => (
            <div key={step.title} className="text-center space-y-1">
              <div className="text-2xl">{step.icon}</div>
              <div className="font-semibold text-sm">{step.title}</div>
              <div className="text-xs text-muted-foreground leading-snug">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* AI Coach CTA */}
        <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
          <div className="text-3xl">🧠</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2">
              AI Coach Analysis
              <Badge variant="secondary" className="text-xs">Premium</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get your hand scored and learn exactly what you should have done differently.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        PokerReplay · Share your story from the felt
      </footer>
    </div>
  );
}
