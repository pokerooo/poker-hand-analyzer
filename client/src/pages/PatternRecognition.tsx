import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ProPaywall from "@/components/ProPaywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, BarChart2, AlertTriangle, TrendingUp, Zap, Target, Brain, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── Severity colours ─────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#f87171", label: "Critical" },
  high:     { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", label: "High" },
  medium:   { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",  text: "#34d399", label: "Medium" },
  low:      { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", text: "#94a3b8", label: "Low" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Preflop":           <Zap className="h-4 w-4" />,
  "Postflop":          <Target className="h-4 w-4" />,
  "Sizing":            <BarChart2 className="h-4 w-4" />,
  "Positional":        <Shield className="h-4 w-4" />,
  "Mental Game":       <Brain className="h-4 w-4" />,
  "Range Construction":<TrendingUp className="h-4 w-4" />,
};

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  "beginner":     { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  "recreational": { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
  "semi-pro":     { bg: "rgba(16,185,129,0.12)", text: "#34d399" },
  "regular":      { bg: "rgba(99,102,241,0.12)", text: "#818cf8" },
  "strong reg":   { bg: "rgba(139,92,246,0.12)", text: "#a78bfa" },
};

// ─── Grade Bar ────────────────────────────────────────────────────────────────

function GradeBar({ gradeDist }: { gradeDist: Record<string, number> }) {
  const total = Object.values(gradeDist).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const grades = ["A", "B", "C", "D", "F"];
  const gradeColors: Record<string, string> = {
    A: "#4ade80", B: "#34d399", C: "#fbbf24", D: "#fb923c", F: "#f87171",
  };
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--poker-surface)", borderColor: "var(--poker-border)" }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--poker-text-muted)" }}>Grade Distribution</h3>
      <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
        {grades.map((g) => {
          const count = gradeDist[g] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={g}
              title={`${g}: ${count} hand${count !== 1 ? "s" : ""}`}
              style={{ width: `${pct}%`, background: gradeColors[g], opacity: 0.85 }}
              className="flex items-center justify-center text-xs font-black text-black"
            >
              {pct > 8 ? g : ""}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2">
        {grades.map((g) => {
          const count = gradeDist[g] || 0;
          if (count === 0) return null;
          return (
            <div key={g} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: gradeColors[g] }} />
              <span className="text-xs" style={{ color: "var(--poker-text-muted)" }}>{g}: {count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pattern Card ─────────────────────────────────────────────────────────────

function PatternCard({ pattern, index }: { pattern: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[pattern.severity] || SEVERITY_STYLES.medium;
  const icon = CATEGORY_ICONS[pattern.category] || <AlertTriangle className="h-4 w-4" />;

  return (
    <div
      className="rounded-xl border transition-all cursor-pointer"
      style={{ background: sev.bg, borderColor: sev.border }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "var(--poker-surface-2)", color: sev.text }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: "var(--poker-text)" }}>
                {index + 1}. {pattern.title}
              </span>
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}
              >
                {sev.label}
              </Badge>
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ background: "var(--poker-surface-2)", color: "var(--poker-text-muted)", border: "1px solid var(--poker-border)" }}
              >
                {pattern.category}
              </Badge>
              {pattern.frequency && (
                <Badge
                  className="text-[10px] px-1.5 py-0"
                style={{ background: "var(--poker-surface-2)", color: "var(--poker-text-muted)", border: "1px solid var(--poker-border)" }}
              >
                {pattern.frequency}
                </Badge>
              )}
            </div>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--poker-text-muted)" }}>
              {pattern.description}
            </p>
          </div>
          {pattern.estimatedBuyinImpact > 0 && (
            <div className="shrink-0 text-right">
              <div className="text-sm font-black" style={{ color: "#f87171" }}>
                -{pattern.estimatedBuyinImpact}
              </div>
              <div className="text-[10px]" style={{ color: "var(--poker-text-muted)" }}>BI/100</div>
            </div>
          )}
        </div>
      </div>
      {expanded && pattern.drill && (
        <div
          className="px-4 pb-4 pt-0 border-t"
          style={{ borderColor: sev.border }}
        >
          <div
            className="rounded-lg p-3 mt-3"
            style={{ background: "var(--poker-surface)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Target className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--poker-green)" }}>Study Drill</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--poker-text-muted)" }}>
              {pattern.drill}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatternRecognition() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const isPro = (user as any)?.isPro ?? false;

  const { data, isLoading, error, refetch } = trpc.patterns.analyze.useQuery(
    { minHands: 3 },
    { enabled: isAuthenticated && isPro }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--poker-page-bg)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#10b981" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--poker-page-bg)", color: "var(--poker-text)" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10"
        style={{ borderColor: "var(--poker-border)", background: "var(--poker-header-bg)", backdropFilter: "blur(12px)" }}
      >
        <button
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--poker-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--poker-green)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--poker-text-muted)")}
          onClick={() => navigate("/my-hands")}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("myHands")}
        </button>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" style={{ color: "#a78bfa" }} />
          <span className="font-semibold text-base">{t("patternTitle")}</span>
        </div>
        <Badge
          className="text-[10px] px-2 py-0.5 ml-1"
          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          PRO
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle inline />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Not authenticated */}
        {!isAuthenticated && (
          <div
            className="rounded-xl p-8 text-center border"
            style={{ background: "var(--poker-surface)", borderColor: "var(--poker-border)" }}
          >
            <BarChart2 className="h-10 w-10 mx-auto mb-4" style={{ color: "#a78bfa" }} />
            <h2 className="text-xl font-bold mb-2">Sign in to analyse patterns</h2>
            <p className="text-sm mb-6" style={{ color: "var(--poker-text-muted)" }}>
              Pattern recognition requires a Pro subscription. Sign in first.
            </p>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </div>
        )}

        {/* Pro paywall */}
        {isAuthenticated && !isPro && (
          <ProPaywall feature="patterns" />
        )}

        {/* Loading */}
        {isAuthenticated && isPro && isLoading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#a78bfa" }} />
            <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>
              Analysing your hand history for patterns…
            </p>
          </div>
        )}

        {/* Error */}
        {isAuthenticated && isPro && error && (
          <div
            className="rounded-xl p-6 text-center border"
            style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}
          >
            <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: "#f87171" }} />
            <p className="text-sm mb-4" style={{ color: "#f87171" }}>{error.message}</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* Not enough data */}
        {isAuthenticated && isPro && data && !data.hasEnoughData && (
          <div
            className="rounded-xl p-8 text-center border"
            style={{ background: "var(--poker-surface)", borderColor: "var(--poker-border)" }}
          >
            <BarChart2 className="h-12 w-12 mx-auto mb-4" style={{ color: "#a78bfa", opacity: 0.5 }} />
            <h2 className="text-xl font-bold mb-2">Not enough data yet</h2>
            <p className="text-sm mb-2" style={{ color: "var(--poker-text-muted)" }}>
              You have {data.handsAnalyzed} hand{data.handsAnalyzed !== 1 ? "s" : ""} — need at least {data.minRequired} to detect patterns.
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--poker-text-muted)" }}>
              Add more hands and run AI Coach analysis on them to improve accuracy.
            </p>
            <Button onClick={() => navigate("/")}>Add a Hand</Button>
          </div>
        )}

        {/* Results */}
        {isAuthenticated && isPro && data && data.hasEnoughData && (
          <>
            {/* Summary card */}
            <div
              className="rounded-xl p-5 border"
              style={{ background: "var(--poker-surface)", borderColor: "rgba(139,92,246,0.2)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "var(--poker-text)" }}>
                    Your Game Profile
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--poker-text-muted)" }}>
                    Based on {data.handsAnalyzed} hands
                  </p>
                </div>
                {data.overallLevel && LEVEL_STYLES[data.overallLevel] && (
                  <div
                    className="px-3 py-1.5 rounded-lg text-sm font-bold shrink-0"
                    style={{
                      background: LEVEL_STYLES[data.overallLevel].bg,
                      color: LEVEL_STYLES[data.overallLevel].text,
                    }}
                  >
                    {data.overallLevel.charAt(0).toUpperCase() + data.overallLevel.slice(1)}
                  </div>
                )}
              </div>
              {data.summary && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--poker-text-muted)" }}>
                  {data.summary}
                </p>
              )}
              {data.nextStudyFocus && (
                <div
                  className="mt-4 rounded-lg p-3 flex items-start gap-2"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                >
                  <Brain className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
                  <div>
                    <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Priority Study Focus: </span>
                    <span className="text-xs" style={{ color: "#94a3b8" }}>{data.nextStudyFocus}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grade distribution */}
            {data.gradeDistribution && (
              <GradeBar gradeDist={data.gradeDistribution} />
            )}

            {/* Leak patterns */}
            {data.patterns && data.patterns.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--poker-text-muted)" }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: "#fbbf24" }} />
                  Identified Leaks
                  <span className="text-xs" style={{ color: "var(--poker-text-muted)" }}>— click to see drill</span>
                </h3>
                {data.patterns.map((pattern: any, i: number) => (
                  <PatternCard key={i} pattern={pattern} index={i} />
                ))}
              </div>
            )}

            {/* Strengths */}
            {data.strengths && data.strengths.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--poker-text-muted)" }}>
                  <TrendingUp className="h-4 w-4" style={{ color: "var(--poker-green)" }} />
                  Strengths to Reinforce
                </h3>
                {data.strengths.map((strength: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 border"
                    style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.15)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--poker-green)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--poker-green)" }}>
                        {strength.title}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--poker-text-muted)" }}>
                      {strength.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="gap-2"
                style={{ borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
                Re-analyse
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
