import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Crown, Check, X } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason: "hands" | "coach";
  currentPlan?: "fish" | "reg" | "shark";
}

const REASON_COPY = {
  hands: {
    title: "Monthly Hand Limit Reached",
    description: "You've used all your hand analyses for this month. Upgrade to continue reviewing hands.",
  },
  coach: {
    title: "Monthly AI Coach Limit Reached",
    description: "You've used all your AI coaching sessions for this month. Upgrade for more coaching.",
  },
};

export default function UpgradeModal({ open, onClose, reason, currentPlan = "fish" }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");

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
    setLoadingPlan(plan);
    createCheckout.mutate({ origin: window.location.origin, plan, interval });
  };

  const copy = REASON_COPY[reason];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-card via-card to-muted/20 p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-foreground mb-2">{copy.title}</DialogTitle>
                <DialogDescription className="text-muted-foreground leading-relaxed">
                  {copy.description}
                </DialogDescription>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Billing toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setInterval("month")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                interval === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                interval === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-1 py-0">
                Save 30%
              </Badge>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Reg */}
            {currentPlan === "fish" && (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-foreground">Reg</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {interval === "month" ? "$19" : "$8.25"}
                    </span>
                    <span className="text-muted-foreground text-xs mb-1">/mo</span>
                  </div>
                  {interval === "year" && (
                    <p className="text-xs text-emerald-500">$99/year</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {["15 hands/month", "15 coach sessions", "Memory Bank", "Pattern Detection"].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => handleUpgrade("reg")}
                  disabled={loadingPlan !== null}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1.5"
                >
                  {loadingPlan === "reg" ? (
                    <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  Upgrade to Reg
                </Button>
              </div>
            )}

            {/* Shark */}
            <div className={`rounded-xl border-2 border-primary bg-card p-4 flex flex-col gap-4 ${currentPlan === "fish" ? "" : "col-span-2"}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="font-bold text-foreground">Shark</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0 ml-auto">Best</Badge>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {interval === "month" ? "$29" : "$16.58"}
                  </span>
                  <span className="text-muted-foreground text-xs mb-1">/mo</span>
                </div>
                {interval === "year" && (
                  <p className="text-xs text-emerald-500">$199/year</p>
                )}
              </div>
              <ul className="space-y-1.5 flex-1">
                {["50 hands/month", "Unlimited coaching", "All features", "Priority AI quality"].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                onClick={() => handleUpgrade("shark")}
                disabled={loadingPlan !== null}
                className="w-full font-bold text-xs gap-1.5"
              >
                {loadingPlan === "shark" ? (
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Crown className="w-3 h-3" />
                )}
                Upgrade to Shark
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link href="/pricing" onClick={onClose}>
              <button className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                View full pricing details
              </button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
