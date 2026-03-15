/**
 * Opponent Profiler — Shark-tier exclusive
 *
 * Allows Shark users to log observed villain stats (VPIP, PFR, 3-Bet, C-Bet, etc.)
 * and generate a tailored exploitative strategy via the AI coach.
 *
 * Features:
 *   - Add/edit/delete villain profiles
 *   - Villain radar chart (same 6-axis design as Player Profile)
 *   - AI-generated exploitative adjustments (4-section report)
 *   - Shark paywall for non-Shark users
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
  Plus,
  Trash2,
  Loader2,
  Zap,
  ChevronRight,
  Target,
  X,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VillainProfile {
  id: number;
  villainName: string;
  vpip: number;
  pfr: number;
  threeBet: number;
  cbet: number;
  foldToCbet: number;
  af: number;
  handsObserved: number;
  notes: string | null;
  aiAdjustments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Stat input row ───────────────────────────────────────────────────────────

function StatInput({
  label,
  sublabel,
  value,
  onChange,
  max = 100,
  step = 1,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{label}</label>
        <span className="font-mono text-sm font-bold text-amber-400">{value}{max === 100 ? "%" : ""}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #f59e0b ${(value / max) * 100}%, rgba(255,255,255,0.1) ${(value / max) * 100}%)`,
        }}
      />
      <span className="text-[9px] text-zinc-600">{sublabel}</span>
    </div>
  );
}

// ─── Custom radar tooltip ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-200 shadow-xl">
      <div className="font-bold text-red-400">{item.payload.label}</div>
      <div className="mt-0.5">Score: <span className="font-mono text-white">{item.value}</span>/100</div>
    </div>
  );
}

// ─── Shark paywall ────────────────────────────────────────────────────────────

function SharkPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
        <Lock className="h-8 w-8 text-amber-400" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Shark Plan Exclusive</h3>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
          Profile your opponents, track their tendencies, and get AI-generated exploitative
          strategies tailored to each villain. Available exclusively on the{" "}
          <span className="text-amber-400 font-semibold">Shark</span> plan.
        </p>
      </div>
      <Button
        onClick={onUpgrade}
        className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 px-6"
      >
        <Crown className="h-4 w-4" />
        Upgrade to Shark — $29/mo
      </Button>
      <p className="text-xs text-zinc-600">Or $199/year · Cancel anytime</p>
    </div>
  );
}

// ─── Villain radar chart ──────────────────────────────────────────────────────

function VillainRadar({ villain }: { villain: VillainProfile }) {
  const afNorm = Math.min(100, (villain.af / 10) * 25); // af stored *10, normalise to 0-100
  const radarData = [
    { label: "VPIP", value: Math.round((villain.vpip / 50) * 100), fullMark: 100 },
    { label: "PFR", value: Math.round((villain.pfr / 30) * 100), fullMark: 100 },
    { label: "3-BET", value: Math.round((villain.threeBet / 12) * 100), fullMark: 100 },
    { label: "C-BET", value: Math.round((villain.cbet / 85) * 100), fullMark: 100 },
    { label: "FOLD/CBET", value: Math.round((villain.foldToCbet / 80) * 100), fullMark: 100 },
    { label: "AGGRESSION", value: Math.round(afNorm), fullMark: 100 },
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="circle" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#a1a1aa", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}
            tickLine={false}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={villain.villainName}
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={2}
            fill="#ef4444"
            fillOpacity={0.15}
            dot={{ fill: "#ef4444", r: 4, strokeWidth: 0 }}
            activeDot={{ fill: "#f87171", r: 6, strokeWidth: 2, stroke: "#1c1917" }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Villain card ─────────────────────────────────────────────────────────────

function VillainCard({
  villain,
  onSelect,
  onDelete,
  isSelected,
}: {
  villain: VillainProfile;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
}) {
  const afReal = (villain.af / 10).toFixed(1);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border cursor-pointer transition-all duration-200 p-4 ${
        isSelected
          ? "border-red-500/50 bg-red-500/5"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/30"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{villain.villainName}</span>
            {villain.aiAdjustments && (
              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Analysed</Badge>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">{villain.handsObserved.toLocaleString()} hands observed</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        {[
          { label: "VPIP", value: `${villain.vpip}%` },
          { label: "PFR", value: `${villain.pfr}%` },
          { label: "3-Bet", value: `${villain.threeBet}%` },
          { label: "C-Bet", value: `${villain.cbet}%` },
          { label: "Fold/CBet", value: `${villain.foldToCbet}%` },
          { label: "AF", value: afReal },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-zinc-900/60 border border-zinc-800/60 px-2 py-1.5 flex flex-col gap-0.5">
            <span className="text-zinc-600 font-bold tracking-wider uppercase" style={{ fontSize: "8px" }}>{label}</span>
            <span className="font-mono font-bold text-zinc-300">{value}</span>
          </div>
        ))}
      </div>

      {isSelected && (
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-red-400 font-bold">
          <span>View analysis</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit villain form ────────────────────────────────────────────────────

interface VillainFormData {
  villainName: string;
  vpip: number;
  pfr: number;
  threeBet: number;
  cbet: number;
  foldToCbet: number;
  af: number; // stored *10
  handsObserved: number;
  notes: string;
}

const defaultForm: VillainFormData = {
  villainName: "",
  vpip: 25,
  pfr: 18,
  threeBet: 7,
  cbet: 60,
  foldToCbet: 45,
  af: 30, // = 3.0
  handsObserved: 100,
  notes: "",
};

function VillainForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
  mode,
}: {
  initial?: VillainFormData;
  onSubmit: (data: VillainFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  mode: "create" | "edit";
}) {
  const [form, setForm] = useState<VillainFormData>(initial ?? defaultForm);

  const set = (key: keyof VillainFormData, value: number | string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-sm">
          {mode === "create" ? "Add Villain Profile" : "Edit Villain Profile"}
        </h3>
        <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Villain name */}
      <div>
        <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block mb-1">
          Villain Name / Screen Name
        </label>
        <input
          type="text"
          value={form.villainName}
          onChange={(e) => set("villainName", e.target.value)}
          placeholder="e.g. Villain_X, SeatThree, reg_crusher"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 transition-colors"
          maxLength={100}
        />
      </div>

      {/* Hands observed */}
      <div>
        <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block mb-1">
          Hands Observed
        </label>
        <input
          type="number"
          value={form.handsObserved}
          onChange={(e) => set("handsObserved", Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-colors"
          min={0}
          max={1000000}
        />
      </div>

      {/* Stats sliders */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Observed Stats</p>
        <StatInput label="VPIP" sublabel="Voluntarily put in pot (baseline: 20–28%)" value={form.vpip} onChange={(v) => set("vpip", v)} />
        <StatInput label="PFR" sublabel="Pre-flop raise % (baseline: 16–22%)" value={form.pfr} onChange={(v) => set("pfr", v)} />
        <StatInput label="3-Bet %" sublabel="3-bet frequency (baseline: 6–9%)" value={form.threeBet} onChange={(v) => set("threeBet", v)} />
        <StatInput label="C-Bet %" sublabel="Flop continuation bet (baseline: 55–70%)" value={form.cbet} onChange={(v) => set("cbet", v)} />
        <StatInput label="Fold to C-Bet %" sublabel="Fold when facing c-bet (baseline: 35–50%)" value={form.foldToCbet} onChange={(v) => set("foldToCbet", v)} />
        <StatInput
          label="Aggression Factor (×10)"
          sublabel="Post-flop AF ×10 — e.g. 30 = 3.0 (baseline: 25–40)"
          value={form.af}
          onChange={(v) => set("af", v)}
          max={100}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block mb-1">
          Notes (optional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Overbet bluffs river, limp-calls from SB, never 4-bets without nuts..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 transition-colors resize-none h-20"
          maxLength={2000}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (!form.villainName.trim()) {
              toast.error("Enter a villain name");
              return;
            }
            onSubmit(form);
          }}
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold gap-1.5"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {mode === "create" ? "Add Villain" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Adjustments renderer ─────────────────────────────────────────────────────

function AdjustmentsRenderer({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-bold text-red-400 mt-4 mb-1 text-sm tracking-wide">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.startsWith("**")) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className="text-sm leading-relaxed mb-1.5">
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
              )}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="text-sm text-zinc-300 leading-relaxed pl-3 border-l border-zinc-700 mb-1">
              {line.replace(/^[-•]\s/, "")}
            </p>
          );
        }
        return <p key={i} className="text-sm leading-relaxed mb-1.5 text-zinc-300">{line}</p>;
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpponentProfiler() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const currentPlan = (user as any)?.plan ?? "fish";
  const isShark = currentPlan === "shark";

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: villains = [], isLoading } = trpc.opponentProfile.list.useQuery(undefined, {
    enabled: isAuthenticated && isShark,
    retry: false,
  });

  const createMutation = trpc.opponentProfile.create.useMutation({
    onSuccess: () => {
      toast.success("Villain profile added");
      setShowForm(false);
      utils.opponentProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to add villain"),
  });

  const updateMutation = trpc.opponentProfile.update.useMutation({
    onSuccess: () => {
      toast.success("Villain profile updated");
      setEditingId(null);
      utils.opponentProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update villain"),
  });

  const deleteMutation = trpc.opponentProfile.delete.useMutation({
    onSuccess: () => {
      toast.success("Villain profile deleted");
      setSelectedId(null);
      utils.opponentProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete villain"),
  });

  const analyzeMutation = trpc.opponentProfile.analyze.useMutation({
    onSuccess: (data) => {
      toast.success(data.cached ? "Loaded cached analysis" : "Exploitative analysis generated");
      utils.opponentProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to generate analysis"),
  });

  const selectedVillain = villains.find((v) => v.id === selectedId) ?? null;
  const editingVillain = villains.find((v) => v.id === editingId) ?? null;

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
            onClick={() => navigate("/profile")}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-zinc-800"
            style={{ color: "#22c55e" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-red-400" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">Opponent Profiler</span>
            <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
              SHARK
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle inline />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/profile")}
            className="font-medium border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            My Profile
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container max-w-2xl py-6 sm:py-10 flex flex-col gap-6">

        {!isShark ? (
          <SharkPaywall onUpgrade={() => navigate("/pricing")} />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            {/* Add villain button */}
            {!showForm && !editingId && (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold gap-2 py-5"
              >
                <Plus className="h-4 w-4" />
                Add Villain Profile
              </Button>
            )}

            {/* Create form */}
            {showForm && (
              <VillainForm
                mode="create"
                isLoading={createMutation.isPending}
                onCancel={() => setShowForm(false)}
                onSubmit={(data) => createMutation.mutate(data)}
              />
            )}

            {/* Edit form */}
            {editingId && editingVillain && (
              <VillainForm
                mode="edit"
                initial={{
                  villainName: editingVillain.villainName,
                  vpip: editingVillain.vpip,
                  pfr: editingVillain.pfr,
                  threeBet: editingVillain.threeBet,
                  cbet: editingVillain.cbet,
                  foldToCbet: editingVillain.foldToCbet,
                  af: editingVillain.af,
                  handsObserved: editingVillain.handsObserved,
                  notes: editingVillain.notes ?? "",
                }}
                isLoading={updateMutation.isPending}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) => updateMutation.mutate({ id: editingId, ...data })}
              />
            )}

            {/* Villain list */}
            {villains.length === 0 && !showForm && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center space-y-3">
                <div className="text-4xl">🎯</div>
                <h3 className="font-bold text-white text-lg">No villain profiles yet</h3>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  Start profiling opponents you face regularly to get AI-generated exploitative strategies.
                </p>
              </div>
            )}

            {villains.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  {villains.length} Villain{villains.length !== 1 ? "s" : ""} Profiled
                </p>
                {villains.map((v) => (
                  <VillainCard
                    key={v.id}
                    villain={v as VillainProfile}
                    isSelected={selectedId === v.id}
                    onSelect={() => setSelectedId(selectedId === v.id ? null : v.id)}
                    onDelete={() => deleteMutation.mutate({ id: v.id })}
                  />
                ))}
              </div>
            )}

            {/* Selected villain detail panel */}
            {selectedVillain && (
              <div className="rounded-2xl border border-red-500/20 bg-zinc-900/60 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-lg">●</span>
                      <span className="font-bold text-white text-lg">{selectedVillain.villainName}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{selectedVillain.handsObserved.toLocaleString()} hands observed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingId(selectedVillain.id); setSelectedId(null); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Villain radar */}
                <div className="px-4 pt-4">
                  <VillainRadar villain={selectedVillain as VillainProfile} />
                </div>

                {/* Notes */}
                {selectedVillain.notes && (
                  <div className="px-5 py-3 border-t border-zinc-800/60">
                    <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase mb-1">Notes</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{selectedVillain.notes}</p>
                  </div>
                )}

                {/* Exploitative adjustments */}
                <div className="px-5 pb-5 pt-3 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-400" />
                      <span className="font-bold text-sm text-white">Exploitative Strategy</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => analyzeMutation.mutate({ id: selectedVillain.id })}
                      disabled={analyzeMutation.isPending}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold gap-1.5"
                    >
                      {analyzeMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      {selectedVillain.aiAdjustments ? "Regenerate" : "Generate"}
                    </Button>
                  </div>

                  {analyzeMutation.isPending && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="h-7 w-7 animate-spin text-red-400" />
                      <p className="text-sm text-zinc-500">Generating exploitative strategy…</p>
                    </div>
                  )}

                  {!analyzeMutation.isPending && selectedVillain.aiAdjustments && (
                    <AdjustmentsRenderer text={selectedVillain.aiAdjustments} />
                  )}

                  {!analyzeMutation.isPending && !selectedVillain.aiAdjustments && (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                        <Target className="h-5 w-5 text-red-400/60" />
                      </div>
                      <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                        Generate a tailored exploitative strategy based on this villain's stats.
                        4-section report: player type, preflop exploits, postflop exploits, key tells.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-600 py-4 border-t border-zinc-800/60">
        Poker AI · Opponent Profiler
      </footer>
    </div>
  );
}
