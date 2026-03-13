import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown, Zap, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function UpgradeSuccess() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") ?? "shark";

  // Invalidate stripe status so the UI reflects the new plan immediately
  const utils = trpc.useUtils();
  useEffect(() => {
    utils.stripe.status.invalidate();
    utils.rateLimit.getUsage.invalidate();
  }, []);

  const isPlanShark = plan === "shark";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
            isPlanShark
              ? "bg-primary/10 border-2 border-primary/30"
              : "bg-amber-500/10 border-2 border-amber-500/30"
          }`}>
            {isPlanShark
              ? <Crown className="w-10 h-10 text-primary" />
              : <Zap className="w-10 h-10 text-amber-400" />
            }
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welcome to {isPlanShark ? "Shark" : "Reg"}!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {isPlanShark
              ? "You now have 50 hand analyses per month, unlimited AI coaching, and access to every feature. Time to exploit."
              : "You now have 15 hand analyses and 15 AI coach sessions per month, plus Memory Bank and Pattern Detection."
            }
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/my-hands">
            <Button className="w-full gap-2 font-bold">
              Go to My Hands
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Analyse a New Hand
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
