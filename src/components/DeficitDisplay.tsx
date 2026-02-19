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

  // Bar: 100% = TDEE. Orange = consumed / TDEE. Green zone = goalDeficit / TDEE from the right.
  const eatingBudget = goalDeficit && goalDeficit > 0 ? tdee - goalDeficit : tdee;
  const consumedPercent = tdee > 0 ? Math.min(110, Math.round((consumedCalories / tdee) * 100)) : 0;
  const deficitZonePercent = tdee > 0 ? Math.round((goalDeficit ?? 0) / tdee * 100) : 0;
  const remainingBeforeDeficitZone = eatingBudget - consumedCalories;
  const inDeficitZone = remainingBeforeDeficitZone < 0;

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-accent/40 px-3 py-1.5 space-y-1">
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
              Activity Bonus
            </span>
            <span className="font-semibold text-foreground">+{activityBonus} kcal</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-1">
          <span>Kalorienbudget</span>
          <span className="font-semibold text-foreground">{tdee} kcal</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Kalorienaufnahme</span>
          <span className="font-semibold text-foreground">{consumedCalories} kcal</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: isDeficit ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
            {isDeficit ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {isDeficit ? "Defizit" : "Überschuss"}
          </span>
          <span className="text-sm font-bold" style={{ color: isDeficit ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
            {isDeficit ? `-${deficit}` : `+${Math.abs(deficit)}`} kcal
          </span>
        </div>
      </div>
      {goalDeficit && goalDeficit > 0 && (
        <>
          {/* Bar: total width = TDEE (100%). Green zone from right = Defizit-Ziel. Orange = consumed. */}
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            {/* Green deficit zone on the right */}
            <div
              className="absolute right-0 top-0 h-full"
              style={{
                width: `${deficitZonePercent}%`,
                backgroundColor: "hsl(var(--success) / 0.25)",
              }}
            />
            {/* Orange consumed bar */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, consumedPercent)}%`,
                backgroundColor: inDeficitZone
                  ? "hsl(var(--warning, 38 92% 50%))"
                  : "hsl(var(--warning, 38 92% 50%))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-bold">{consumedPercent}%</span> des Tagesbudgets verbraucht.
            </span>
            <span style={{ color: "hsl(var(--success) / 0.7)" }}>Defizit-Zone</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {inDeficitZone
              ? <span>Du bist <span className="font-bold">{Math.abs(remainingBeforeDeficitZone)} kcal</span> in der Defizit-Zone.</span>
              : <span>Noch <span className="font-bold">{remainingBeforeDeficitZone} kcal</span> bis zur Defizit-Zone.</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default DeficitDisplay;
