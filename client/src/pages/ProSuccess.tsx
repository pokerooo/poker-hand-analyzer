import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Brain, Upload, BarChart2, Loader2 } from "lucide-react";

const PRO_FEATURES = [
  { icon: <Brain className="h-5 w-5" />, label: "Unlimited AI Coach analysis" },
  { icon: <Upload className="h-5 w-5" />, label: "Hand history import (PokerStars & GGPoker)" },
  { icon: <BarChart2 className="h-5 w-5" />, label: "Cross-session pattern recognition" },
  { icon: <Zap className="h-5 w-5" />, label: "Villain-type exploitative adjustments" },
];

export default function ProSuccess() {
  const [, navigate] = useLocation();
  const [verified, setVerified] = useState(false);
  const utils = trpc.useUtils();

  // Invalidate auth.me so isPro flag refreshes
  useEffect(() => {
    const timer = setTimeout(async () => {
      await utils.auth.me.invalidate();
      setVerified(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [utils]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "#0a0e1a", color: "#e2e8f0" }}
    >
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success icon */}
        <div className="relative mx-auto w-24 h-24">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
              border: "2px solid rgba(16,185,129,0.4)",
              boxShadow: "0 0 40px rgba(16,185,129,0.3)",
            }}
          >
            {verified ? (
              <CheckCircle2 className="h-12 w-12" style={{ color: "#10b981" }} />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#10b981" }} />
            )}
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-3xl font-black mb-2" style={{ color: "#e2e8f0" }}>
            Welcome to Pro!
          </h1>
          <p className="text-base" style={{ color: "#64748b" }}>
            {verified
              ? "Your subscription is active. You now have full access to all Pro features."
              : "Activating your subscription…"}
          </p>
        </div>

        {/* Features unlocked */}
        <div
          className="rounded-xl p-5 border text-left"
          style={{ background: "#0d1220", borderColor: "rgba(16,185,129,0.2)" }}
        >
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#10b981" }}>
            Unlocked for you
          </p>
          <ul className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}
                >
                  {f.icon}
                </div>
                <span className="text-sm" style={{ color: "#94a3b8" }}>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/my-hands")}
            className="w-full h-12 text-base font-bold gap-2"
            style={{ background: "linear-gradient(135deg, #065f46, #10b981)", color: "#fff" }}
          >
            <Brain className="h-5 w-5" />
            Go to My Hands
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/patterns")}
            className="w-full h-12 text-base gap-2"
            style={{ borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}
          >
            <BarChart2 className="h-5 w-5" />
            View Pattern Recognition
          </Button>
        </div>
      </div>
    </div>
  );
}
