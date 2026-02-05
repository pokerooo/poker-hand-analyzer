import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TagManagerProps {
  handId: number;
}

const TAG_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

const TAG_PRESETS = [
  "bluff",
  "hero call",
  "cooler",
  "mistake",
  "value bet",
  "thin value",
  "missed value",
  "good fold",
  "bad beat",
  "setup",
];

export function TagManager({ handId }: TagManagerProps) {
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: tags = [] } = trpc.hands.getTags.useQuery({ handId });
  const { data: allTags = [] } = trpc.hands.getAllTags.useQuery();

  const addTagMutation = trpc.hands.addTag.useMutation({
    onSuccess: () => {
      utils.hands.getTags.invalidate({ handId });
      utils.hands.getAllTags.invalidate();
      toast.success("Tag added");
      setNewTag("");
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add tag");
    },
  });

  const removeTagMutation = trpc.hands.removeTag.useMutation({
    onSuccess: () => {
      utils.hands.getTags.invalidate({ handId });
      utils.hands.getAllTags.invalidate();
      toast.success("Tag removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove tag");
    },
  });

  const handleAddTag = (tag: string, color: string = selectedColor) => {
    if (!tag.trim()) return;
    addTagMutation.mutate({ handId, tag: tag.trim().toLowerCase(), color });
  };

  const handleRemoveTag = (tag: string) => {
    removeTagMutation.mutate({ handId, tag });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTag(newTag);
    }
  };

  // Get suggested tags (existing tags not already on this hand)
  const currentTagNames = tags.map(t => t.tag);
  const suggestedTags = allTags
    .filter(t => !currentTagNames.includes(t.tag))
    .slice(0, 5);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display existing tags */}
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          className="group relative pr-6"
          style={{ backgroundColor: tag.color }}
        >
          {tag.tag}
          <button
            onClick={() => handleRemoveTag(tag.tag)}
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2">
            <Plus className="w-3 h-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Add Tag
              </h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddTag(newTag)}
                  disabled={!newTag.trim() || addTagMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color:</p>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedColor === color
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick tags:</p>
              <div className="flex gap-2 flex-wrap">
                {TAG_PRESETS.filter(preset => !currentTagNames.includes(preset)).slice(0, 8).map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleAddTag(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* Suggested tags from user's history */}
            {suggestedTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  From your tags:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {suggestedTags.map((tag) => (
                    <Button
                      key={tag.tag}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleAddTag(tag.tag, tag.color)}
                      style={{ borderColor: tag.color }}
                    >
                      {tag.tag}
                      <span className="ml-1 text-muted-foreground">
                        ({tag.count})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
