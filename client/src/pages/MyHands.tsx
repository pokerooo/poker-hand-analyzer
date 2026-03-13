import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus, Share2, Trash2, ChevronRight, Flame, TrendingDown, AlertTriangle, Upload, BarChart2, Brain, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Streak Badge ─────────────────────────────────────────────────────────────

function StreakBadge({ streak, longestStreak }: { streak: number; longestStreak: number }) {
  if (streak === 0) return null;
  const isOnFire = streak >= 7;
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
      style={{
        background: isOnFire
          ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))"
          : "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(74,222,128,0.04))",
        border: isOnFire
          ? "1px solid rgba(239,68,68,0.25)"
          : "1px solid rgba(16,185,129,0.2)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isOnFire ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.12)",
          boxShadow: isOnFire ? "0 0 16px rgba(239,68,68,0.3)" : "0 0 12px rgba(16,185,129,0.2)",
        }}
      >
        <Flame className="h-5 w-5" style={{ color: isOnFire ? "#ef4444" : "#4ade80" }} />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black" style={{ color: isOnFire ? "#f87171" : "#4ade80" }}>
            {streak}
          </span>
          <span className="text-sm font-semibold" style={{ color: isOnFire ? "#fca5a5" : "#6ee7b7" }}>
            day streak
          </span>
          {isOnFire && <span className="text-xs" style={{ color: "#fbbf24" }}>🔥 On fire!</span>}
        </div>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Best: {longestStreak} days · Study every day to keep it going
        </p>
      </div>
    </div>
  );
}

// ─── EV Leak Report ───────────────────────────────────────────────────────────

function LeakReport({ hands }: { hands: any[] }) {
  const coached = hands.filter((h) => h.coachUnlocked && h.coachAnalysis);
  if (coached.length < 2) return null;

  // Aggregate leak patterns from coach analysis
  const allMistakes: string[] = [];
  const gradeMap: Record<string, number> = {};

  coached.forEach((h) => {
    const analysis = h.coachAnalysis as any;
    if (!analysis) return;
    if (analysis.mistakes) allMistakes.push(...analysis.mistakes);
    if (analysis.grade) gradeMap[analysis.grade] = (gradeMap[analysis.grade] || 0) + 1;
  });

  // Find most common mistake keywords
  const keywords = ["check", "fold", "call", "raise", "bet", "bluff", "value", "passive", "aggressive", "position", "pot", "draw"];
  const keywordCounts: Record<string, number> = {};
  allMistakes.forEach((m) => {
    const lower = m.toLowerCase();
    keywords.forEach((kw) => {
      if (lower.includes(kw)) keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });

  const topLeaks = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const avgGrade = (() => {
    const gradeOrder = ["A", "B", "C", "D", "F"];
    const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const total = Object.entries(gradeMap).reduce((sum, [g, count]) => sum + (gradeValues[g] || 0) * count, 0);
    const count = Object.values(gradeMap).reduce((a, b) => a + b, 0);
    const avg = total / count;
    const idx = Math.round(4 - avg);
    return gradeOrder[Math.max(0, Math.min(4, idx))];
  })();

  const leakLabels: Record<string, string> = {
    passive: "Passive play — not betting/raising enough for value",
    check: "Over-checking — missing value bets in position",
    fold: "Over-folding — giving up equity too cheaply",
    bluff: "Bluff frequency issues — timing or frequency off",
    call: "Over-calling — calling too wide without equity",
    value: "Under-betting for value — leaving chips on the table",
    position: "Positional leaks — not adjusting to being OOP/IP",
    pot: "Pot control issues — not managing pot size correctly",
    draw: "Draw mismanagement — incorrect pricing or aggression",
    raise: "Under-raising — missing spots to build the pot",
    bet: "Bet sizing issues — sizing not matching board texture",
    aggressive: "Over-aggression — barreling without equity",
  };

  if (topLeaks.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 mb-4 space-y-3"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.04))",
        border: "1px solid rgba(239,68,68,0.2)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" style={{ color: "#f87171" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#f87171" }}>
            Session Leak Report
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "#64748b" }}>Avg grade</span>
          <span
            className="text-sm font-black px-2 py-0.5 rounded"
            style={{
              color: avgGrade === "A" ? "#4ade80" : avgGrade === "B" ? "#34d399" : avgGrade === "C" ? "#fbbf24" : "#f87171",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {avgGrade}
          </span>
        </div>
      </div>

      <p className="text-xs" style={{ color: "#64748b" }}>
        Based on {coached.length} coached hand{coached.length !== 1 ? "s" : ""}. Recurring patterns:
      </p>

      <div className="space-y-2">
        {topLeaks.map(([kw, count]) => (
          <div key={kw} className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: "#e2e8f0" }}>
                {leakLabels[kw] || kw}
              </p>
              <p className="text-[10px]" style={{ color: "#475569" }}>
                Flagged in {count} of {coached.length} hands
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px]" style={{ color: "#334155" }}>
        Analyse more hands with AI Coach to improve leak detection accuracy.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyHands() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  const { data: hands, isLoading, refetch } = trpc.hands.myHands.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: streakData } = trpc.streak.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.hands.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Hand deleted");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: "linear-gradient(160deg, #0a0f0d 0%, #0d1a12 50%, #0a0f0d 100%)" }}
      >
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>Sign in to see your hands</h2>
        <p style={{ color: "#64748b" }}>Your saved hands will appear here after you sign in.</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
        <Button variant="ghost" onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0f0d 0%, #0d1a12 50%, #0a0f0d 100%)" }}
    >
      {/* Header */}
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: "rgba(10,15,13,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(16,185,129,0.12)",
          boxShadow: "0 1px 0 rgba(16,185,129,0.06)",
        }}
      >
        {/* Top bar: back + title + theme + new hand */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
              style={{ color: "#6ee7b7", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="font-bold" style={{ color: "#e2e8f0" }}>{t("myHandsTitle")}</span>
            {hands && hands.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(16,185,129,0.12)", color: "#4ade80", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                {hands.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle inline />
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #065f46, #047857)",
                color: "#6ee7b7",
                border: "1px solid rgba(16,185,129,0.3)",
                boxShadow: "0 0 12px rgba(16,185,129,0.2)",
              }}
              onClick={() => navigate("/")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("myHandsNewHand")}</span>
            </button>
          </div>
        </div>

        {/* Nav pill row — horizontally scrollable on mobile, no overflow clipping */}
        <div
          className="flex items-center gap-2 px-4 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(16,185,129,0.08)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            onClick={() => navigate("/import")}
          >
            <Upload className="h-3.5 w-3.5" /> {t("myHandsImport")}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
            onClick={() => navigate("/patterns")}
          >
            <BarChart2 className="h-3.5 w-3.5" /> {t("myHandsPatterns")}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
            onClick={() => navigate("/memory-bank")}
          >
            <Brain className="h-3.5 w-3.5" /> {t("myHandsMemory")}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(234,179,8,0.08)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.2)" }}
            onClick={() => navigate("/coach")}
          >
            <Zap className="h-3.5 w-3.5" /> {t("myHandsCoach")}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(59,130,246,0.08)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}
            onClick={() => navigate("/win-rate")}
          >
            <TrendingUp className="h-3.5 w-3.5" /> {t("myHandsWinRate")}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
            style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}
            onClick={() => navigate("/profile")}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Player Profile
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4ade80" }} />
          </div>
        ) : !hands || hands.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🃏</div>
            <h3 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>{t("myHandsNoHands")}</h3>
            <p style={{ color: "#64748b" }}>{t("myHandsNoHandsDesc")}</p>
            <Button onClick={() => navigate("/")}>{t("myHandsGoHome")}</Button>
          </div>
        ) : (
          <>
            {/* Streak badge */}
            {streakData && (
              <StreakBadge
                streak={streakData.streak}
                longestStreak={streakData.longestStreak}
              />
            )}

            {/* EV Leak Report */}
            <LeakReport hands={hands} />

            {/* Hand list */}
            <div className="space-y-3">
              {hands.map((hand) => {
                const parsed = hand.parsedData as any;
                const heroCards = parsed?.heroCards?.join(" ") || "?";
                const position = parsed?.heroPosition || "?";
                const blinds = `${parsed?.smallBlind ?? "?"}/${parsed?.bigBlind ?? "?"}`;
                const streets = parsed?.streets?.length || 0;
                const analysis = hand.coachAnalysis as any;
                const grade = analysis?.grade;
                const gradeColor = grade === "A" ? "#4ade80" : grade === "B" ? "#34d399" : grade === "C" ? "#fbbf24" : grade === "D" ? "#fb923c" : grade === "F" ? "#f87171" : null;

                return (
                  <div
                    key={hand.id}
                    className="rounded-xl cursor-pointer transition-all"
                    style={{
                      background: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                    onClick={() => navigate(`/hand/${hand.shareSlug}`)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.25)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(16,185,129,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                             <span className="font-mono font-black text-base" style={{ color: "var(--poker-green)" }}>
                              {heroCards}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                            >
                              {position}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-mono"
                              style={{ background: "rgba(16,185,129,0.08)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.15)" }}
                            >
                              {blinds}
                            </span>
                            {hand.coachUnlocked && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
                              >
                                🧠 Coached
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono line-clamp-1" style={{ color: "#475569" }}>
                            {hand.rawText.slice(0, 100)}
                          </p>
                          <p className="text-xs" style={{ color: "#334155" }}>
                            {formatDistanceToNow(new Date(hand.createdAt), { addSuffix: true })} · {streets} streets
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {grade && gradeColor && (
                            <div
                              className="w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm"
                              style={{ color: gradeColor, background: "rgba(255,255,255,0.04)", border: `1px solid ${gradeColor}33` }}
                            >
                              {grade}
                            </div>
                          )}
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                            style={{ color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/hand/${hand.shareSlug}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Link copied!");
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                            style={{ color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this hand?")) {
                                deleteMutation.mutate({ id: hand.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4" style={{ color: "#334155" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
