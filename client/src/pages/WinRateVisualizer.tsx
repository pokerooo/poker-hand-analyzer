/**
 * Win Rate Visualizer
 * Shows P&L by position, hand group, and a cumulative timeline graph.
 * Grades drive the P&L simulation: A=+1.2 buy-ins, B=+0.5, C=-0.3, D=-0.8, F=-1.5
 * As leaks are fixed and grades improve, the graph turns green.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Lock, BarChart2, BookOpen, ChevronRight, Info } from "lucide-react";

const POSITION_ORDER = ["BTN", "CO", "HJ", "LJ", "UTG+1", "UTG", "SB", "BB", "Unknown"];

function PnlBar({ value, max }: { value: number; max: number }) {
  const pct = Math.abs(value) / (max || 1);
  const isPos = value >= 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--poker-surface-2)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct * 100, 100)}%`,
            background: isPos
              ? "var(--poker-green)"
              : "linear-gradient(90deg, #ef4444, #f87171)",
            marginLeft: isPos ? "0" : "auto",
          }}
        />
      </div>
      <span
        className="text-xs font-bold w-12 text-right"
        style={{ color: isPos ? "var(--poker-green)" : "#ef4444" }}
      >
        {isPos ? "+" : ""}{value.toFixed(1)}
      </span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)", color: "var(--poker-text)" }}
    >
      <p className="font-semibold mb-0.5">{label}</p>
      <p style={{ color: val >= 0 ? "var(--poker-green)" : "#ef4444" }}>
        {val >= 0 ? "+" : ""}{val.toFixed(2)} buy-ins
      </p>
    </div>
  );
};

export default function WinRateVisualizer() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data, isLoading } = trpc.winrate.getStats.useQuery(undefined, {
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
          <h2 className="text-2xl font-bold" style={{ color: "var(--poker-text)" }}>Sign in to view Win Rate</h2>
          <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>
            Track your simulated P&L across positions and hand groups as you fix leaks.
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

  // Sort positions in canonical order
  const sortedPositions = data?.positions
    ? [...data.positions].sort(
        (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
      )
    : [];

  const maxPosPnl = Math.max(...(sortedPositions.map((p) => Math.abs(p.pnl)) || [1]));
  const maxGroupPnl = Math.max(...(data?.handGroups?.map((g) => Math.abs(g.pnl)) || [1]));

  const totalPnl = data?.timeline?.length
    ? data.timeline[data.timeline.length - 1].cumulativePnl
    : 0;

  const isWinning = totalPnl >= 0;

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
            <BarChart2 className="h-5 w-5" style={{ color: "var(--poker-green)" }} />
            <span className="font-bold text-white">Win Rate</span>
          </div>
        </div>
        <Link href="/memory-bank">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--poker-green-subtle)", color: "var(--poker-green)", border: "1px solid var(--poker-green-subtle-border)" }}
          >
            View Leaks
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Win Rate Visualizer</h1>
          <p style={{ color: "var(--poker-text-muted)" }} className="text-sm">
            Simulated P&L based on how well you played each hand. Fix your leaks and watch the graph turn green.
          </p>
        </div>

        {/* Disclaimer */}
        <div
          className="flex items-start gap-2 rounded-lg p-3 text-xs"
          style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)", color: "#ca8a04" }}
        >
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            P&L is simulated from coach grades (A = +1.2 buy-ins, B = +0.5, C = -0.3, D = -0.8, F = -1.5). This reflects decision quality, not actual results. As you improve, the graph trends upward.
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>Building your win rate graph...</p>
            </div>
          </div>
        ) : !data?.hasData ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="h-12 w-12 mx-auto" style={{ color: "var(--poker-text-muted)" }} />
            <h3 className="text-lg font-semibold text-white">No data yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--poker-text-muted)" }}>
              Analyse at least one hand with the AI Coach to start tracking your win rate.
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
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Hands", value: data.totalHands, sub: "analysed" },
                {
                  label: "Simulated P&L",
                  value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(1)}`,
                  sub: "buy-ins",
                  color: isWinning ? "#4ade80" : "#ef4444",
                },
                {
                  label: "Trend",
                  value: isWinning ? "Winning" : "Losing",
                  sub: "direction",
                  color: isWinning ? "#4ade80" : "#ef4444",
                  icon: isWinning ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)" }}
                >
                  {stat.icon && (
                    <div className="flex justify-center mb-1" style={{ color: stat.color }}>{stat.icon}</div>
                  )}
                  <div className="text-2xl font-bold" style={{ color: stat.color || "white" }}>{stat.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--poker-text-muted)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Cumulative P&L timeline */}
            {data.timeline && data.timeline.length > 1 && (
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)" }}
              >
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--poker-text)" }}>Cumulative P&L Over Time</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.timeline} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isWinning ? "#4ade80" : "#ef4444"} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isWinning ? "#4ade80" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--poker-border)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--poker-text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--poker-text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="var(--poker-border-strong)" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="cumulativePnl"
                      stroke={isWinning ? "#4ade80" : "#ef4444"}
                      strokeWidth={2}
                      fill="url(#pnlGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Position P&L */}
            {sortedPositions.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)" }}
              >
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--poker-text)" }}>P&L by Position</h2>
                <div className="space-y-3">
                  {sortedPositions.map((pos) => (
                    <div key={pos.position} className="flex items-center gap-3">
                      <div className="w-14 text-xs font-bold text-right shrink-0" style={{ color: "var(--poker-text-muted)" }}>
                        {pos.position}
                      </div>
                      <div className="flex-1">
                        <PnlBar value={pos.pnl} max={maxPosPnl} />
                      </div>
                      <div className="w-16 text-xs text-right shrink-0" style={{ color: "var(--poker-text-muted)" }}>
                        {pos.hands} hand{pos.hands !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hand group P&L */}
            {data.handGroups && data.handGroups.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)" }}
              >
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--poker-text)" }}>P&L by Hand Group</h2>
                <div className="space-y-3">
                  {data.handGroups.map((group) => (
                    <div key={group.group} className="flex items-center gap-3">
                      <div className="w-40 text-xs font-medium shrink-0 truncate" style={{ color: "var(--poker-text-muted)" }}>
                        {group.group}
                      </div>
                      <div className="flex-1">
                        <PnlBar value={group.pnl} max={maxGroupPnl} />
                      </div>
                      <div className="w-16 text-xs text-right shrink-0" style={{ color: "var(--poker-text-muted)" }}>
                        {group.hands} hand{group.hands !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              className="rounded-xl p-5 text-center"
              style={{ background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
            >
              <p className="text-sm font-semibold text-white mb-1">
                See exactly where you're losing money
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--poker-text-muted)" }}>
                Check your Memory Bank to get targeted drills for each losing position or hand group.
              </p>
              <Link href="/memory-bank">
                <button
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--poker-green)" }}
                >
                  Open Memory Bank
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
