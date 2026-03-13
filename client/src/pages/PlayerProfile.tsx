/**
 * Player Profile — Shark-tier exclusive
 *
 * Displays a 6-axis radar chart of playing style metrics derived from hand history,
 * plus a street-by-street stats table (hands analysed, avg grade, EV BB).
 *
 * Design: dark gaming aesthetic matching the rest of the app.
 * Paywall: non-Shark users see a blurred overlay with an upgrade CTA.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Loader2, ArrowLeft, Lock, Crown, TrendingUp, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerProfile() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const currentPlan = (user as any)?.plan ?? "fish";
  const isShark = currentPlan === "shark";

  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data, isLoading, error } = trpc.playerProfile.getMetrics.useQuery(undefined, {
    enabled: isAuthenticated && isShark,
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      // Show the page with paywall overlay — don't redirect
    }
  }, [isAuthenticated, isLoading]);

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
            <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="font-medium border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Sign In
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
                Exclusive to the Shark plan.
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
