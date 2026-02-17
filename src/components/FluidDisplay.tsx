import { NutritionEntry } from "@/types/nutrition";
import { FoodItem } from "@/data/foodDatabase";
import { Droplets } from "lucide-react";

interface FluidDisplayProps {
  entries: NutritionEntry[];
  foodDatabase: FoodItem[];
  goalMl?: number;
}

const FluidDisplay = ({ entries, foodDatabase, goalMl }: FluidDisplayProps) => {
  const totalMl = entries.reduce((sum, entry) => {
    const food = foodDatabase.find(
      (f) => f.name.toLowerCase() === entry.food.toLowerCase()
    );
    if (!food || !(food as any).liquidMl) return sum;
    const factor = entry.amount / food.baseAmount;
    return sum + Math.round((food as any).liquidMl * factor);
  }, 0);

  const percentage = goalMl && goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : null;
  const isReached = goalMl ? totalMl >= goalMl : false;

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
              : <span>Du hast schon <span className="font-bold">{percentage} %</span> deines Tagesziels geschafft</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default FluidDisplay;
