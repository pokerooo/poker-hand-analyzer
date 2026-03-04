import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, ArrowLeft, Plus, Share2, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function MyHands() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const { data: hands, isLoading, refetch } = trpc.hands.myHands.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.hands.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Hand deleted");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold">Sign in to see your hands</h2>
        <p className="text-muted-foreground">Your saved hands will appear here after you sign in.</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>
          Sign In
        </Button>
        <Button variant="ghost" onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold">My Hands</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" onClick={() => navigate("/")} className="gap-1">
            <Plus className="h-4 w-4" /> New Hand
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hands || hands.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🃏</div>
            <h3 className="text-xl font-semibold">No hands yet</h3>
            <p className="text-muted-foreground">Go back and describe your first hand to get started.</p>
            <Button onClick={() => navigate("/")}>Describe a Hand</Button>
          </div>
        ) : (
          hands.map((hand) => {
            const parsed = hand.parsedData as any;
            const heroCards = parsed?.heroCards?.join(" ") || "?";
            const position = parsed?.heroPosition || "?";
            const blinds = `${parsed?.smallBlind ?? "?"}/${parsed?.bigBlind ?? "?"}`;
            const streets = parsed?.streets?.length || 0;

            return (
              <Card
                key={hand.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/hand/${hand.shareSlug}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-base">{heroCards}</span>
                        <span className="text-sm text-muted-foreground">{position}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{blinds}</span>
                        {hand.coachUnlocked && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">🧠 Coached</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 font-mono">
                        {hand.rawText.slice(0, 120)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(hand.createdAt), { addSuffix: true })} · {streets} streets
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/hand/${hand.shareSlug}`;
              navigator.clipboard.writeText(url);
                  toast.success("Link copied!");
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this hand?")) {
                            deleteMutation.mutate({ id: hand.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
