import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: allTags = [] } = trpc.hands.getAllTags.useQuery();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Display selected tags */}
      {selectedTags.map((tag) => {
        const tagData = allTags.find(t => t.tag === tag);
        return (
          <Badge
            key={tag}
            className="group relative pr-6"
            style={{ backgroundColor: tagData?.color || "#3b82f6" }}
          >
            {tag}
            <button
              onClick={() => toggleTag(tag)}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      })}

      {/* Filter button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter by Tags
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filter by Tags</h4>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags yet. Add tags to your hands to filter them here.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.tag);
                  return (
                    <button
                      key={tag.tag}
                      onClick={() => toggleTag(tag.tag)}
                      className={`w-full flex items-center justify-between p-2 rounded-md border transition-colors ${
                        isSelected
                          ? "bg-accent border-accent-foreground"
                          : "hover:bg-muted border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm font-medium">{tag.tag}</span>
                      </div>
                      <Badge variant="secondary" className="h-5 px-2">
                        {tag.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Showing hands with {selectedTags.length === 1 ? "this tag" : "all selected tags"}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
