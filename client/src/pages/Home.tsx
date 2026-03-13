import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Play, ChevronRight, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const EXAMPLE_HANDS = [
  {
    label: "Flopped top pair",
    text: "500/1000 2000eff utg open 2500, we co ATo flat, btn flat, bb fold\nFlop A84r hero bet 3500 btn call utg fold\nTurn 2s hero bet 9000 btn raise 22000 hero fold",
  },
  {
    label: "River bluff spot",
    text: "200/400 1200eff we btn KQs open 900, bb call\nFlop J72r bb check hero bet 600 bb call\nTurn 5h both check\nRiver 4s bb bet 2500 hero raise 7000 bb fold hero wins",
  },
  {
    label: "Big pot 3bet",
    text: "1000/2000 8000eff utg open 4500, we btn 3bet AKo 13500, utg call\nFlop K82r utg check hero bet 9000 utg call\nTurn 3h utg check hero bet 22000 utg allin hero call\nRiver Jd hero wins",
  },
];

// Detect if blinds (e.g. 500/1000) are present in the text
function hasBlinds(text: string): boolean {
  return /\d+\s*\/\s*\d+/.test(text);
}

// Detect if effective stack (e.g. 2000eff or 2keff) is present
function hasEffStack(text: string): boolean {
  return /\d+(\.\d+)?\s*k?\s*eff/i.test(text);
}

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [handText, setHandText] = useState("");
  const [handTitle, setHandTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parseMutation = trpc.hands.parseText.useMutation();
  const createMutation = trpc.hands.create.useMutation();

  // Live usage counter from DB — seeded at 5000, increments on each visualiser visit
  const { data: usageData } = trpc.stats.getUsageCount.useQuery();
  const [userCount, setUserCount] = useState(5000);
  useEffect(() => {
    if (usageData?.count) {
      setUserCount(usageData.count);
    }
  }, [usageData?.count]);
  // Subtle random tick to feel live (adds 1-2 every 5-10s)
  useEffect(() => {
    const schedule = () => {
      const delay = 5000 + Math.random() * 5000;
      return setTimeout(() => {
        setUserCount((n) => n + Math.floor(Math.random() * 2) + 1);
        schedule();
      }, delay);
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  const validate = (text: string): string[] => {
    const errors: string[] = [];
    if (!hasBlinds(text)) {
      errors.push("Include blinds — e.g. 500/1000 at the start");
    }
    if (!hasEffStack(text)) {
      errors.push("Include effective stack — e.g. 2000eff");
    }
    return errors;
  };

  const handleVisualize = async () => {
    const text = handText.trim();
    if (!text || text.length < 10) {
      toast.error("Please describe your hand first");
      return;
    }

    const errors = validate(text);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    setIsProcessing(true);
    try {
      const { parsed } = await parseMutation.mutateAsync({ text });
      const { shareSlug } = await createMutation.mutateAsync({
        rawText: text,
        parsedData: parsed,
        title: handTitle.trim() || undefined,
      });
      navigate(`/hand/${shareSlug}`);
    } catch {
      toast.error("Couldn't read your hand", {
        description: "Try including blinds (500/1000), effective stack (2000eff), and your position",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExample = (text: string) => {
    setHandText(text);
    setValidationErrors([]);
    textareaRef.current?.focus();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHandText(e.target.value);
    if (validationErrors.length > 0) {
      setValidationErrors(validate(e.target.value));
    }
  };

  const missingBlinds = handText.trim().length > 5 && !hasBlinds(handText);
  const missingStack = handText.trim().length > 5 && !hasEffStack(handText);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>Poker AI — Your Personal AI Poker Coach</title>
        <meta name="description" content="Describe any hand. Get instant visual replays, street-by-street AI coaching, and leak detection — all in seconds. Built for mid-to-high stakes players." />
        <meta property="og:title" content="Poker AI — Your Personal AI Poker Coach" />
        <meta property="og:description" content="Stop guessing. Start playing like a pro. Paste your hand, get AI coaching, spot your leaks." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663320611071/g6HPzuQNwUJzsGs4mHVNkx/poker-ai-og-image-7drWg25DKCagfvcgG6iVn7.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Poker AI — Your Personal AI Poker Coach" />
        <meta name="twitter:description" content="Stop guessing. Start playing like a pro. Paste your hand, get AI coaching, spot your leaks." />
        <meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663320611071/g6HPzuQNwUJzsGs4mHVNkx/poker-ai-og-image-7drWg25DKCagfvcgG6iVn7.png" />
      </Helmet>

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">♠</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Poker AI</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/coach")}
            className="font-semibold gap-1.5 border-amber-400/40 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <Zap className="h-3.5 w-3.5" />
            AI Coach
          </Button>
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/my-hands")} className="font-medium">
              My Hands
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="font-medium">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-16 max-w-2xl mx-auto w-full gap-6 sm:gap-8">

        {/* Headline */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-2">
            <span>♠</span> Your Personal AI Poker Coach
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            Stop guessing.
            <br />
            <span className="text-primary">Start playing like a pro.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
            Describe any hand. Get instant visual replays, street-by-street AI coaching, and leak detection — all in seconds.
          </p>
          {/* Social proof counter */}
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex gap-0.5">
              {[0,1,2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </span>
            <span>
              Used by{" "}
              <span className="font-bold text-foreground tabular-nums">
                {userCount.toLocaleString()}+
              </span>
              {" "}players worldwide
            </span>
          </div>
        </div>

        {/* Trailer Video */}
        <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 40px rgba(16,185,129,0.08), 0 8px 32px rgba(0,0,0,0.4)" }}>
          <video
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663320611071/g6HPzuQNwUJzsGs4mHVNkx/TrailerVideo_102f302f.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            className="w-full block"
            style={{ display: "block", maxHeight: 360, objectFit: "cover" }}
          />
        </div>

        {/* Feature Tiles */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: "🎬",
              title: "Hand Replayer",
              desc: "See every street play out on an animated table with pot, SPR, and stack tracking in real time.",
              cta: "Paste a hand below",
              onClick: () => textareaRef.current?.focus(),
            },
            {
              icon: "🧠",
              title: "AI Coach",
              desc: "Get street-by-street analysis, a grade, and exploitative adjustments tailored to your villain type.",
              cta: "Open AI Coach",
              onClick: () => navigate("/coach"),
            },
            {
              icon: "🔍",
              title: "Leak Detection",
              desc: "Scan your hand history for recurring patterns — positional leaks, sizing tells, and EV losses quantified.",
              cta: "View My Hands",
              onClick: () => navigate("/my-hands"),
            },
          ].map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group space-y-2"
            >
              <div className="text-2xl">{tile.icon}</div>
              <div className="font-semibold text-sm text-foreground">{tile.title}</div>
              <p className="text-xs text-muted-foreground leading-snug">{tile.desc}</p>
              <div className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                {tile.cta} <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>

        {/* Input Section */}
        <div className="w-full space-y-3">

          {/* Optional title */}
          <Input
            value={handTitle}
            onChange={(e) => setHandTitle(e.target.value)}
            placeholder="Hand title (optional) — e.g. Sick river spot vs reg"
            className="text-sm font-medium"
          />

          {/* Required field hints */}
          <div className="flex gap-3 text-xs">
            <span className={`flex items-center gap-1 font-medium px-2 py-1 rounded-md transition-colors ${
              missingBlinds
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : hasBlinds(handText)
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-muted text-muted-foreground border border-transparent"
            }`}>
              {hasBlinds(handText) ? "✓" : "!"} Blinds e.g. 500/1000
            </span>
            <span className={`flex items-center gap-1 font-medium px-2 py-1 rounded-md transition-colors ${
              missingStack
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : hasEffStack(handText)
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-muted text-muted-foreground border border-transparent"
            }`}>
              {hasEffStack(handText) ? "✓" : "!"} Eff. stack e.g. 2000eff
            </span>
          </div>

          {/* Main textarea */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={handText}
              onChange={handleTextChange}
              placeholder={`500/1000 2000eff utg open 2500, we co ATo flat, btn flat\nFlop A84r hero bet 3500 btn call\nTurn 2s hero bet 9000 btn raise 22000 hero fold`}
              className="min-h-[160px] sm:min-h-[180px] text-sm resize-none font-mono leading-relaxed pb-14 bg-card"
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
                className="gap-2 font-semibold shadow-sm"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Reading hand...</>
                ) : (
                  <><Play className="h-4 w-4 fill-current" /> Visualise</>
                )}
              </Button>
            </div>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs font-mono">⌘ Enter</kbd> to visualise
          </p>
        </div>

        {/* Example Hands */}
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_HANDS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => loadExample(ex.text)}
                className="text-sm px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary hover:border-primary/30 hover:text-primary transition-all font-medium text-foreground"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-border">
          {[
            { icon: "✍️", title: "Type it", desc: "Describe your hand like you would on WhatsApp" },
            { icon: "🎬", title: "Replay it", desc: "See it come to life on an animated poker table" },
            { icon: "📤", title: "Share it", desc: "One tap to WhatsApp, TikTok, IG & more" },
          ].map((step) => (
            <div key={step.title} className="text-center space-y-1.5 p-3 rounded-xl bg-card border border-border">
              <div className="text-2xl">{step.icon}</div>
              <div className="font-semibold text-sm">{step.title}</div>
              <div className="text-xs text-muted-foreground leading-snug">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* AI Coach CTA */}
        <div
          className="w-full rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-50/60 to-yellow-50/40 dark:from-amber-950/20 dark:to-yellow-950/10 p-4 flex items-center gap-4 hover:border-amber-400/60 transition-colors cursor-pointer"
          onClick={() => navigate("/coach")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/coach")}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
            🧠
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2">
              AI Coach Analysis
              <Badge className="text-xs bg-amber-500 text-white border-0">Free</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get your hand scored and learn exactly what you should have done differently.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        Poker AI · Your Personal AI Poker Coach
      </footer>
    </div>
  );
}
