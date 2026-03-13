import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Share2, Copy, Loader2, Sparkles, Lock, ChevronDown, ChevronUp,
  MessageCircle, Zap, X, ChevronRight, Minus
} from "lucide-react";
import { VideoExport } from "@/components/VideoExport";
import ProPaywall from "@/components/ProPaywall";

// --- Types ────────────────────────────────────────────────────────────────────

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

// --- Build replay steps ───────────────────────────────────────────────────────

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
      // Incremental -- already correct
      newCards = cards;
    } else if (cards.length > allowed) {
      // Cumulative -- take the last `allowed` cards
      newCards = cards.slice(cards.length - allowed);
    } else {
      // Fewer than expected -- take what we have
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

// 8-max canonical seat order -- fixed, no rotation
// Positions are always displayed at the same visual slot on the table.
const SEAT_ORDER_8MAX = ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"];

// Normalise position aliases to canonical labels
function normPos(pos: string): string {
  const p = pos.toUpperCase().trim();
  if (p === "MP" || p === "MP1" || p === "MP2" || p === "UTG2" || p === "UTG 2") return "LJ";
  if (p === "EP" || p === "EP1" || p === "UTG") return "UTG";
  if (p === "EP2" || p === "UTG1" || p === "UTG 1" || p === "UTG+1") return "UTG+1";
  if (p === "BTN" || p === "BU" || p === "BUTTON") return "BTN";
  if (p === "SB" || p === "SMALL BLIND") return "SB";
  if (p === "BB" || p === "BIG BLIND") return "BB";
  if (p === "CO" || p === "CUTOFF") return "CO";
  if (p === "HJ" || p === "HIJACK") return "HJ";
  if (p === "LJ" || p === "LOJACK") return "LJ";
  return pos;
}

function build8MaxSeats(parsedPlayers: ParsedPlayer[], _smallBlind: number, _bigBlind: number): Array<ParsedPlayer & { isEmpty?: boolean }> {
  // Normalise all player positions
  const normMap = new Map<string, ParsedPlayer>();
  for (const p of parsedPlayers) {
    normMap.set(normPos(p.position), { ...p, position: normPos(p.position) });
  }

  // Return one entry per canonical position in fixed order
  return SEAT_ORDER_8MAX.map((seatPos) => {
    const player = normMap.get(seatPos);
    if (player) return { ...player, isEmpty: false };
    // Empty seat -- ghost player
    return {
      position: seatPos,
      isHero: false,
      holeCards: null,
      startingStack: null,
      isEmpty: true,
    };
  });
}

function buildReplaySteps(parsed: ParsedHand): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const foldedPlayers = new Set<string>();
  let communityCards: string[] = [];

  // Sanitise board cards and sort hero to front
  const sanitisedStreets = sanitiseBoardCards(parsed.streets || []);

  // Build 8-max seats (hero first, empty seats for missing positions)
  const allSeats = build8MaxSeats(parsed.players || [], parsed.smallBlind || 0, parsed.bigBlind || 0);

  // Track remaining stacks per player -- deduct blind posts first
  const remainingStacks = new Map<string, number | undefined>();
  for (const p of allSeats) {
    if (!p.isEmpty) remainingStacks.set(p.position, p.startingStack ?? undefined);
  }

  // Deduct blind posts from starting stacks
  const sbPlayer = allSeats.find((p) => p.position === "SB" && !p.isEmpty);
  const bbPlayer = allSeats.find((p) => p.position === "BB" && !p.isEmpty);
  if (sbPlayer && parsed.smallBlind) {
    const s = remainingStacks.get("SB");
    if (s != null) remainingStacks.set("SB", Math.max(0, s - parsed.smallBlind));
  }
  if (bbPlayer && parsed.bigBlind) {
    const b = remainingStacks.get("BB");
    if (b != null) remainingStacks.set("BB", Math.max(0, b - parsed.bigBlind));
  }

  // Starting pot = blinds + antes
  let pot = (parsed.smallBlind || 0) + (parsed.bigBlind || 0) + (parsed.ante || 0) * (parsed.players?.length || 0);

  // Per-street: track amount each player has put in this street (for raise sizing)
  // A "raise to X" means total bet is X, so deduct (X - alreadyInThisStreet)
  let streetContributions = new Map<string, number>();

  const makePlayerState = (currentAction: ParsedAction | null) =>
    allSeats.map((p) => ({
      position: p.position,
      isHero: p.isHero,
      holeCards: p.holeCards,
      hasFolded: foldedPlayers.has(p.position),
      isActive: !p.isEmpty && currentAction?.player === p.position,
      betAmount: !p.isEmpty && currentAction?.player === p.position && currentAction.amount ? currentAction.amount : 0,
      isAllIn: !p.isEmpty && currentAction?.player === p.position && currentAction.action === "allin",
      stackSize: p.isEmpty ? undefined : remainingStacks.get(p.position),
      isEmpty: (p as any).isEmpty ?? false,
    }));

  for (const street of sanitisedStreets) {
    // Reset per-street contributions at start of each street
    streetContributions = new Map<string, number>();

    // Preflop: SB and BB already contributed their blinds
    if (street.name === "preflop") {
      if (parsed.smallBlind) streetContributions.set("SB", parsed.smallBlind);
      if (parsed.bigBlind) streetContributions.set("BB", parsed.bigBlind);
    }

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
      // Preflop -- show cards dealt
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

      if (action.amount && action.amount > 0) {
        const alreadyIn = streetContributions.get(action.player) || 0;
        const act = action.action.toLowerCase();

        let actualDeduction = 0;

        if (act === "raise" || act === "bet" || act === "allin") {
          // amount is the TOTAL bet size for this street (raise TO X)
          // deduct only the additional chips going in
          actualDeduction = Math.max(0, action.amount - alreadyIn);
          streetContributions.set(action.player, action.amount);
        } else if (act === "call") {
          // call amount is the additional chips needed
          actualDeduction = action.amount;
          streetContributions.set(action.player, alreadyIn + action.amount);
        } else {
          // generic -- treat as additional chips
          actualDeduction = action.amount;
          streetContributions.set(action.player, alreadyIn + action.amount);
        }

        pot += actualDeduction;

        // Deduct from remaining stack
        const currentStack = remainingStacks.get(action.player);
        if (currentStack != null) {
          remainingStacks.set(action.player, Math.max(0, currentStack - actualDeduction));
        }
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

  // Final state -- reveal all known community cards
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

// --- Note Toggle ─────────────────────────────────────────────────────────────

function NoteToggle({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs"
        style={{ color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <span className="italic">Parser notes</span>
      </button>
      {open && (
        <p className="text-xs italic mt-1 leading-relaxed" style={{ color: "#475569" }}>{note}</p>
      )}
    </div>
  );
}

// --- Share Sheet ──────────────────────────────────────────────────────────────

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

// --- Villain type presets ─────────────────────────────────────────────────────

const VILLAIN_PRESETS = [
  { id: "fish", label: "Fish", emoji: "🐟", description: "Calls too wide, chases draws" },
  { id: "nit", label: "Nit", emoji: "🪨", description: "Extremely tight, folds too much" },
  { id: "tight reg", label: "Tight Reg", emoji: "📊", description: "Solid but predictable" },
  { id: "lag", label: "LAG", emoji: "🔥", description: "Loose-aggressive, barrels often" },
  { id: "calling station", label: "Calling Station", emoji: "📞", description: "Never folds, no bluffs" },
  { id: "maniac", label: "Maniac", emoji: "💥", description: "Bets/raises with anything" },
];

// --- AI Coach Panel ───────────────────────────────────────────────────────────

function CoachPanel({ handId, isUnlocked, cachedAnalysis, storedVillainType }: {
  handId: number;
  isUnlocked: boolean;
  cachedAnalysis: any;
  storedVillainType?: string | null;
}) {
  const { isAuthenticated } = useAuth();
  const { data: stripeStatus } = trpc.stripe.status.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = stripeStatus?.isPro ?? false;
  const [analysis, setAnalysis] = useState<any>(cachedAnalysis);
  const [selectedVillain, setSelectedVillain] = useState<string>(storedVillainType || "");
  const [customVillain, setCustomVillain] = useState("");
  const [activeVillainType, setActiveVillainType] = useState<string>(storedVillainType || "");
  const [showReanalyze, setShowReanalyze] = useState(false);

  const analyzeMutation = trpc.coach.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setActiveVillainType(data.villainType || "");
      setShowReanalyze(false);
    },
    onError: (err) => toast.error("Analysis failed", { description: err.message }),
  });

  const effectiveVillainType = customVillain.trim() || selectedVillain;

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      handId,
      villainType: effectiveVillainType || undefined,
    });
  };

  // AI Coach is open to all users — no paywall

  const gradeColors: Record<string, string> = { A: "text-green-500", B: "text-emerald-500", C: "text-yellow-500", D: "text-orange-500", F: "text-red-500" };
  const streets = ["preflop", "flop", "turn", "river"] as const;

  return (
    <div className="space-y-4">
      {/* Villain type selector -- always visible */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#4ade80" }}>Villain Type</p>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>Tag the opponent to get exploitative adjustments tailored to their tendencies.</p>

        {/* Preset tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {VILLAIN_PRESETS.map((v) => (
            <button
              key={v.id}
              onClick={() => { setSelectedVillain(selectedVillain === v.id ? "" : v.id); setCustomVillain(""); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: selectedVillain === v.id
                  ? "linear-gradient(135deg, #065f46, #047857)"
                  : "rgba(255,255,255,0.05)",
                color: selectedVillain === v.id ? "#6ee7b7" : "#94a3b8",
                border: selectedVillain === v.id
                  ? "1px solid rgba(16,185,129,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                boxShadow: selectedVillain === v.id ? "0 0 10px rgba(16,185,129,0.2)" : "none",
              }}
              title={v.description}
            >
              <span>{v.emoji}</span> {v.label}
            </button>
          ))}
        </div>

        {/* Custom villain free-text */}
        <input
          type="text"
          placeholder="Or describe: e.g. aggro whale / unknown reg..."
          value={customVillain}
          onChange={(e) => { setCustomVillain(e.target.value); setSelectedVillain(""); }}
          className="w-full text-xs px-3 py-2 rounded-lg outline-none transition-all"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e8f0",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(16,185,129,0.4)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>

      {/* Analysis results */}
      {analysis ? (
        <div className="space-y-4">
          {/* Active villain type badge */}
          {activeVillainType && activeVillainType !== "unknown" && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-xs" style={{ color: "#6ee7b7" }}>
                Analysis vs <strong className="capitalize">{activeVillainType}</strong>
              </span>
              <button
                className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                style={{ color: "#94a3b8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                onClick={() => setShowReanalyze(true)}
              >
                Re-analyse
              </button>
            </div>
          )}

          {/* Re-analyze prompt */}
          {showReanalyze && (
            <div
              className="p-3 rounded-lg space-y-2"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(16,185,129,0.15)" }}
            >
              <p className="text-xs" style={{ color: "#94a3b8" }}>Re-analyse with updated villain type:</p>
              <Button
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Analysing...</>
                ) : (
                  <><Sparkles className="h-3 w-3" /> Analyse vs {effectiveVillainType || "Unknown"}</>
                )}
              </Button>
            </div>
          )}

          {/* Grade */}
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-black ${gradeColors[analysis.grade] || "text-foreground"}`}>
              {analysis.grade}
            </div>
            <div>
              <div
                className={`font-bold text-base ${gradeColors[analysis.grade] || "text-foreground"}`}
                style={{ textShadow: "0 0 10px currentColor" }}
              >
                {analysis.gradeLabel}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{analysis.summary}</div>
            </div>
          </div>

          {/* Exploitative adjustments -- new section */}
          {analysis.exploitativeAdjustments?.length > 0 && (
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>⚡ Exploitative Adjustments</p>
              {analysis.exploitativeAdjustments.map((item: string, i: number) => (
                <p key={i} className="text-xs" style={{ color: "#e2e8f0" }}><span style={{ color: "#fbbf24", marginRight: 4 }}>-&gt;</span>{item}</p>
              ))}
            </div>
          )}

          {/* Street scores */}
          <div className="grid grid-cols-2 gap-2">
            {streets.map((s) => {
              const st = analysis.streets?.[s];
              if (!st) return null;
              return (
                <div key={s} className="rounded-lg p-2" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium capitalize" style={{ color: "#94a3b8" }}>{s}</span>
                    <span className="text-sm font-bold" style={{ color: st.score >= 7 ? "#4ade80" : st.score >= 5 ? "#fbbf24" : "#f87171" }}>{st.score}/10</span>
                  </div>
                  <p className="text-xs leading-snug" style={{ color: "#64748b" }}>{st.comment}</p>
                </div>
              );
            })}
          </div>

          {/* Did well / Mistakes */}
          {analysis.didWell?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#4ade80" }}>✓ What you did well</p>
              <div className="space-y-1">
                {analysis.didWell.map((item: string, i: number) => (
                  <p key={i} className="text-xs" style={{ color: "#94a3b8" }}>* {item}</p>
                ))}
              </div>
            </div>
          )}
          {analysis.mistakes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#f87171" }}>✗ Where you went wrong</p>
              <div className="space-y-1">
                {analysis.mistakes.map((item: string, i: number) => (
                  <p key={i} className="text-xs" style={{ color: "#94a3b8" }}>* {item}</p>
                ))}
              </div>
            </div>
          )}

          {/* Key lesson */}
          {analysis.keyLesson && (
            <div
              className="rounded-lg p-3"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#4ade80" }}>💡 Key Lesson</p>
              <p className="text-xs" style={{ color: "#e2e8f0" }}>{analysis.keyLesson}</p>
            </div>
          )}

          {/* Villain Roast */}
          {analysis.roast && <VillainRoastCard roast={analysis.roast} />}
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full gap-2"
            style={{
              background: effectiveVillainType
                ? "linear-gradient(135deg, #065f46, #047857)"
                : "linear-gradient(135deg, #1e293b, #0f172a)",
              color: effectiveVillainType ? "#6ee7b7" : "#64748b",
              border: effectiveVillainType ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: effectiveVillainType ? "0 0 16px rgba(16,185,129,0.2)" : "none",
            }}
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {effectiveVillainType ? `Analyse vs ${effectiveVillainType}` : "Analyse My Hand"}</>
            )}
          </Button>
          {effectiveVillainType && (
            <p className="text-[11px] text-center" style={{ color: "#475569" }}>
              Analysis will be tailored to exploit a <strong className="capitalize" style={{ color: "#94a3b8" }}>{effectiveVillainType}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Villain Roast Card ─────────────────────────────────────────────────────

function VillainRoastCard({ roast }: { roast: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(`"${roast}" -- Poker AI Coach`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Roast copied!");
  };
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.15), rgba(109,40,217,0.08))", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>🎭 Villain Roast</p>
      <p className="text-sm leading-relaxed italic" style={{ color: "#e2e8f0" }}>"{roast}"</p>
      <button
        onClick={handleCopy}
        className="text-[10px] px-2.5 py-1 rounded-full transition-all"
        style={{ background: copied ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)", color: copied ? "#a78bfa" : "#64748b", border: "1px solid rgba(167,139,250,0.2)" }}
      >
        {copied ? "Copied!" : "Copy for Stories"}
      </button>
    </div>
  );
}

// --- Spot the Mistake Challenge ───────────────────────────────────────────────

function SpotTheMistake({ slug, parsed, steps, currentStepIndex }: {
  slug: string;
  parsed: ParsedHand | undefined;
  steps: ReplayStep[];
  currentStepIndex: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const shareUrl = `${window.location.origin}/hand/${slug}`;

  if (!parsed) return null;

  // Find the most critical decision point (first hero action with a bet/raise)
  const criticalStep = steps.find((s) =>
    s.currentAction &&
    steps.indexOf(s) > 0 &&
    (s.currentAction.action === "raise" || s.currentAction.action === "bet" || s.currentAction.action === "call" || s.currentAction.action === "fold")
  );

  const challengeText = criticalStep
    ? `${criticalStep.street.toUpperCase()} -- ${criticalStep.players.find(p => p.isHero)?.position || "Hero"} faces a decision. What's the play?`
    : "Can you spot the key mistake in this hand?";

  const copyChallenge = () => {
    const text = `🃏 SPOT THE MISTAKE\n\n${challengeText}\n\nSee the full hand: ${shareUrl}\n\n#poker #pokerstrategy #spotthemistake`;
    navigator.clipboard.writeText(text);
    toast.success("Challenge copied for Stories!");
  };

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#f59e0b" }}>🎯 Spot the Mistake</p>
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>{challengeText}</p>
        {!revealed ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "#64748b" }}>Share this as a challenge -- let your followers guess before revealing the answer.</p>
            <div className="flex gap-2">
              <button
                onClick={copyChallenge}
                className="flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-all"
                style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                Copy for Stories
              </button>
              <button
                onClick={() => setRevealed(true)}
                className="flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Reveal Answer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>Answer: Step {steps.indexOf(criticalStep!) + 1} of {steps.length}</p>
            <p className="text-xs" style={{ color: "#94a3b8" }}>Use the replay controls to step through the hand and see the decision point.</p>
            <button
              onClick={() => setRevealed(false)}
              className="text-xs py-1.5 px-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Hide answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Hand Edit Mode ───────────────────────────────────────────────────────────

function HandEditPanel({ hand, onSaved }: { hand: any; onSaved: (newParsed: any, newRawText: string) => void }) {
  const [rawText, setRawText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openEdit = () => {
    // Sync latest rawText from hand prop each time edit is opened
    setRawText(hand.rawText || "");
    setIsEditing(true);
    // Focus textarea after modal renders
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const updateMutation = trpc.hands.update.useMutation({
    onError: (err: any) => toast.error("Save failed", { description: err.message }),
  });

  const parseMutation = trpc.hands.parseText.useMutation({
    onSuccess: async (data) => {
      if (data.parsed) {
        // Persist updated hand to DB
        try {
          await updateMutation.mutateAsync({ id: hand.id, rawText, parsedData: data.parsed });
        } catch {
          // DB save failed but we still update the UI
        }
        onSaved(data.parsed, rawText);
        setIsEditing(false);
        toast.success("Hand updated and re-simulated!");
      } else {
        toast.error("Could not parse the updated hand text.");
      }
    },
    onError: (err: any) => toast.error("Parse failed", { description: err.message }),
  });

  const handleSave = () => {
    parseMutation.mutate({ text: rawText });
  };

  if (!isEditing) {
    return (
      <button
        onClick={openEdit}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
        style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        Edit Hand
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-5 space-y-4"
        style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Edit Hand</p>
          <button onClick={() => setIsEditing(false)} style={{ color: "#64748b" }}>✕</button>
        </div>
        <p className="text-xs" style={{ color: "#475569" }}>Edit the hand text below. Saving will re-parse and re-simulate the hand from scratch. Coach analysis will be reset.</p>
        <textarea
          ref={textareaRef}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="flex-1 w-full text-xs rounded-lg p-3 font-mono resize-none outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            minHeight: 200,
            maxHeight: 400,
          }}
          rows={12}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-2.5 rounded-lg text-sm"
            style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={parseMutation.isPending || !rawText.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: parseMutation.isPending ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #065f46, #047857)",
              color: "#6ee7b7",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            {parseMutation.isPending ? "Re-simulating..." : "Save & Re-simulate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Replayer Page ───────────────────────────────────────────────────────

export default function HandReplayer() {
  const [, params] = useRoute("/hand/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";

  const { data: hand, isLoading } = trpc.hands.getBySlug.useQuery({ slug }, { enabled: !!slug });

  // Fire-and-forget: increment the global usage counter once when a hand loads
  const incrementUsage = trpc.stats.incrementUsage.useMutation();
  const hasIncrementedRef = useRef(false);
  useEffect(() => {
    if (hand && !hasIncrementedRef.current) {
      hasIncrementedRef.current = true;
      incrementUsage.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!hand]);

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"replay" | "share" | "coach">("replay");
  // Coach panel state: desktop = right side panel, mobile = bottom sheet
  // Persisted per-hand in sessionStorage so it reopens on return
  const coachSessionKey = `coach-panel-${slug}`;
  const [coachPanelOpen, setCoachPanelOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(coachSessionKey) === "1"; } catch { return false; }
  });
  const [mobileSheetMinimized, setMobileSheetMinimized] = useState(false);

  // Sync coachPanelOpen → sessionStorage whenever it changes
  useEffect(() => {
    try { sessionStorage.setItem(coachSessionKey, coachPanelOpen ? "1" : "0"); } catch { /* ignore */ }
  }, [coachPanelOpen, coachSessionKey]);
  const [descriptionKey, setDescriptionKey] = useState(0); // increment to trigger fade-in
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null); // ref for video export capture

  // Allow local override when user edits the hand
  const [localParsed, setLocalParsed] = useState<ParsedHand | null>(null);
  const [localRawText, setLocalRawText] = useState<string | null>(null);

  const parsed = (localParsed || hand?.parsedData) as ParsedHand | undefined;
  const steps = parsed ? buildReplaySteps(parsed) : [];
  const currentStep = steps[stepIndex];

  // Compute SPR and effective stack from current step
  // ── Board texture legend ────────────────────────────────────────────────────
  const boardTextureLegend = useMemo(() => {
    if (!currentStep || currentStep.communityCards.length === 0) return null;
    const cards = currentStep.communityCards;

    // Extract suits from community cards
    const suits = cards.map((c) => c.slice(-1).toLowerCase()).filter((s) => ["h", "d", "s", "c"].includes(s));
    if (suits.length === 0) return null;

    const SUIT_COLORS: Record<string, { color: string; symbol: string; label: string }> = {
      h: { color: "#e53e3e", symbol: "♥", label: "hearts" },
      d: { color: "#3182ce", symbol: "♦", label: "diamonds" },
      s: { color: "#a0aec0", symbol: "♠", label: "spades" },
      c: { color: "#38a169", symbol: "♣", label: "clubs" },
    };

    // Count suit frequencies
    const freq: Record<string, number> = {};
    for (const s of suits) freq[s] = (freq[s] || 0) + 1;
    const counts = Object.values(freq).sort((a, b) => b - a);
    const maxCount = counts[0];
    const totalCards = suits.length;

    // Determine texture label
    let textureLabel = "";
    let textureBg = "rgba(100,116,139,0.15)";
    let textureBorder = "rgba(100,116,139,0.3)";
    let textureColor = "#94a3b8";

    if (maxCount === totalCards && totalCards >= 3) {
      textureLabel = "Monotone";
      textureBg = "rgba(251,191,36,0.1)";
      textureBorder = "rgba(251,191,36,0.3)";
      textureColor = "#fbbf24";
    } else if (maxCount === 2 && totalCards >= 3) {
      textureLabel = totalCards === 3 ? "Flush Draw" : "Two-Tone";
      textureBg = "rgba(251,191,36,0.08)";
      textureBorder = "rgba(251,191,36,0.2)";
      textureColor = "#fbbf24";
    } else if (maxCount === 1 && totalCards >= 3) {
      textureLabel = "Rainbow";
      textureBg = "rgba(74,222,128,0.08)";
      textureBorder = "rgba(74,222,128,0.2)";
      textureColor = "#4ade80";
    } else if (totalCards === 2) {
      textureLabel = maxCount === 2 ? "Suited" : "Offsuit";
    } else if (totalCards === 1) {
      textureLabel = "";
    }

    // Build suit pip display — ordered by frequency desc
    const suitPips = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([s, count]) => ({
        ...SUIT_COLORS[s],
        count,
      }));

    // Check for paired board
    const ranks = cards.map((c) => c.slice(0, -1).toUpperCase());
    const rankFreq: Record<string, number> = {};
    for (const r of ranks) rankFreq[r] = (rankFreq[r] || 0) + 1;
    const isPaired = Object.values(rankFreq).some((n) => n >= 2);

    return { textureLabel, textureBg, textureBorder, textureColor, suitPips, isPaired };
  }, [currentStep]);

  const { spr, effStack } = useMemo(() => {
    if (!currentStep || currentStep.pot <= 0) return { spr: null, effStack: null };
    const hero = currentStep.players.find((p) => p.isHero);
    const activePlayers = currentStep.players.filter((p) => !p.hasFolded && !p.isHero);
    const villain = activePlayers.length > 0 ? activePlayers[activePlayers.length - 1] : null;
    const heroStack = hero?.stackSize ?? null;
    const villainStack = villain?.stackSize ?? null;
    if (heroStack == null || villainStack == null) return { spr: null, effStack: null };
    const eff = Math.min(heroStack, villainStack);
    const sprVal = currentStep.pot > 0 ? parseFloat((eff / currentStep.pot).toFixed(1)) : null;
    return { spr: sprVal, effStack: eff };
  }, [currentStep]);

  const handleHandSaved = (newParsed: ParsedHand, newRawText: string) => {
    setLocalParsed(newParsed);
    setLocalRawText(newRawText);
    setStepIndex(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 600);
  };

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

  // Auto-play -- 1667ms per step (1.5x speed)
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
      }, 1667);
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
  const ogImageUrl = `${window.location.origin}/api/og/${slug}`;
  const ogTitle = handTitle || `${heroCards} from ${parsed.heroPosition} - ${blinds} Poker Hand`;
  const ogDescription = `Replay and analyse this ${(parsed as any).gameType === "mtt" ? "MTT" : "cash"} hand. ${parsed.heroPosition} with ${heroCards} at ${blinds}. AI coaching included.`;

  return (
    <>
    <Helmet>
      <title>{ogTitle} | Poker AI</title>
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${window.location.origin}/hand/${slug}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Helmet>
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--poker-page-bg)" }}
    >
      {/* Desktop Coach Side Panel -- fixed right panel, only visible on lg+ */}
      {coachPanelOpen && (
        <div
          className="hidden lg:flex flex-col fixed top-0 right-0 h-full z-40"
          style={{
            width: "420px",
            background: "var(--poker-surface)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid var(--poker-border)",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--poker-border)", background: "var(--poker-surface)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#fbbf24" }} />
              <span className="text-sm font-bold" style={{ color: "var(--poker-text)" }}>AI Coach</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--poker-amber-subtle)", color: "var(--poker-amber)", border: "1px solid var(--poker-amber-subtle-border)" }}>Claude</span>
            </div>
            <button
              onClick={() => setCoachPanelOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Panel content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <CoachPanel
              handId={hand.id}
              isUnlocked={hand.coachUnlocked}
              cachedAnalysis={hand.coachAnalysis}
              storedVillainType={(hand as any).villainType}
            />
          </div>
        </div>
      )}

      {/* Mobile Coach Bottom Sheet -- only visible on <lg */}
      {coachPanelOpen && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: "var(--poker-surface)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--poker-border-strong)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
            maxHeight: mobileSheetMinimized ? "48px" : "75vh",
            transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
          }}
        >
          {/* Sheet drag handle + header */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer"
            style={{ borderBottom: mobileSheetMinimized ? "none" : `1px solid var(--poker-border)` }}
            onClick={() => setMobileSheetMinimized(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#fbbf24" }} />
              <span className="text-xs font-bold" style={{ color: "var(--poker-text)" }}>AI Coach</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--poker-amber-subtle)", color: "var(--poker-amber)", border: "1px solid var(--poker-amber-subtle-border)" }}>Claude</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="w-6 h-6 flex items-center justify-center rounded-md"
                style={{ color: "var(--poker-text-muted)", background: "var(--poker-surface-2)" }}
                onClick={(e) => { e.stopPropagation(); setMobileSheetMinimized(v => !v); }}
              >
                {mobileSheetMinimized ? <ChevronUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded-md"
                style={{ color: "var(--poker-text-muted)", background: "var(--poker-surface-2)" }}
                onClick={(e) => { e.stopPropagation(); setCoachPanelOpen(false); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          {/* Sheet content */}
          {!mobileSheetMinimized && (
            <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(75vh - 48px)" }}>
              <CoachPanel
                handId={hand.id}
                isUnlocked={hand.coachUnlocked}
                cachedAnalysis={hand.coachAnalysis}
                storedVillainType={(hand as any).villainType}
              />
            </div>
          )}
        </div>
      )}
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: "var(--poker-header-bg)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--poker-border)",
          boxShadow: "0 1px 0 var(--poker-header-shadow)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--poker-green)", background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            {handTitle && (
              <div className="font-semibold text-sm truncate leading-tight" style={{ color: "var(--poker-text)" }}>{handTitle}</div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm" style={{ color: "var(--poker-green)" }}>{heroCards}</span>
              <span className="text-xs" style={{ color: "var(--poker-text-muted)" }}>{parsed.heroPosition} . {blinds}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <HandEditPanel hand={{ ...hand, rawText: localRawText || hand.rawText }} onSaved={handleHandSaved} />
          <button
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "var(--poker-amber-subtle)",
              color: "var(--poker-amber)",
              border: coachPanelOpen ? "1px solid var(--poker-amber)" : "1px solid var(--poker-amber-subtle-border)",
            }}
            onClick={() => { setCoachPanelOpen(v => !v); setMobileSheetMinimized(false); }}
            title="AI Coach analysis"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Coach</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "var(--poker-green)",
              color: "var(--poker-green-fg)",
              border: "1px solid var(--poker-green-subtle-border)",
            }}
            onClick={() => setActiveTab("share")}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* Main content — shifts left on desktop when coach panel is open */}
      <div
        className="flex flex-col flex-1 transition-all duration-300"
        style={{ marginRight: coachPanelOpen ? "0" : "0" }}
      >

      {/* Table + narration -- captured for video export */}
      <div ref={captureRef} style={{ background: "var(--poker-page-bg)" }}>
      {/* Table -- swipe left/right to step through hand */}
      <div
        className="w-full max-w-lg mx-auto px-4 pt-4"
        style={{ paddingRight: coachPanelOpen ? undefined : undefined }}
        {...swipeHandlers}
      >
        {currentStep && (
          <PokerTable
            players={currentStep.players}
            communityCards={currentStep.communityCards}
            potSize={currentStep.pot}
            currentAction={currentStep.currentAction}
            street={currentStep.street}
            spr={spr}
          />
        )}
      </div>

      {/* Action description -- always visible, fades in on each step */}
      <div className="px-4 pt-3 pb-2 max-w-lg mx-auto w-full">
        {currentStep && (
          <div
            key={descriptionKey}
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--poker-surface)",
              border: "1px solid var(--poker-border)",
              animation: "fadeSlideIn 0.35s ease",
            }}
          >
            {/* Street badge + Eff stack row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: "var(--poker-green)", background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
              >
                {currentStep.street}
              </span>
              {/* Effective stack badge with BB depth */}
              {effStack != null && effStack > 0 && (() => {
                const bb = parsed.bigBlind || 0;
                const effLabel = effStack >= 1_000_000
                  ? `${(effStack / 1_000_000).toFixed(1)}M`
                  : effStack >= 1_000
                  ? `${(effStack / 1_000).toFixed(1)}k`
                  : effStack.toLocaleString();
                const bbDepth = bb > 0 ? Math.round(effStack / bb) : null;
                return (
                  <span
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: "var(--poker-blue)",
                      background: "var(--poker-blue-subtle)",
                      border: "1px solid var(--poker-blue-subtle-border)",
                      fontFamily: "monospace",
                    }}
                  >
                    Eff: {effLabel}{bbDepth != null ? ` (${bbDepth}bb)` : ""}
                  </span>
                );
              })()}
            </div>
            {/* Board texture legend */}
            {boardTextureLegend && (
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {/* Suit pips */}
                {boardTextureLegend.suitPips.map((pip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold"
                    style={{ color: pip.color }}
                  >
                    {Array.from({ length: pip.count }, (_, j) => (
                      <span key={j}>{pip.symbol}</span>
                    ))}
                  </span>
                ))}
                {/* Texture label */}
                {boardTextureLegend.textureLabel && (
                  <span
                    className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      color: boardTextureLegend.textureColor,
                      background: boardTextureLegend.textureBg,
                      border: `1px solid ${boardTextureLegend.textureBorder}`,
                    }}
                  >
                    {boardTextureLegend.textureLabel}
                  </span>
                )}
                {/* Paired board indicator */}
                {boardTextureLegend.isPaired && (
                  <span
                    className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      color: "#f87171",
                      background: "rgba(248,113,113,0.1)",
                      border: "1px solid rgba(248,113,113,0.25)",
                    }}
                  >
                    Paired
                  </span>
                )}
              </div>
            )}
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: currentStep.currentAction === null ? "var(--poker-green)" : "var(--poker-text)" }}
            >
              {currentStep.description}
            </p>
            {/* Step counter */}
            <p className="text-[11px] mt-1" style={{ color: "var(--poker-text-muted)" }}>
              Action {stepIndex + 1} of {steps.length}
            </p>
          </div>
        )}
      </div>
      </div>{/* end captureRef */}

      {/* Controls */}
      <div className="px-4 pb-3 max-w-lg mx-auto w-full space-y-3">
        {/* Progress bar (custom styled) */}
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--poker-surface-2)" }}>
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
            style={{ color: stepIndex === 0 ? "var(--poker-border)" : "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
            onClick={() => goTo(0)} disabled={stepIndex === 0}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          {/* Prev */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex === 0 ? "var(--poker-border)" : "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
            onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          {/* Play/Pause -- hero button */}
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
            style={{ color: stepIndex >= steps.length - 1 ? "var(--poker-border)" : "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
            onClick={() => goTo(stepIndex + 1)} disabled={stepIndex >= steps.length - 1}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          {/* Skip to end */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: stepIndex >= steps.length - 1 ? "var(--poker-border)" : "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
            onClick={() => goTo(steps.length - 1)} disabled={stepIndex >= steps.length - 1}
          >
            <SkipBack className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="max-w-lg mx-auto w-full" style={{ borderTop: "1px solid var(--poker-border)" }}>
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
                color: activeTab === tab.id ? "var(--poker-green)" : "var(--poker-text-muted)",
                borderTop: activeTab === tab.id ? "2px solid var(--poker-green)" : "2px solid transparent",
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
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--poker-green)" }}>Hand Summary</p>
              <div
                className="font-mono text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg"
                style={{ color: "var(--poker-text-muted)", background: "var(--poker-surface-2)", border: "1px solid var(--poker-border)" }}
              >
                {hand.rawText}
              </div>
              {parsed.parseNotes && (
                <NoteToggle note={parsed.parseNotes} />
              )}
            </div>
          )}

          {activeTab === "share" && (
            <div className="space-y-4">
              <ShareSheet slug={slug} rawText={hand.rawText} />

              {/* Spot the Mistake Challenge */}
              <SpotTheMistake slug={slug} parsed={parsed} steps={steps} currentStepIndex={stepIndex} />

              <div style={{ borderTop: "1px solid var(--poker-border)", paddingTop: "1rem" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--poker-green)" }}>Video Export</p>
                <VideoExport
                  captureRef={captureRef}
                  totalSteps={steps.length}
                  goToStep={(i) => { setStepIndex(i); setIsPlaying(false); }}
                  title={(hand as any).title as string | undefined}
                />
              </div>
            </div>
          )}

          {activeTab === "coach" && (
            <CoachPanel
              handId={hand.id}
              isUnlocked={hand.coachUnlocked}
              cachedAnalysis={hand.coachAnalysis}
              storedVillainType={(hand as any).villainType}
            />
          )}
        </div>
      </div>
      </div>{/* end main content wrapper */}
    </div>
    </>
  );
}
