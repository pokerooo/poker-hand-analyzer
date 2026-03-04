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
import { VideoExport } from "@/components/VideoExport";

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
    stackSize?: number;
  }>;
  currentAction: { player: string; action: string; amount?: number } | null;
  description: string;
}

// Enforce correct board card counts: flop=3 new, turn=1 new, river=1 new
function sanitiseBoardCards(streets: ParsedStreet[]): ParsedStreet[] {
  let totalSoFar = 0;
  return streets.map((street) => {
    if (!street.board || street.board.length === 0) return street;
    let allowed = 0;
    if (street.name === 'flop') allowed = 3;
    else if (street.name === 'turn') allowed = 1;
    else if (street.name === 'river') allowed = 1;
    else return street;
    const cards = street.board;
    let newCards: string[];
    // If LLM returned cumulative cards (e.g. all 5 on river), extract only the new ones
    if (cards.length === totalSoFar + allowed) {
      // Incremental — already correct
      newCards = cards;
    } else if (cards.length > allowed) {
      // Cumulative — take the last `allowed` cards
      newCards = cards.slice(cards.length - allowed);
    } else {
      // Fewer than expected — take what we have
      newCards = cards;
    }
    totalSoFar += newCards.length;
    return { ...street, board: newCards };
  });
}

// Sort players so hero is always index 0 (bottom-center seat on the table)
function heroFirst(players: ParsedPlayer[]): ParsedPlayer[] {
  const hero = players.find((p) => p.isHero);
  const rest = players.filter((p) => !p.isHero);
  return hero ? [hero, ...rest] : players;
}

function buildReplaySteps(parsed: ParsedHand): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const foldedPlayers = new Set<string>();
  let communityCards: string[] = [];
  let pot = (parsed.smallBlind || 0) + (parsed.bigBlind || 0) + (parsed.ante || 0) * (parsed.players?.length || 0);

  // Sanitise board cards and sort hero to front
  const sanitisedStreets = sanitiseBoardCards(parsed.streets || []);
  const sortedPlayers = heroFirst(parsed.players || []);

  const makePlayerState = (currentAction: ParsedAction | null) =>
    sortedPlayers.map((p) => ({
      position: p.position,
      isHero: p.isHero,
      holeCards: p.holeCards,
      hasFolded: foldedPlayers.has(p.position),
      isActive: currentAction?.player === p.position,
      betAmount: currentAction?.player === p.position && currentAction.amount ? currentAction.amount : 0,
      isAllIn: currentAction?.player === p.position && currentAction.action === "allin",
      stackSize: p.startingStack ?? undefined,
    }));

  for (const street of sanitisedStreets) {
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

  // Final state — reveal all known community cards
  if (steps.length > 0) {
    const last = steps[steps.length - 1];
    // Collect all board cards across all streets for the final summary view
    const allBoardCards: string[] = [];
    for (const street of sanitisedStreets) {
      if (street.board && street.board.length > 0) {
        allBoardCards.push(...street.board);
      }
    }
    steps.push({
      ...last,
      communityCards: allBoardCards.length > 0 ? allBoardCards : last.communityCards,
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
  const [descriptionKey, setDescriptionKey] = useState(0); // increment to trigger fade-in
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsed = hand?.parsedData as ParsedHand | undefined;
  const steps = parsed ? buildReplaySteps(parsed) : [];
  const currentStep = steps[stepIndex];

  // Auto-start playback once hand is loaded
  useEffect(() => {
    if (steps.length > 0) {
      const timer = setTimeout(() => setIsPlaying(true), 600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  // Trigger fade-in animation on each step change
  useEffect(() => {
    setDescriptionKey((k) => k + 1);
  }, [stepIndex]);

  // Auto-play — 2.5s per step so it feels like a live hand
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStepIndex((i) => {
          if (i >= steps.length - 1) {
            setIsPlaying(false);
            clearInterval(intervalRef.current!);
            return i;
          }
          return i + 1;
        });
      }, 2500);
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
  const handTitle = (hand as any).title as string | undefined;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0f0d 0%, #0d1a12 50%, #0a0f0d 100%)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: "rgba(10,15,13,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(16,185,129,0.12)",
          boxShadow: "0 1px 0 rgba(16,185,129,0.06)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#6ee7b7", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            {handTitle && (
              <div className="font-semibold text-sm truncate leading-tight" style={{ color: "#e2e8f0" }}>{handTitle}</div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm" style={{ color: "#4ade80", textShadow: "0 0 8px rgba(74,222,128,0.4)" }}>{heroCards}</span>
              <span className="text-xs" style={{ color: "#64748b" }}>{parsed.heroPosition} · {blinds}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #065f46, #047857)",
              color: "#6ee7b7",
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "0 0 12px rgba(16,185,129,0.2)",
            }}
            onClick={() => setActiveTab("share")}
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
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

      {/* Action description — always visible, fades in on each step */}
      <div className="px-4 pt-3 pb-2 max-w-lg mx-auto w-full">
        {currentStep && (
          <div
            key={descriptionKey}
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(16,185,129,0.15)",
              backdropFilter: "blur(8px)",
              animation: "fadeSlideIn 0.35s ease",
              boxShadow: "0 0 20px rgba(16,185,129,0.05)",
            }}
          >
            {/* Street badge */}
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
              style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              {currentStep.street}
            </span>
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: currentStep.currentAction === null ? "#4ade80" : "#e2e8f0" }}
            >
              {currentStep.description}
            </p>
            {/* Step counter */}
            <p className="text-[11px] mt-1" style={{ color: "#475569" }}>
              Action {stepIndex + 1} of {steps.length}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-3 max-w-lg mx-auto w-full space-y-3">
        {/* Progress bar (custom styled) */}
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            style={{
              width: `${steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0}%`,
              background: "linear-gradient(90deg, #10b981, #4ade80)",
              boxShadow: "0 0 8px rgba(16,185,129,0.5)",
            }}
          />
        </div>

        {/* Playback buttons */}
        <div className="flex items-center justify-center gap-2">
          {/* Skip to start */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex === 0 ? "#1e293b" : "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={() => goTo(0)} disabled={stepIndex === 0}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          {/* Prev */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex === 0 ? "#1e293b" : "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          {/* Play/Pause — hero button */}
          <button
            className="w-12 h-12 flex items-center justify-center rounded-full transition-all"
            style={{
              background: isPlaying
                ? "linear-gradient(135deg, #065f46, #047857)"
                : "linear-gradient(135deg, #10b981, #4ade80)",
              color: "#fff",
              boxShadow: isPlaying
                ? "0 0 20px rgba(16,185,129,0.3)"
                : "0 0 24px rgba(74,222,128,0.5), 0 4px 12px rgba(0,0,0,0.4)",
              border: "1px solid rgba(74,222,128,0.3)",
            }}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={stepIndex >= steps.length - 1 && !isPlaying}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          {/* Next */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex >= steps.length - 1 ? "#1e293b" : "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={() => goTo(stepIndex + 1)} disabled={stepIndex >= steps.length - 1}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          {/* Skip to end */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex >= steps.length - 1 ? "#1e293b" : "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={() => goTo(steps.length - 1)} disabled={stepIndex >= steps.length - 1}
          >
            <SkipBack className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="max-w-lg mx-auto w-full" style={{ borderTop: "1px solid rgba(16,185,129,0.1)" }}>
        <div className="flex">
          {[
            { id: "replay" as const, label: "Replay", icon: "🎬" },
            { id: "share" as const, label: "Share", icon: "📤" },
            { id: "coach" as const, label: "AI Coach", icon: "🧠" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-all"
              style={{
                color: activeTab === tab.id ? "#4ade80" : "#475569",
                borderTop: activeTab === tab.id ? "2px solid #4ade80" : "2px solid transparent",
                textShadow: activeTab === tab.id ? "0 0 8px rgba(74,222,128,0.4)" : "none",
              }}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 py-4 max-h-[45vh] overflow-y-auto">
          {activeTab === "replay" && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ade80" }}>Hand Summary</p>
              <div
                className="font-mono text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg"
                style={{ color: "#94a3b8", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {hand.rawText}
              </div>
              {parsed.parseNotes && (
                <p className="text-xs italic" style={{ color: "#475569" }}>Note: {parsed.parseNotes}</p>
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
