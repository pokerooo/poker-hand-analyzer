import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Zap, Crown, Fish, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

type PlanInterval = "month" | "year";

const FEATURES = {
  fish: [
    "3 hand analyses per month",
    "3 AI coach sessions per month",
    "Hand replay visualiser",
    "Street-by-street breakdown",
    "Share hands publicly",
  ],
  reg: [
    "15 hand analyses per month",
    "15 AI coach sessions per month",
    "Memory Bank — track recurring leaks",
    "Leak & Pattern Detection",
    "Study streak tracking",
    "Discord hand sharing",
    "All Fish features",
  ],
  shark: [
    "50 hand analyses per month",
    "Unlimited AI coaching sessions",
    "Top-tier exploitative analysis",
    "Cross-session pattern recognition",
    "Win Rate & P&L tracker",
    "Personalised poker style profile",
    "Priority AI response quality",
    "All Reg features",
  ],
};

export default function Pricing() {
  const [interval, setInterval] = useState<PlanInterval>("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const currentPlan = (user as any)?.plan ?? "fish";

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.success("Redirecting to checkout…");
        window.location.href = data.checkoutUrl;
      }
      setLoadingPlan(null);
    },
    onError: (err) => {
      toast.error("Checkout error", { description: err.message });
      setLoadingPlan(null);
    },
  });

  const handleUpgrade = (plan: "reg" | "shark") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingPlan(plan);
    createCheckout.mutate({ origin: window.location.origin, plan, interval });
  };

  const monthlyPrice = { reg: 19, shark: 29 };
  const annualPrice = { reg: 99, shark: 199 };
  const annualMonthly = { reg: (99 / 12).toFixed(2), shark: (199 / 12).toFixed(2) };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Pricing</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Level Up Your Poker Game
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional-grade hand analysis and AI coaching for mid-to-high stakes players.
            Choose the plan that matches your volume.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setInterval("month")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              interval === "month"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("year")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              interval === "year"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-1.5 py-0">
              Save ~30%
            </Badge>
          </button>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Fish — Free */}
          <div className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Fish className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-bold text-lg text-foreground">Fish</span>
                {currentPlan === "fish" && (
                  <Badge variant="outline" className="text-xs ml-auto">Current Plan</Badge>
                )}
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get started — no credit card required.
              </p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {FEATURES.fish.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              {currentPlan === "fish" ? "Current Plan" : "Free Forever"}
            </Button>
          </div>

          {/* Reg */}
          <div className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-bold text-lg text-foreground">Reg</span>
                {currentPlan === "reg" && (
                  <Badge variant="outline" className="text-xs ml-auto">Current Plan</Badge>
                )}
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-foreground">
                  ${interval === "month" ? monthlyPrice.reg : annualMonthly.reg}
                </span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              {interval === "year" && (
                <p className="text-xs text-emerald-500 font-medium mb-1">
                  Billed ${annualPrice.reg}/year — save ${monthlyPrice.reg * 12 - annualPrice.reg}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                For the serious recreational player grinding mid-stakes.
              </p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {FEATURES.reg.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade("reg")}
              disabled={loadingPlan !== null || currentPlan === "reg" || currentPlan === "shark"}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
            >
              {loadingPlan === "reg" ? (
                <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Processing…</>
              ) : currentPlan === "reg" ? (
                "Current Plan"
              ) : currentPlan === "shark" ? (
                "Downgrade"
              ) : (
                <><Zap className="w-4 h-4" />Upgrade to Reg</>
              )}
            </Button>
          </div>

          {/* Shark — Most Popular */}
          <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col gap-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-bold shadow-lg">
                Most Popular
              </Badge>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <span className="font-bold text-lg text-foreground">Shark</span>
                {currentPlan === "shark" && (
                  <Badge variant="outline" className="text-xs ml-auto">Current Plan</Badge>
                )}
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-foreground">
                  ${interval === "month" ? monthlyPrice.shark : annualMonthly.shark}
                </span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              {interval === "year" && (
                <p className="text-xs text-emerald-500 font-medium mb-1">
                  Billed ${annualPrice.shark}/year — save ${monthlyPrice.shark * 12 - annualPrice.shark}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                For the dedicated player who wants every edge at the table.
              </p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {FEATURES.shark.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade("shark")}
              disabled={loadingPlan !== null || currentPlan === "shark"}
              className="w-full font-bold gap-2"
            >
              {loadingPlan === "shark" ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
              ) : currentPlan === "shark" ? (
                "Current Plan"
              ) : (
                <><Crown className="w-4 h-4" />Upgrade to Shark</>
              )}
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <h3 className="text-xl font-bold text-foreground text-center mb-8">Full Feature Comparison</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center px-4 py-4 font-semibold text-foreground">Fish</th>
                  <th className="text-center px-4 py-4 font-semibold text-amber-500">Reg</th>
                  <th className="text-center px-4 py-4 font-semibold text-primary">Shark</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Hand analyses / month", "3", "15", "50"],
                  ["AI coach sessions / month", "3", "15", "Unlimited"],
                  ["Hand replay visualiser", "✓", "✓", "✓"],
                  ["Street-by-street analysis", "✓", "✓", "✓"],
                  ["Villain type profiling", "✓", "✓", "✓"],
                  ["Memory Bank (leak tracking)", "—", "✓", "✓"],
                  ["Leak & Pattern Detection", "—", "✓", "✓"],
                  ["Cross-session patterns", "—", "✓", "✓"],
                  ["Win Rate / P&L tracker", "—", "—", "✓"],
                  ["Personalised style profile", "—", "—", "✓"],
                  ["Priority AI quality", "—", "—", "✓"],
                ].map(([feature, fish, reg, shark], i) => (
                  <tr key={feature} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-6 py-3.5 text-muted-foreground">{feature}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground">{fish}</td>
                    <td className="px-4 py-3.5 text-center text-amber-500 font-medium">{reg}</td>
                    <td className="px-4 py-3.5 text-center text-primary font-medium">{shark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-foreground text-center mb-8">Common Questions</h3>
          <div className="space-y-6">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel through the billing portal at any time. You retain access until the end of the current billing period.",
              },
              {
                q: "Do monthly limits reset?",
                a: "Yes. Hand and coaching limits reset on the 1st of each calendar month (UTC).",
              },
              {
                q: "What counts as an AI coach session?",
                a: "Each hand analysis and each follow-up question in the coach chat counts as one session against your monthly allowance.",
              },
              {
                q: "Can I upgrade mid-month?",
                a: "Yes. Upgrading takes effect immediately. You get the new limits for the remainder of the current month.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-6">
                <p className="font-semibold text-foreground mb-2">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
