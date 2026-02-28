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

  // eatingBudget = what you can eat and still hit the deficit goal
  const eatingBudget = goalDeficit && goalDeficit > 0 ? tdee - goalDeficit : tdee;

  // Bar reference = eatingBudget (= 100%). Deficit zone shown separately on the right.
  // consumedVsBudget: how much of the eating budget is used
  const consumedVsBudgetPercent = tdee > 0
    ? Math.round((consumedCalories / tdee) * 100)
    : 0;

  // Width of deficit zone relative to bar total (eatingBudget + goalDeficit = tdee)
  // We display the bar as: [eatingBudget portion | deficit zone portion]
  // Total bar width = tdee, eating budget portion = eatingBudget/tdee * 100%
  const eatingBudgetPct = tdee > 0 ? Math.round((eatingBudget / tdee) * 100) : 100;
  const deficitZonePct = 100 - eatingBudgetPct;

  // Orange bar grows within eating budget area only (capped at eatingBudgetPct of total)
  const orangeBarPct = tdee > 0
    ? Math.min(eatingBudgetPct, Math.round((consumedCalories / tdee) * 100))
    : 0;

  // If consumed > eatingBudget → into deficit zone; if > tdee → over budget
  const remainingBeforeDeficitZone = eatingBudget - consumedCalories;
  const inDeficitZone = remainingBeforeDeficitZone < 0;
  const overBudget = consumedCalories > tdee;

  // How far into deficit zone (or over TDEE)
  const excessIntoDeficit = Math.abs(remainingBeforeDeficitZone); // kcal past eatingBudget
  const kcalOverTdee = consumedCalories - tdee; // kcal past TDEE

  // Red overlay: how much of the deficit zone is consumed (as % of total bar)
  const redOverlayPct = inDeficitZone && tdee > 0
    ? Math.min(deficitZonePct, Math.round((Math.min(excessIntoDeficit, goalDeficit ?? 0) / tdee) * 100))
    : 0;

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-background px-3 py-1.5 space-y-1">
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
          {/*
            Bar layout (total = TDEE = 100%):
            [  orange (consumed, max = eatingBudget)  |  green deficit zone  ]
            If in deficit zone: red overlays the right portion of the bar
            The green zone is always visible on the right.
          */}
          <div className="relative h-2 rounded-full bg-muted">
            {/* Green deficit zone – always visible on the right */}
            <div
              className="absolute right-0 top-0 h-full rounded-r-full"
              style={{
                width: `${deficitZonePct}%`,
                backgroundColor: overBudget
                  ? "hsl(var(--destructive) / 0.20)"
                  : "hsl(var(--success) / 0.25)",
              }}
            />
            {/* Orange consumed bar – grows left to right, stops at eatingBudget boundary */}
            <div
              className="absolute left-0 top-0 h-full transition-all duration-500"
              style={{
                width: `${orangeBarPct}%`,
                backgroundColor: "hsl(var(--primary))",
                borderRadius: orangeBarPct >= eatingBudgetPct ? "9999px 0 0 9999px" : "9999px",
              }}
            />
            {/* Red overlay inside deficit zone when consumed > eatingBudget */}
            {inDeficitZone && redOverlayPct > 0 && (
              <div
                className="absolute top-0 h-full transition-all duration-500"
                style={{
                  left: `${eatingBudgetPct}%`,
                  width: `${redOverlayPct}%`,
                  backgroundColor: overBudget
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--destructive) / 0.7)",
                  borderRadius: overBudget || (eatingBudgetPct + redOverlayPct >= 100) ? "0 9999px 9999px 0" : "0",
                }}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-bold">{consumedVsBudgetPercent}%</span> des Kalorienbudgets verbraucht.
            </span>
            <span style={{ color: overBudget ? "hsl(var(--destructive) / 0.7)" : "hsl(var(--success) / 0.7)" }}>
              Defizit-Zone
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {overBudget
              ? <span>Du hast das Tagesbudget um <span className="font-bold">{kcalOverTdee} kcal</span> überschritten.</span>
              : inDeficitZone
                ? <span>Du bist <span className="font-bold">{excessIntoDeficit} kcal</span> in der Defizit-Zone.</span>
                : <span>Noch <span className="font-bold">{remainingBeforeDeficitZone} kcal</span> bis zur Defizit-Zone.</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default DeficitDisplay;
