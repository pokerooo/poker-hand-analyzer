/**
 * Player Profile — Shark-tier exclusive
 *
 * Displays a 6-axis radar chart of playing style metrics derived from hand history,
 * plus a street-by-street stats table (hands analysed, avg grade, EV BB).
 *
 * Shark-only extras:
 *   - AI-generated coaching narrative (Generate Report button)
 *   - Weekly radar snapshots with trend/progress tracker
 *
 * Design: dark gaming aesthetic matching the rest of the app.
 * Paywall: non-Shark users see a blurred overlay with an upgrade CTA.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  ArrowLeft,
  Lock,
  Crown,
  TrendingUp,
  Zap,
  Sparkles,
  Camera,
  ChevronUp,
  ChevronDown,
  Minus,
  Target,
  History,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
  const colorMap: Record<string, string> = {
    A: "bg-emerald-600 border-emerald-500 text-white",
    B: "bg-blue-600 border-blue-500 text-white",
    C: "bg-amber-600 border-amber-500 text-white",
    D: "bg-orange-600 border-orange-500 text-white",
    F: "bg-red-700 border-red-600 text-white",
    "N/A": "bg-zinc-700 border-zinc-600 text-zinc-300",
  };
  const cls = colorMap[grade] ?? colorMap["N/A"];
  return (
    <div
      className={`w-10 h-10 rounded-md border-2 flex items-center justify-center font-bold text-lg ${cls}`}
    >
      {grade}
    </div>
  );
}

// ─── EV display ───────────────────────────────────────────────────────────────

function EVDisplay({ ev }: { ev: number }) {
  const isPos = ev >= 0;
  return (
    <span className={`font-mono font-bold text-sm ${isPos ? "text-emerald-400" : "text-red-400"}`}>
      {isPos ? "+" : ""}
      {ev.toFixed(1)} BB
    </span>
  );
}

// ─── Delta badge (trend change indicator) ─────────────────────────────────────

function DeltaBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return <span className="text-xs text-zinc-600">—</span>;
  const diff = current - previous;
  if (Math.abs(diff) < 1) return <span className="text-xs text-zinc-500 flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
  const isUp = diff > 0;
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
      {isUp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(Math.round(diff))}
    </span>
  );
}

// ─── Custom radar tooltip ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-200 shadow-xl">
      <div className="font-bold text-amber-400">{item.payload.label}</div>
      <div className="mt-0.5">Score: <span className="font-mono text-white">{item.value}</span>/100</div>
    </div>
  );
}

// ─── Shark paywall overlay ────────────────────────────────────────────────────

function SharkPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl"
      style={{ background: "rgba(10,12,18,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="flex flex-col items-center gap-4 px-6 text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Lock className="h-8 w-8 text-amber-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Shark Plan Exclusive</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Your personalised playing style radar and street-by-street performance breakdown are
            available exclusively on the <span className="text-amber-400 font-semibold">Shark</span> plan.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button
            onClick={onUpgrade}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Shark — $29/mo
          </Button>
          <p className="text-xs text-zinc-500">Or $199/year · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 flex flex-col gap-0.5">
      <div className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{label}</div>
      <div className="text-xl font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

// ─── Report History section ──────────────────────────────────────────────────

function ReportHistorySection({ isShark }: { isShark: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: snapshots, isLoading } = trpc.playerProfile.getSnapshots.useQuery(undefined, {
    enabled: isShark,
    retry: false,
  });

  if (!isShark) return null;

  const snapshotsWithReports = (snapshots ?? []).filter((s) => s.aiReport);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (snapshotsWithReports.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto">
          <History className="h-5 w-5 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">No saved reports yet. Generate and save a snapshot to build your report history.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <History className="h-4 w-4 text-violet-400" />
        <span className="font-bold text-sm text-white tracking-wide">Report History</span>
        <span className="text-xs text-zinc-500 ml-1">{snapshotsWithReports.length} saved report{snapshotsWithReports.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {[...snapshotsWithReports].reverse().map((s) => (
          <div key={s.id}>
            {/* Row header */}
            <button
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{s.snapshotDate}</div>
                  <div className="text-[10px] text-zinc-500">
                    {s.styleTag ?? "Unknown style"} · {s.handsCount.toLocaleString()} hands
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 text-zinc-600 transition-transform duration-200 ${
                  expandedId === s.id ? "rotate-90" : ""
                }`}
              />
            </button>

            {/* Expanded report */}
            {expandedId === s.id && s.aiReport && (
              <div className="px-5 pb-5 pt-1 bg-zinc-900/30">
                <div
                  className="prose prose-invert prose-sm max-w-none leading-relaxed border-l-2 border-violet-500/30 pl-4"
                  style={{ color: "#d4d4d8" }}
                >
                  {s.aiReport.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return (
                        <p key={i} className="font-bold text-violet-400 mt-4 mb-1 text-sm tracking-wide">
                          {line.replace(/\*\*/g, "")}
                        </p>
                      );
                    }
                    if (line.startsWith("**")) {
                      const parts = line.split(/\*\*(.*?)\*\*/g);
                      return (
                        <p key={i} className="text-sm leading-relaxed mb-2">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
                          )}
                        </p>
                      );
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm leading-relaxed mb-2">{line}</p>;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Report section ────────────────────────────────────────────────────────

function AIReportSection({ isShark }: { isShark: boolean }) {
  const [report, setReport] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const generateMutation = trpc.playerProfile.generateReport.useMutation({
    onSuccess: (data) => {
      setReport(data.report as string);
      toast.success("AI coaching report generated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate report");
    },
  });

  const saveMutation = trpc.playerProfile.saveSnapshot.useMutation({
    onSuccess: (data) => {
      toast.success(data.updated ? "Snapshot updated" : "Snapshot saved");
      utils.playerProfile.getSnapshots.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save snapshot");
    },
  });

  if (!isShark) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="font-bold text-sm text-white tracking-wide">AI Coaching Report</span>
          <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">SHARK</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            Save Snapshot
          </Button>
          <Button
            size="sm"
            className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold gap-1.5"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generateMutation.isPending ? "Generating…" : "Generate Report"}
          </Button>
        </div>
      </div>

      <div className="px-5 py-5">
        {!report && !generateMutation.isPending && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-amber-400/60" />
            </div>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Generate a personalised coaching assessment based on your radar metrics and street performance.
              Direct, data-driven, no fluff.
            </p>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-sm text-zinc-500">Analysing your play…</p>
          </div>
        )}

        {report && (
          <div
            className="prose prose-invert prose-sm max-w-none leading-relaxed"
            style={{ color: "#d4d4d8" }}
          >
            {report.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <p key={i} className="font-bold text-amber-400 mt-4 mb-1 text-sm tracking-wide">
                    {line.replace(/\*\*/g, "")}
                  </p>
                );
              }
              if (line.startsWith("**")) {
                // Inline bold markers
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                  <p key={i} className="text-sm leading-relaxed mb-2">
                    {parts.map((part, j) =>
                      j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
                    )}
                  </p>
                );
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm leading-relaxed mb-2">{line}</p>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trend tracker section ────────────────────────────────────────────────────

const AXIS_COLORS: Record<string, string> = {
  vpip: "#f59e0b",
  pfr: "#22c55e",
  threeBet: "#60a5fa",
  cbet: "#a78bfa",
  foldToCbet: "#f87171",
  aggression: "#fb923c",
};

function TrendTrackerSection({ isShark }: { isShark: boolean }) {
  const { data: snapshots, isLoading } = trpc.playerProfile.getSnapshots.useQuery(undefined, {
    enabled: isShark,
    retry: false,
  });

  if (!isShark) return null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto">
          <TrendingUp className="h-5 w-5 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">No snapshots yet. Save your first snapshot above to start tracking progress.</p>
      </div>
    );
  }

  // Build chart data
  const chartData = snapshots.map((s) => ({
    date: s.snapshotDate,
    vpip: s.vpip,
    pfr: s.pfr,
    threeBet: s.threeBet,
    cbet: s.cbet,
    foldToCbet: s.foldToCbet,
    aggression: s.aggression,
  }));

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : undefined;

  const axes: { key: keyof typeof latest; label: string }[] = [
    { key: "vpip", label: "VPIP" },
    { key: "pfr", label: "PFR" },
    { key: "threeBet", label: "3-Bet" },
    { key: "cbet", label: "C-Bet" },
    { key: "foldToCbet", label: "Fold/CBet" },
    { key: "aggression", label: "Aggression" },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <span className="font-bold text-sm text-white tracking-wide">Progress Tracker</span>
        <span className="text-xs text-zinc-500 ml-1">{snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Delta badges — change vs previous snapshot */}
      {snapshots.length >= 2 && (
        <div className="px-5 py-3 border-b border-zinc-800/60">
          <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase mb-2">vs Previous Snapshot</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {axes.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800 px-2 py-2">
                <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase">{label}</span>
                <span className="font-mono text-sm font-bold text-white">{latest[key] as number}</span>
                <DeltaBadge
                  current={latest[key] as number}
                  previous={prev ? (prev[key] as number) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line chart */}
      <div className="px-2 py-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e4e4e7",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "10px", color: "#71717a" }}
            />
            {axes.map(({ key, label }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={AXIS_COLORS[key]}
                strokeWidth={2}
                dot={{ r: 3, fill: AXIS_COLORS[key], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Snapshot history table */}
      <div className="border-t border-zinc-800/60">
        <div className="grid grid-cols-4 px-4 py-2 text-[9px] font-bold tracking-widest text-zinc-600 uppercase border-b border-zinc-800/40">
          <span>Date</span>
          <span className="text-center">Style</span>
          <span className="text-center">Hands</span>
          <span className="text-right">AI Report</span>
        </div>
        {[...snapshots].reverse().map((s) => (
          <div key={s.id} className="grid grid-cols-4 items-center px-4 py-2.5 border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors">
            <span className="text-xs font-mono text-zinc-400">{s.snapshotDate}</span>
            <span className="text-xs text-center text-zinc-300 font-medium">{s.styleTag ?? "—"}</span>
            <span className="text-xs text-center font-mono text-zinc-400">{s.handsCount.toLocaleString()}</span>
            <span className="text-right">
              {s.aiReport ? (
                <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Saved</Badge>
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerProfile() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const currentPlan = (user as any)?.plan ?? "fish";
  const isShark = currentPlan === "shark";

  const { data, isLoading } = trpc.playerProfile.getMetrics.useQuery(undefined, {
    enabled: isAuthenticated && isShark,
    retry: false,
  });

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--poker-page-bg, #0a0c12)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // ── Radar chart data ─────────────────────────────────────────────────────────
  const radarChartData = data?.radarData
    ? data.radarData.labels.map((label, i) => ({
        label,
        value: data.radarData!.values[i],
        fullMark: 100,
      }))
    : [
        { label: "PREFLOP", value: 0, fullMark: 100 },
        { label: "FLOP", value: 0, fullMark: 100 },
        { label: "TURN", value: 0, fullMark: 100 },
        { label: "RIVER", value: 0, fullMark: 100 },
        { label: "AGGRESSION", value: 0, fullMark: 100 },
        { label: "PASSIVE", value: 0, fullMark: 100 },
      ];

  const rawStats = data?.radarData?.rawStats;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--poker-page-bg, #0a0c12)", color: "#e4e4e7" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 sticky top-0 z-10 border-b"
        style={{
          background: "rgba(10,12,18,0.92)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-zinc-800"
            style={{ color: "#22c55e" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">Player Profile</span>
            <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
              SHARK
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle inline />
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/my-hands")} className="font-medium border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              My Hands
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")} className="font-medium border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
              Upgrade
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container max-w-2xl py-6 sm:py-10 flex flex-col gap-6">

        {/* Title block */}
        <div className="text-center space-y-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
            Most Recent {data?.handsAnalyzed ?? "—"} Hands
          </p>
          {data?.styleLabel && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-amber-400 text-lg">●</span>
              <span className="font-bold text-xl text-white tracking-wide">{data.styleLabel}</span>
              <span className="text-xs text-zinc-500 font-mono">[{currentPlan.toUpperCase()}]</span>
            </div>
          )}
          {data?.styleDescription && (
            <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mt-1">
              {data.styleDescription}
            </p>
          )}
        </div>

        {/* Radar chart card — relative so paywall overlay can be absolute */}
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
          {!isShark && <SharkPaywall onUpgrade={handleUpgrade} />}

          {/* Radar */}
          <div className="h-72 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarChartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid
                  stroke="rgba(255,255,255,0.08)"
                  gridType="circle"
                />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Style"
                  dataKey="value"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="#f59e0b"
                  fillOpacity={0.18}
                  dot={{ fill: "#f59e0b", r: 5, strokeWidth: 0 }}
                  activeDot={{ fill: "#fbbf24", r: 7, strokeWidth: 2, stroke: "#1c1917" }}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Raw stat pills */}
          {rawStats && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatCard label="VPIP" value={`${rawStats.vpip}%`} sub="Voluntarily in pot" />
              <StatCard label="PFR" value={`${rawStats.pfr}%`} sub="Pre-flop raise" />
              <StatCard label="3-Bet" value={`${rawStats.threeBet}%`} sub="3-bet frequency" />
              <StatCard label="C-Bet" value={`${rawStats.cbet}%`} sub="Flop c-bet" />
              <StatCard label="Fold/CBet" value={`${rawStats.foldToCbet}%`} sub="Fold to c-bet" />
              <StatCard label="Agg Factor" value={`${rawStats.aggressionFactor}%`} sub="Post-flop AF" />
            </div>
          )}
        </div>

        {/* Street-by-street stats table */}
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          {!isShark && (
            <div className="absolute inset-0 z-10" style={{ backdropFilter: "blur(8px)", background: "rgba(10,12,18,0.7)" }} />
          )}

          {/* Table header */}
          <div className="grid grid-cols-4 px-4 py-3 border-b border-zinc-800">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Metric</div>
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase text-center">Hands<br />Analysed</div>
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase text-center">Avg<br />Grade</div>
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase text-right">Win Rate<br />(EV BB)</div>
          </div>

          {/* Rows */}
          {(data?.streetStats ?? [
            { street: "PREFLOP", handsAnalysed: 0, avgGrade: "N/A", evBB: 0 },
            { street: "FLOP", handsAnalysed: 0, avgGrade: "N/A", evBB: 0 },
            { street: "TURN", handsAnalysed: 0, avgGrade: "N/A", evBB: 0 },
            { street: "RIVER", handsAnalysed: 0, avgGrade: "N/A", evBB: 0 },
          ]).map((row, i) => (
            <div
              key={row.street}
              className={`grid grid-cols-4 items-center px-4 py-4 ${i < 3 ? "border-b border-zinc-800/60" : ""}`}
              style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}
            >
              <div className="font-bold text-sm tracking-wider text-zinc-200">{row.street}</div>
              <div className="text-center font-mono text-sm text-zinc-300">
                {row.handsAnalysed.toLocaleString()}
              </div>
              <div className="flex justify-center">
                <GradeBadge grade={row.avgGrade} />
              </div>
              <div className="text-right">
                <EVDisplay ev={row.evBB} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Coaching Report — Shark only */}
        <AIReportSection isShark={isShark} />

        {/* Progress Trend Tracker — Shark only */}
        <TrendTrackerSection isShark={isShark} />

        {/* Report History — Shark only */}
        <ReportHistorySection isShark={isShark} />

        {/* Opponent Profiler CTA — Shark only */}
        {isShark && (
          <button
            onClick={() => navigate("/opponents")}
            className="w-full rounded-2xl border border-red-500/20 bg-zinc-900/40 hover:bg-red-500/5 hover:border-red-500/30 transition-all p-5 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <Target className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-0.5">Opponent Profiler</h3>
              <p className="text-sm text-zinc-400">
                Log villain stats, visualise their tendencies on a radar, and get AI-generated exploitative adjustments.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </button>
        )}

        {/* Not enough data state */}
        {isShark && data && !data.hasEnoughData && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center space-y-3">
            <div className="text-4xl">🃏</div>
            <h3 className="font-bold text-white text-lg">Not enough hands yet</h3>
            <p className="text-sm text-zinc-400">
              Analyse at least {data.minRequired} hands to unlock your Player Profile.
              You've analysed <span className="text-amber-400 font-bold">{data.handsAnalyzed}</span> so far.
            </p>
            <Button onClick={() => navigate("/")} className="bg-green-600 hover:bg-green-500 text-white font-bold gap-2">
              <Zap className="h-4 w-4" />
              Analyse a Hand
            </Button>
          </div>
        )}

        {/* Upgrade CTA for non-Shark */}
        {!isShark && (
          <div
            className="rounded-2xl border border-amber-500/20 p-6 flex flex-col sm:flex-row items-center gap-4"
            style={{ background: "rgba(245,158,11,0.05)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Crown className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold text-white mb-1">Unlock Your Player Profile</h3>
              <p className="text-sm text-zinc-400">
                See exactly how you play — VPIP, PFR, aggression factor, c-bet %, fold-to-c-bet, and more.
                Plus AI coaching reports and weekly progress tracking. Exclusive to the Shark plan.
              </p>
            </div>
            <Button
              onClick={handleUpgrade}
              className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
            >
              <Crown className="h-4 w-4" />
              Upgrade to Shark
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-600 py-4 border-t border-zinc-800/60">
        Poker AI · Player Profile
      </footer>
    </div>
  );
}
