import { UserProfile, calculateBMR } from "@/types/profile";
import { TrendingDown, TrendingUp, Flame, Zap } from "lucide-react";

interface DeficitDisplayProps {
  profile: UserProfile;
  activityBonus: number;
  consumedCalories: number;
}

const DeficitDisplay = ({ profile, activityBonus, consumedCalories }: DeficitDisplayProps) => {
  const bmr = calculateBMR(profile);
  const tdee = bmr + activityBonus;
  const deficit = tdee - consumedCalories;
  const isDeficit = deficit > 0;

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
        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
          {isDeficit ? <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(var(--success))" }} /> : <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--destructive))" }} />}
          {isDeficit ? "Defizit" : "Überschuss"}
        </span>
        <span className="text-lg font-bold" style={{ color: isDeficit ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
          {isDeficit ? `-${deficit}` : `+${Math.abs(deficit)}`} kcal
        </span>
      </div>
    </div>
  );
};

export default DeficitDisplay;
