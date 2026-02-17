import { UserProfile, calculateBMR } from "@/types/profile";
import { TrendingDown, TrendingUp, Flame, Zap } from "lucide-react";

interface DeficitDisplayProps {
  profile: UserProfile;
  activityBonus: number;
  consumedCalories: number;
  goalDeficit?: number;
}

const DeficitDisplay = ({ profile, activityBonus, consumedCalories, goalDeficit }: DeficitDisplayProps) => {
  const bmr = calculateBMR(profile);
  const tdee = bmr + activityBonus;
  const deficit = tdee - consumedCalories;
  const isDeficit = deficit > 0;

  // Budget = how much you can eat while still hitting your deficit goal
  const budget = goalDeficit && goalDeficit > 0 ? tdee - goalDeficit : tdee;
  const budgetUsedPercent = budget > 0 ? Math.min(100, Math.round((consumedCalories / budget) * 100)) : 0;
  const remaining = budget - consumedCalories;
  const overBudget = remaining < 0;

  return (
    <div className="rounded-xl bg-accent/40 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" />
          Grundumsatz (inkl. NEAT)
        </span>
        <span className="font-semibold text-foreground">{bmr} kcal</span>
      </div>
      {activityBonus > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Bewegungsbonus
          </span>
          <span className="font-semibold text-foreground">+{activityBonus} kcal</span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
        <span>Kalorienbudget</span>
        <span className="font-semibold text-foreground">{tdee} kcal</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Kalorienaufnahme</span>
        <span className="font-semibold text-foreground">{consumedCalories} kcal</span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: isDeficit ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
          {isDeficit ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          {isDeficit ? "Defizit" : "Überschuss"}
        </span>
        <span className="text-lg font-bold" style={{ color: isDeficit ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
          {isDeficit ? `-${deficit}` : `+${Math.abs(deficit)}`} kcal
        </span>
      </div>
      {goalDeficit && goalDeficit > 0 && (
        <>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            {/* Deficit goal reserved at the end */}
            <div
              className="absolute right-0 top-0 h-full rounded-r-full"
              style={{
                width: `${Math.min(100, Math.round((goalDeficit / tdee) * 100))}%`,
                backgroundColor: "hsl(var(--success) / 0.25)",
              }}
            />
            {/* Consumed portion */}
            <div
              className="relative h-full rounded-full transition-all duration-500"
              style={{
                width: `${budgetUsedPercent}%`,
                backgroundColor: overBudget
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--warning, 38 92% 50%))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{budgetUsedPercent}% deines Tagesbudgets sind verbraucht</span>
            <span style={{ color: "hsl(var(--success) / 0.7)" }}>Defizit Ziel</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {overBudget
              ? <span>du hast <span className="font-bold">{Math.abs(remaining)} kcal</span> über Budget</span>
              : <span>du hast noch <span className="font-bold">{remaining} kcal</span> übrig</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default DeficitDisplay;
