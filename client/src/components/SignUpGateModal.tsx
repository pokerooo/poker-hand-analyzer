import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Zap, Crown, Fish, X } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

interface SignUpGateModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignUpGateModal({ open, onClose }: SignUpGateModalProps) {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-card via-card to-muted/20 p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-foreground mb-2">
                  Create a Free Account to Continue
                </DialogTitle>
                <DialogDescription className="text-muted-foreground leading-relaxed">
                  You've used your 3 free hand replays. Sign up for free to keep analysing hands and tracking your progress.
                </DialogDescription>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* What you get free */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Fish className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-foreground">Free Account Includes</span>
            </div>
            <ul className="space-y-2">
              {[
                "3 hand analyses per month",
                "3 AI coach sessions per month",
                "Hand replay visualiser",
                "Street-by-street breakdown",
                "Save and review your hands",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              onClick={handleLogin}
              className="w-full font-bold gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign Up Free
            </Button>
            <Button
              onClick={handleLogin}
              variant="outline"
              className="w-full gap-2"
            >
              Log In
            </Button>
          </div>

          {/* Upgrade nudge */}
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-2">Want more hands and unlimited coaching?</p>
            <Link href="/pricing" onClick={onClose}>
              <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1 mx-auto">
                <Crown className="w-3 h-3" />
                View Reg & Shark plans
              </button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
