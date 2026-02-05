import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState } from "react";
import { Search, Trash2, Eye, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { TagFilter } from "@/components/TagFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const POSITIONS = ["UTG", "UTG+1", "UTG+2", "MP", "MP+1", "CO", "BTN", "SB", "BB"];

export default function HandArchive() {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: handsAll, isLoading: loadingAll, refetch: refetchAll } = trpc.hands.list.useQuery(undefined, {
    enabled: isAuthenticated && selectedTags.length === 0,
  });
  
  const { data: handsFiltered, isLoading: loadingFiltered, refetch: refetchFiltered } = trpc.hands.filterByTags.useQuery(
    { tags: selectedTags },
    { enabled: isAuthenticated && selectedTags.length > 0 }
  );
  
  const hands = selectedTags.length > 0 ? handsFiltered : handsAll;
  const isLoading = selectedTags.length > 0 ? loadingFiltered : loadingAll;
  const refetch = selectedTags.length > 0 ? refetchFiltered : refetchAll;

  const deleteMutation = trpc.hands.delete.useMutation({
    onSuccess: () => {
      toast.success("Hand deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete hand: ${error.message}`);
    },
  });

  const handleDelete = (handId: number) => {
    deleteMutation.mutate({ id: handId });
  };

  // Filter hands based on search and position
  const filteredHands = hands?.filter((hand) => {
    const heroCards = `${hand.heroCard1 || ""} ${hand.heroCard2 || ""}`.trim();
    const matchesSearch = 
      hand.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      heroCards.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = 
      filterPosition === "all" || hand.heroPosition === filterPosition;

    return matchesSearch && matchesPosition;
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCards = (cards: string) => {
    // Parse cards like "As Tc" and add color coding
    const cardParts = cards.split(" ");
    return cardParts.map((card, idx) => {
      const rank = card.slice(0, -1);
      const suit = card.slice(-1);
      const suitSymbol = suit === "h" ? "♥" : suit === "d" ? "♦" : suit === "s" ? "♠" : "♣";
      const isRed = suit === "h" || suit === "d";
      
      return (
        <span key={idx} className={isRed ? "text-red-600" : ""}>
          {rank}{suitSymbol}
          {idx < cardParts.length - 1 && " "}
        </span>
      );
    });
  };

  const getRatingColor = (rating: number | string | null) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : (rating || 0);
    if (numRating >= 8) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (numRating >= 6) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your hand archive.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <span className="text-accent">♠</span>
                Hand Archive
              </h1>
              <p className="text-muted-foreground mt-2">
                Review and analyze your poker hands
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/compare">
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Compare Hands
                </Button>
              </Link>
              <Link href="/input">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  <span className="text-xl">+</span>
                  New Hand
                </Button>
              </Link>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
              <Button
                variant={filterPosition === "all" ? "default" : "outline"}
                onClick={() => setFilterPosition("all")}
                size="sm"
              >
                All Positions
              </Button>
              {POSITIONS.map((pos) => (
                <Button
                  key={pos}
                  variant={filterPosition === pos ? "default" : "outline"}
                  onClick={() => setFilterPosition(pos)}
                  size="sm"
                >
                  {pos}
                </Button>
              ))}
            </div>
            
            <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>
        </div>
      </div>

      {/* Hands List */}
      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading your hands...
          </div>
        ) : filteredHands && filteredHands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHands.map((hand) => (
              <Card key={hand.id} className="bg-card border-border hover:border-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {hand.title || "Untitled Hand"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatDate(hand.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge className={`${getRatingColor(hand.overallRating)} border`}>
                      {hand.overallRating || "0"}/10
                    </Badge>
                  </div>
                </CardHeader>
                {/* @ts-ignore - Type issue with json fields */}
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <span className="ml-2 font-semibold text-accent">{hand.heroPosition}</span>
                    </div>
                    <div className="font-mono font-bold">
                      {hand.heroCard1 && hand.heroCard2 && (
                        <>{formatCards(`${hand.heroCard1} ${hand.heroCard2}`)}</>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">
                      {String(hand.smallBlind)}/{String(hand.bigBlind)}
                      {(Number(hand.ante) || 0) > 0 && ` • Ante: ${String(hand.ante)}`}
                    </span>
                  </div>

                  {hand.mistakeTags && Array.isArray(hand.mistakeTags) && hand.mistakeTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(hand.mistakeTags as string[]).slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {hand.mistakeTags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{hand.mistakeTags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/hand/${hand.id}`} className="flex-1">
                      <Button variant="default" className="w-full gap-2" size="sm">
                        <Eye className="h-4 w-4" />
                        View Analysis
                      </Button>
                    </Link>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Hand?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this hand from your archive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(hand.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">No Hands Found</CardTitle>
              <CardDescription className="text-center">
                {searchTerm || filterPosition !== "all" || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Start by inputting your first hand"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/input">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  <span className="text-xl">+</span>
                  Input Your First Hand
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
