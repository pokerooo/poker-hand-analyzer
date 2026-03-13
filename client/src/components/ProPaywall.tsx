import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, Check, Lock } from "lucide-react";

interface ProPaywallProps {
  feature: "coach" | "import" | "patterns";
  onUnlocked?: () => void;
}

const FEATURE_LABELS: Record<string, { title: string; description: string }> = {
  coach: {
    title: "AI Coach Analysis",
    description: "Get deep exploitative analysis on every street, villain-specific adjustments, and a grade for your play.",
  },
  import: {
    title: "Hand History Import",
    description: "Import PokerStars and GGPoker hand histories directly. Bulk import entire sessions in seconds.",
  },
  patterns: {
    title: "Pattern Recognition",
    description: "Identify recurring leaks across your entire hand history with AI-powered session analysis.",
  },
};

const PRO_FEATURES = [
  "Unlimited AI Coach analysis on every hand",
  "Villain-type exploitative adjustments",
  "Hand history import (PokerStars & GGPoker)",
  "Cross-session pattern recognition & leak detection",
  "Villain Roast Mode",
  "Study streak tracking",
];

export default function ProPaywall({ feature, onUnlocked }: ProPaywallProps) {
  const [loading, setLoading] = useState(false);

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.success("Redirecting to checkout...", { description: "Opening Stripe in a new tab." });
        window.open(data.checkoutUrl, "_blank");
      }
    },
    onError: (err) => {
        toast.error("Checkout error", { description: err.message });
      setLoading(false);
    },
  });

  const handleUpgrade = () => {
    setLoading(true);
    createCheckout.mutate(
      { origin: window.location.origin, plan: "shark", interval: "month" },
      { onSettled: () => setLoading(false) }
    );
  };

  const featureInfo = FEATURE_LABELS[feature];

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      <div className="relative space-y-5">
        {/* Lock icon + title */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">{featureInfo.title}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{featureInfo.description}</p>
          </div>
        </div>

        {/* Pro features list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Poker AI Pro includes:</p>
          <ul className="space-y-1.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div>
            <span className="text-2xl font-bold text-white">$19.99</span>
            <span className="text-slate-400 text-sm"> / month</span>
            <p className="text-xs text-slate-500 mt-0.5">Cancel anytime</p>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={loading || createCheckout.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 shadow-lg shadow-amber-500/25 gap-2"
          >
            {(loading || createCheckout.isPending) ? (
              <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Redirecting…</>
            ) : (
              <><Zap className="w-4 h-4" />Upgrade to Pro</>
            )}
          </Button>
        </div>

        {/* Test card hint */}
        <p className="text-xs text-slate-500 text-center">
          Test with card <span className="font-mono text-slate-400">4242 4242 4242 4242</span> · Any expiry · Any CVC
        </p>
      </div>
    </div>
  );
}
