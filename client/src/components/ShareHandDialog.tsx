import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Twitter, Facebook, Linkedin, Link as LinkIcon, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

type ShareHandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hand: {
    id: number;
    title?: string | null;
    heroPosition?: string | null;
    heroCard1?: string | null;
    heroCard2?: string | null;
    overallRating?: string | number | null;
  };
};

export function ShareHandDialog({ open, onOpenChange, hand }: ShareHandDialogProps) {
  const [copied, setCopied] = useState(false);

  const formatCard = (card: string | null) => {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitMap: Record<string, string> = { h: "♥", d: "♦", s: "♠", c: "♣" };
    return `${rank}${suitMap[suit] || suit}`;
  };

  const handUrl = `${window.location.origin}/hand/${hand.id}`;
  const heroCards = hand.heroCard1 && hand.heroCard2 
    ? `${formatCard(hand.heroCard1)}${formatCard(hand.heroCard2)}`
    : "";
  
  const shareText = hand.title 
    ? `Check out my poker hand analysis: ${hand.title}`
    : `Check out my ${heroCards} from ${hand.heroPosition} - rated ${hand.overallRating}/10`;
  
  const hashtags = "poker,pokerhand,pokerstrategy";

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(handUrl)}&hashtags=${hashtags}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(handUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(handUrl)}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(handUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], "_blank", "width=600,height=400");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent" />
            Share Hand Analysis
          </DialogTitle>
          <DialogDescription>
            Share this hand with your poker community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hand Preview */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm line-clamp-1">
                  {hand.title || "Poker Hand"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {heroCards} from {hand.heroPosition}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-accent">
                  {hand.overallRating || "N/A"}
                </span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            </div>
          </div>

          {/* Social Media Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Share on Social Media</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleShare("twitter")}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <Twitter className="h-5 w-5" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShare("facebook")}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <Facebook className="h-5 w-5" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShare("linkedin")}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-xs">LinkedIn</span>
              </Button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Copy Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={handUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-md"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Export Image */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Export as Image</label>
            <Link href={`/share/${hand.id}`}>
              <Button variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Create Social Media Image
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
