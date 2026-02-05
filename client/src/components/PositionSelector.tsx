import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POSITIONS = [
  { value: "UTG", label: "UTG", description: "Under the Gun" },
  { value: "UTG+1", label: "UTG+1", description: "UTG + 1" },
  { value: "UTG+2", label: "UTG+2", description: "UTG + 2" },
  { value: "MP", label: "MP", description: "Middle Position" },
  { value: "MP+1", label: "MP+1", description: "MP + 1" },
  { value: "CO", label: "CO", description: "Cutoff" },
  { value: "BTN", label: "BTN", description: "Button" },
  { value: "SB", label: "SB", description: "Small Blind" },
  { value: "BB", label: "BB", description: "Big Blind" },
] as const;

interface PositionSelectorProps {
  value?: string;
  onChange: (position: string) => void;
  label?: string;
}

export function PositionSelector({ value, onChange, label }: PositionSelectorProps) {
  return (
    <div>
      {label && <label className="text-sm font-medium mb-3 block">{label}</label>}
      <div className="grid grid-cols-3 gap-2">
        {POSITIONS.map((position) => (
          <Button
            key={position.value}
            variant={value === position.value ? "default" : "outline"}
            onClick={() => onChange(position.value)}
            className={cn(
              "h-16 flex flex-col items-center justify-center",
              value === position.value && "bg-accent text-accent-foreground"
            )}
          >
            <span className="font-bold text-base">{position.label}</span>
            <span className="text-xs opacity-70">{position.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
