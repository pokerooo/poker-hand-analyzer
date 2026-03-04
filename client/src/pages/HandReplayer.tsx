import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PokerTable } from "@/components/PokerTable";
import { toast } from "sonner";
import { useSwipe } from "@/hooks/useSwipe";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Share2, Copy, Loader2, Sparkles, Lock, ChevronDown, ChevronUp,
  MessageCircle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedAction {
  player: string;
  action: string;
  amount?: number | null;
  isHero?: boolean;
}

interface ParsedStreet {
  name: "preflop" | "flop" | "turn" | "river";
  board?: string[] | null;
  actions: ParsedAction[];
  pot?: number | null;
}

interface ParsedPlayer {
  position: string;
  isHero: boolean;
  holeCards?: string[] | null;
  startingStack?: number | null;
}

interface ParsedHand {
  smallBlind: number;
  bigBlind: number;
  ante?: number | null;
  players: ParsedPlayer[];
  heroPosition: string;
  heroCards: string[];
  streets: ParsedStreet[];
  potSize?: number | null;
  result?: string | null;
  parseNotes?: string | null;
}

// ─── Build replay steps ───────────────────────────────────────────────────────

interface ReplayStep {
  street: "preflop" | "flop" | "turn" | "river";
  communityCards: string[];
  pot: number;
  players: Array<{
    position: string;
    isHero: boolean;
    holeCards?: string[] | null;
    hasFolded: boolean;
    isActive: boolean;
    betAmount: number;
    isAllIn: boolean;
  }>;
  currentAction: { player: string; action: string; amount?: number } | null;
  description: string;
}

function buildReplaySteps(parsed: ParsedHand): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const foldedPlayers = new Set<string>();
  let communityCards: string[] = [];
  let pot = (parsed.smallBlind || 0) + (parsed.bigBlind || 0) + (parsed.ante || 0) * (parsed.players?.length || 0);

  const makePlayerState = (currentAction: ParsedAction | null) =>
    (parsed.players || []).map((p) => ({
      position: p.position,
      isHero: p.isHero,
      holeCards: p.holeCards,
      hasFolded: foldedPlayers.has(p.position),
      isActive: currentAction?.player === p.position,
      betAmount: currentAction?.player === p.position && currentAction.amount ? currentAction.amount : 0,
      isAllIn: currentAction?.player === p.position && currentAction.action === "allin",
    }));

  for (const street of (parsed.streets || [])) {
    // Reveal board cards for this street
    if (street.board && street.board.length > 0) {
      communityCards = [...communityCards, ...street.board];
      steps.push({
        street: street.name,
        communityCards: [...communityCards],
        pot,
        players: makePlayerState(null),
        currentAction: null,
        description: `${street.name.charAt(0).toUpperCase() + street.name.slice(1)}: ${street.board.join(" ")}`,
      });
    } else if (street.name === "preflop") {
      // Preflop — show cards dealt
      steps.push({
        street: "preflop",
        communityCards: [],
        pot,
        players: makePlayerState(null),
        currentAction: null,
        description: "Cards dealt",
      });
    }

    // Each action
    for (const action of (street.actions || [])) {
      if (action.action === "fold") {
        foldedPlayers.add(action.player);
      }
      if (action.amount) {
        pot += action.amount;
      }

      steps.push({
        street: street.name,
        communityCards: [...communityCards],
        pot,
        players: makePlayerState(action),
        currentAction: {
          player: action.player,
          action: action.action,
          amount: action.amount ?? undefined,
        },
        description: `${action.player} ${action.action}${action.amount ? ` ${action.amount.toLocaleString()}` : ""}`,
      });
    }
  }

  // Final state
  if (steps.length > 0) {
    const last = steps[steps.length - 1];
    steps.push({
      ...last,
      currentAction: null,
      description: parsed.result || "Hand complete",
    });
  }

  return steps;
}

// ─── Share Sheet ──────────────────────────────────────────────────────────────

function ShareSheet({ slug, rawText }: { slug: string; rawText: string }) {
  const shareUrl = `${window.location.origin}/hand/${slug}`;
  const shareText = `Check out this poker hand! ${shareUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Poker Hand", text: shareText, url: shareUrl });
    } else {
      copyLink();
    }
  };

  const platforms = [
    {
      name: "WhatsApp",
      icon: "💬",
      color: "bg-green-500",
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "X / Twitter",
      icon: "𝕏",
      color: "bg-black",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Facebook",
      icon: "f",
      color: "bg-blue-600",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Threads",
      icon: "@",
      color: "bg-black",
      url: `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "TikTok",
      icon: "♪",
      color: "bg-black",
      url: `https://www.tiktok.com/`,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Native share / copy */}
      <div className="flex gap-2">
        <Button onClick={nativeShare} className="flex-1 gap-2" variant="default">
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button onClick={copyLink} variant="outline" className="gap-2">
          <Copy className="h-4 w-4" /> Copy Link
        </Button>
      </div>

      {/* Platform buttons */}
      <div className="grid grid-cols-5 gap-2">
        {platforms.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${p.color} text-white rounded-lg py-2 flex flex-col items-center gap-0.5 hover:opacity-90 transition-opacity`}
          >
            <span className="text-base font-bold leading-none">{p.icon}</span>
            <span className="text-[9px] leading-none opacity-80">{p.name}</span>
          </a>
        ))}
      </div>

      {/* Raw text for WhatsApp copy */}
      <div className="bg-muted rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1 font-medium">Hand text (for WhatsApp)</p>
        <p className="text-xs font-mono leading-relaxed text-foreground">{rawText.slice(0, 200)}{rawText.length > 200 ? "..." : ""}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-xs"
          onClick={() => { navigator.clipboard.writeText(rawText); toast.success("Hand text copied!"); }}
        >
          <Copy className="h-3 w-3 mr-1" /> Copy hand text
        </Button>
      </div>
    </div>
  );
}

// ─── AI Coach Panel ───────────────────────────────────────────────────────────

function CoachPanel({ handId, isUnlocked, cachedAnalysis }: { handId: number; isUnlocked: boolean; cachedAnalysis: any }) {
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState<any>(cachedAnalysis);

  const analyzeMutation = trpc.coach.analyze.useMutation({
    onSuccess: (data) => setAnalysis(data.analysis),
    onError: (err) => toast.error("Analysis failed", { description: err.message }),
  });

  if (!isAuthenticated) {
    return (
      <div className="text-center py-6 space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sign in to unlock AI Coach analysis</p>
      </div>
    );
  }

  if (analysis) {
    const gradeColors: Record<string, string> = { A: "text-green-500", B: "text-emerald-500", C: "text-yellow-500", D: "text-orange-500", F: "text-red-500" };
    const streets = ["preflop", "flop", "turn", "river"] as const;

    return (
      <div className="space-y-4">
        {/* Grade */}
        <div className="flex items-center gap-4">
          <div className={`text-5xl font-black ${gradeColors[analysis.grade] || "text-foreground"}`}>
            {analysis.grade}
          </div>
          <div>
            <div className="font-semibold">{analysis.gradeLabel}</div>
            <div className="text-sm text-muted-foreground">{analysis.summary}</div>
          </div>
        </div>

        {/* Street scores */}
        <div className="grid grid-cols-2 gap-2">
          {streets.map((s) => {
            const st = analysis.streets?.[s];
            if (!st) return null;
            return (
              <div key={s} className="bg-muted rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize">{s}</span>
                  <span className="text-sm font-bold">{st.score}/10</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{st.comment}</p>
              </div>
            );
          })}
        </div>

        {/* Did well / Mistakes */}
        {analysis.didWell?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-500 mb-1">✓ What you did well</p>
            <ul className="space-y-1">
              {analysis.didWell.map((item: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.mistakes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1">✗ Where you went wrong</p>
            <ul className="space-y-1">
              {analysis.mistakes.map((item: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Key lesson */}
        {analysis.keyLesson && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-xs font-semibold text-primary mb-1">💡 Key lesson</p>
            <p className="text-xs text-foreground">{analysis.keyLesson}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-6 space-y-4">
      <div className="text-4xl">🧠</div>
      <div>
        <p className="font-semibold">Get AI Coach Analysis</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your hand scored street-by-street with plain English feedback on what you did well and what to improve.
        </p>
      </div>
      <Button
        onClick={() => analyzeMutation.mutate({ handId })}
        disabled={analyzeMutation.isPending}
        className="gap-2"
      >
        {analyzeMutation.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Analyse My Hand</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">Free during beta</p>
    </div>
  );
}

// ─── Main Replayer Page ───────────────────────────────────────────────────────

export default function HandReplayer() {
  const [, params] = useRoute("/hand/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";

  const { data: hand, isLoading } = trpc.hands.getBySlug.useQuery({ slug }, { enabled: !!slug });

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"replay" | "share" | "coach">("replay");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsed = hand?.parsedData as ParsedHand | undefined;
  const steps = parsed ? buildReplaySteps(parsed) : [];
  const currentStep = steps[stepIndex];

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStepIndex((i) => {
          if (i >= steps.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 1500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, steps.length]);

  const goTo = useCallback((i: number) => {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, i)));
    setIsPlaying(false);
  }, [steps.length]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => goTo(stepIndex + 1),
    onSwipeRight: () => goTo(stepIndex - 1),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hand || !parsed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🃏</div>
        <h2 className="text-2xl font-bold">Hand not found</h2>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  const heroCards = parsed.heroCards?.join(" ") || "?";
  const blinds = `${parsed.smallBlind}/${parsed.bigBlind}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="font-mono font-bold text-sm">{heroCards}</div>
            <div className="text-xs text-muted-foreground">{parsed.heroPosition} · {blinds}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setActiveTab("share")}
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </header>

      {/* Table — swipe left/right to step through hand */}
      <div
        className="w-full max-w-lg mx-auto px-4 pt-4"
        {...swipeHandlers}
      >
        {currentStep && (
          <PokerTable
            players={currentStep.players}
            communityCards={currentStep.communityCards}
            potSize={currentStep.pot}
            currentAction={currentStep.currentAction}
            street={currentStep.street}
          />
        )}
      </div>

      {/* Action description */}
      <div className="text-center py-2 min-h-[32px]">
        {currentStep && (
          <p className="text-sm font-medium text-foreground">
            {currentStep.description}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-2 max-w-lg mx-auto w-full space-y-2">
        {/* Progress slider */}
        <Slider
          value={[stepIndex]}
          min={0}
          max={Math.max(0, steps.length - 1)}
          step={1}
          onValueChange={([v]) => goTo(v)}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {stepIndex + 1} of {steps.length}</span>
          <span>{currentStep?.street}</span>
        </div>

        {/* Playback buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => goTo(0)} disabled={stepIndex === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={stepIndex >= steps.length - 1 && !isPlaying}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => goTo(stepIndex + 1)} disabled={stepIndex >= steps.length - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => goTo(steps.length - 1)} disabled={stepIndex >= steps.length - 1}>
            <SkipBack className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="border-t border-border max-w-lg mx-auto w-full">
        <div className="flex">
          {[
            { id: "replay" as const, label: "Replay", icon: "🎬" },
            { id: "share" as const, label: "Share", icon: "📤" },
            { id: "coach" as const, label: "AI Coach", icon: "🧠" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-t-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 py-4 max-h-[40vh] overflow-y-auto">
          {activeTab === "replay" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hand Summary</p>
              <div className="font-mono text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {hand.rawText}
              </div>
              {parsed.parseNotes && (
                <p className="text-xs text-muted-foreground italic">Note: {parsed.parseNotes}</p>
              )}
            </div>
          )}

          {activeTab === "share" && (
            <ShareSheet slug={slug} rawText={hand.rawText} />
          )}

          {activeTab === "coach" && (
            <CoachPanel
              handId={hand.id}
              isUnlocked={hand.coachUnlocked}
              cachedAnalysis={hand.coachAnalysis}
            />
          )}
        </div>
      </div>
    </div>
  );
}
