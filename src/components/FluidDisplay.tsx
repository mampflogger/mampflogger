import { NutritionEntry } from "@/types/nutrition";
import { Droplets } from "lucide-react";

interface FluidDisplayProps {
  entries: NutritionEntry[];
  goalMl?: number;
}

const FluidDisplay = ({ entries, goalMl }: FluidDisplayProps) => {
  const totalMl = entries.reduce((sum, entry) => {
    return sum + (entry.liquidMl ?? 0);
  }, 0);

  const rawPercentage = goalMl && goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : null;
  const percentage = rawPercentage !== null ? Math.min(100, rawPercentage) : null;
  const isReached = goalMl ? totalMl >= goalMl : false;
  const isExceeded = rawPercentage !== null && rawPercentage > 100;
  const exceededBy = rawPercentage !== null ? rawPercentage - 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-1.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Droplets className="w-3.5 h-3.5" />
          Flüssigkeitsaufnahme
        </span>
        <span className="text-sm font-bold text-foreground">
          {totalMl} ml
        </span>
      </div>
      {goalMl && goalMl > 0 && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: isReached
                  ? "hsl(var(--success))"
                  : "hsl(var(--warning, 38 92% 50%))",
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {totalMl === 0
              ? <span>Trink was, dann kommst du deinem Ziel näher!</span>
              : isExceeded
                ? <span>Du hast dein Ziel um <span className="font-bold">{exceededBy} %</span> übertroffen.</span>
                : isReached
                  ? <span>Du hast dein Ziel erreicht.</span>
                  : <span>Du hast schon <span className="font-bold">{percentage} %</span> deines Tagesziels geschafft.</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default FluidDisplay;
