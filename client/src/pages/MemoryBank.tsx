/**
 * Memory Bank — Cross-hand leak pattern detection
 * Shows recurring mistakes categorised by type, with frequency, severity, and drills
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Brain,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronRight,
  BookOpen,
  Target,
  Zap,
} from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "Critical" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", label: "High" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", label: "Medium" },
  low: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", label: "Low" },
};

const CATEGORY_DRILLS: Record<string, string> = {
  "Overcalling river bets": "Next 20 sessions: when facing a river bet, write down your hand strength and the pot odds before calling. Fold anything below top pair unless you have a clear read.",
  "Over-3betting OOP": "Tighten your OOP 3-bet range to value only (QQ+, AK) until you're comfortable. Add bluffs only from positions where you have range advantage.",
  "Passive flop play (checking top pair)": "Default to c-betting top pair on dry boards. Only check-call when the board heavily favours villain's range (e.g. you open UTG, board is 9-8-7).",
  "Undersized c-bets": "Use 50-60% pot as your default c-bet size on dry boards, 75%+ on wet boards. Never bet less than 33% pot — it gives draws too good a price.",
  "Oversized bluffs": "Cap your bluff sizing at 75% pot on the river. Larger bets don't fold out more hands — they just cost you more when called.",
  "Calling too wide vs 3-bets": "Build a concrete 4-bet/fold/call chart for each position. Fold hands that don't have clear equity or playability post-flop (e.g. KJo from UTG vs a BTN 3-bet).",
  "Folding too often to c-bets": "Track your fold-to-c-bet stat. If it's above 55%, you're over-folding. Defend more with middle pair + backdoor draws on boards that hit your range.",
  "Not protecting BB": "From BB, you're getting a discount — defend wider. Any two cards with 35%+ equity vs villain's range is a profitable call at standard bet sizes.",
  "Slow-playing strong hands": "On wet boards, fast-play sets and two-pair. Slow-play only on dry boards (rainbow, no straight draws) where villain has nothing to draw to.",
  "Ignoring flush draw charges": "When you have top pair on a two-flush board, bet 60-75% pot to charge draws. Checking gives them a free card worth 18% equity.",
  "Positional awareness": "Before every hand, note your position and adjust your opening range accordingly. UTG opens 15% of hands; BTN opens 45%.",
  "Turn aggression": "When you c-bet the flop and get called, have a plan for the turn before it comes. Identify your barrel hands (strong draws, top pair+) vs give-up hands.",
  "River value betting": "If you'd call a river bet with your hand, you should usually be betting it. Checking back value on the river is a major leak at mid-stakes.",
  "Preflop range construction": "Map out your opening ranges for each position using a simple chart. Stick to it for 1,000 hands before making adjustments based on results.",
};

export default function MemoryBank() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data, isLoading } = trpc.memoryBank.getLeaks.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--poker-page-bg)" }}>
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--poker-page-bg)" }}>
        <div className="text-center space-y-4 max-w-sm px-4">
          <Lock className="h-12 w-12 mx-auto" style={{ color: "var(--poker-green)" }} />
          <h2 className="text-2xl font-bold" style={{ color: "var(--poker-text)" }}>Sign in to access Memory Bank</h2>
          <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>
            Memory Bank tracks your leaks across all saved hands. Sign in to see your patterns.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white"
            style={{ background: "var(--poker-green)" }}
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--poker-page-bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--poker-header-bg)", borderColor: "var(--poker-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/my-hands">
            <button className="text-sm font-medium" style={{ color: "var(--poker-text-muted)" }}>← My Hands</button>
          </Link>
          <span style={{ color: "var(--poker-text-muted)" }}>/</span>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: "var(--poker-green)" }} />
            <span className="font-bold text-white">Memory Bank</span>
          </div>
        </div>
        <Link href="/coach">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--poker-green-subtle)", color: "var(--poker-green)", border: "1px solid var(--poker-green-subtle-border)" }}
          >
            <Zap className="h-3.5 w-3.5" />
            Ask Coach
          </button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Memory Bank</h1>
          <p style={{ color: "var(--poker-text-muted)" }} className="text-sm">
            Recurring patterns and leaks detected across your entire hand history.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>Scanning your hand history...</p>
            </div>
          </div>
        ) : !data?.hasData ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="h-12 w-12 mx-auto" style={{ color: "var(--poker-text-muted)" }} />
            <h3 className="text-lg font-semibold text-white">No data yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--poker-text-muted)" }}>
              Save and analyse at least 3 hands with the AI Coach to start building your Memory Bank.
            </p>
            <Link href="/">
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--poker-green)" }}
              >
                Analyse a Hand
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Hands Saved", value: data.totalHands, icon: <BookOpen className="h-4 w-4" /> },
                { label: "Hands Coached", value: data.coachedHands, icon: <Brain className="h-4 w-4" /> },
                { label: "Leak Categories", value: data.categories.length, icon: <AlertTriangle className="h-4 w-4" /> },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)" }}
                >
                  <div className="flex justify-center mb-2" style={{ color: "var(--poker-green)" }}>{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--poker-text-muted)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Leak categories */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" style={{ color: "#ef4444" }} />
                Identified Leaks
              </h2>
              <div className="space-y-3">
                {data.categories.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}
                  >
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: "#22c55e" }} />
                    <p className="text-sm font-semibold text-white">No recurring leaks detected</p>
                    <p className="text-xs mt-1" style={{ color: "#64748b" }}>Your coached hands show no consistent patterns. Keep adding hands to build a more complete picture.</p>
                  </div>
                ) : (
                  data.categories.map((cat) => {
                    const sev = SEVERITY_CONFIG[cat.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                    const drill = CATEGORY_DRILLS[cat.name] || "Review your hands in this category and identify the common thread.";
                    return (
                      <div
                        key={cat.name}
                        className="rounded-xl overflow-hidden"
                        style={{ background: "var(--poker-surface)", border: `1px solid ${sev.border}` }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: sev.bg, color: sev.color }}
                                >
                                  {sev.label}
                                </span>
                                <span className="text-xs" style={{ color: "var(--poker-text-muted)" }}>
                                  {cat.occurrences}× detected
                                </span>
                              </div>
                              <h3 className="font-semibold text-white text-sm">{cat.name}</h3>
                              {cat.examples[0] && (
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: "#94a3b8" }}>
                                  "{cat.examples[0]}"
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold" style={{ color: "#ef4444" }}>
                                -{cat.estimatedBuyinImpact}
                              </div>
                              <div className="text-xs" style={{ color: "var(--poker-text-muted)" }}>est. buy-ins</div>
                            </div>
                          </div>

                          {/* Frequency bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--poker-text-muted)" }}>
                              <span>Frequency</span>
                              <span>{Math.round(cat.frequency * 100)}% of hands</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: "var(--poker-surface-2)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(cat.frequency * 100, 100)}%`, background: sev.color }}
                              />
                            </div>
                          </div>

                          {/* Drill */}
                          <div
                            className="mt-3 rounded-lg p-3"
                              style={{ background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
                          >
                            <div className="flex items-start gap-2">
                              <Target className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--poker-green)" }} />
                              <div>
                                <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--poker-green)" }}>Drill</p>
                                <p className="text-xs leading-relaxed" style={{ color: "var(--poker-text-muted)" }}>{drill}</p>
                              </div>
                            </div>
                          </div>

                          {/* Link to hands */}
                          {cat.handIds.length > 0 && (
                            <div className="mt-2 flex justify-end">
                              <Link href="/my-hands">
                                <button
                                  className="flex items-center gap-1 text-xs"
                                  style={{ color: "var(--poker-text-muted)" }}
                                >
                                  View {cat.handIds.length} hand{cat.handIds.length > 1 ? "s" : ""}
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CTA to analyse more hands */}
            {(data.coachedHands || 0) < 10 && (
              <div
                className="rounded-xl p-5 text-center"
                style={{ background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
              >
                <p className="text-sm font-semibold text-white mb-1">
                  {10 - (data.coachedHands || 0)} more coached hands for deeper patterns
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--poker-text-muted)" }}>
                  The more hands you analyse, the more accurate your leak profile becomes.
                </p>
                <Link href="/">
                  <button
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "var(--poker-green)" }}
                  >
                    Analyse Another Hand
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
