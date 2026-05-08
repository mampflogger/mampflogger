import { useMemo, useRef, useState, useEffect } from "react";
import { Scale, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserProfile,
  BookedActivity,
  WeightEntry,
  calculateBMR,
  calculateBookedActivityBonus,
  getEffectiveWeightKg,
} from "@/types/profile";
import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";

const KCAL_PER_KG = 7700;

interface WeightTrackerProps {
  profile: UserProfile;
  entries: NutritionEntry[];
  bookedActivities: BookedActivity[];
  weightLog: WeightEntry[];
  selectedDate: string;
  onSaveWeight: (date: string, kg: number) => void;
}

const WeightTracker = ({
  profile,
  entries,
  bookedActivities,
  weightLog,
  selectedDate,
  onSaveWeight,
}: WeightTrackerProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const existingForDate = weightLog.find((w) => w.date === selectedDate);
  const [value, setValue] = useState<string>(
    existingForDate ? existingForDate.kg.toFixed(1).replace(".", ",") : "",
  );

  useEffect(() => {
    setValue(existingForDate ? existingForDate.kg.toFixed(1).replace(".", ",") : "");
  }, [selectedDate, existingForDate?.kg]);

  // Computed weight = startWeight - sum(deficits up to selectedDate) / 7700
  const computed = useMemo(() => {
    const bmr = calculateBMR(profile);
    const dateSet = new Set(entries.map((e) => e.date));
    let totalDeficit = 0;
    for (const dateStr of dateSet) {
      if (dateStr > selectedDate) continue;
      const dayEntries = entries.filter((e) => e.date === dateStr);
      if (dayEntries.length === 0) continue;
      const summary = calculateDailySummary(dayEntries);
      const bonus = calculateBookedActivityBonus(bookedActivities, dateStr);
      totalDeficit += (bmr + bonus) - summary.totalCalories;
    }
    const kgChange = totalDeficit / KCAL_PER_KG;
    return profile.weightKg - kgChange;
  }, [profile, entries, bookedActivities, selectedDate]);

  // Latest manually entered weight up to selectedDate
  const latestActual = useMemo(() => {
    const sorted = weightLog
      .filter((w) => w.date <= selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] ?? null;
  }, [weightLog, selectedDate]);

  const actualKg = latestActual?.kg ?? null;
  const delta = actualKg !== null ? actualKg - computed : null;

  const startWeight = profile.weightKg;
  const goalWeight = profile.goalWeightKg;
  const referenceForBar = actualKg ?? computed;

  const goalProgress = useMemo(() => {
    if (!goalWeight || goalWeight === startWeight) return null;
    const totalDelta = startWeight - goalWeight; // positive = lose, negative = gain
    const currentDelta = startWeight - referenceForBar;
    const pct = (currentDelta / totalDelta) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }, [startWeight, goalWeight, referenceForBar]);

  const handleSave = () => {
    const normalized = value.replace(",", ".").trim();
    const kg = parseFloat(normalized);
    if (!isFinite(kg) || kg <= 0 || kg > 500) return;
    const rounded = Math.round(kg * 10) / 10;
    onSaveWeight(selectedDate, rounded);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const fmt = (n: number) => n.toFixed(1).replace(".", ",");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Scale className="w-3.5 h-3.5" />
          Aktuelle Gewichtsermittlung
        </span>
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="kg"
            className="h-7 w-20 text-right text-sm"
            data-voice-target="weight-input"
          />
          <span className="text-xs text-muted-foreground">kg</span>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-3 text-xs"
            onClick={handleSave}
          >
            OK
          </Button>
        </div>
      </div>

      {(actualKg !== null || entries.length > 0) && (
        <div className="rounded-lg bg-background px-3 py-1.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Rechnerisches Gewicht</span>
            <span className="font-semibold text-foreground">{fmt(computed)} kg</span>
          </div>
          {actualKg !== null && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Aktuelles Gewicht</span>
                <span className="font-semibold text-foreground">{fmt(actualKg)} kg</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-border pt-1">
                <span className="text-muted-foreground">Abweichung</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      Math.abs(delta!) < 0.05
                        ? "hsl(var(--foreground))"
                        : delta! < 0
                          ? "hsl(var(--primary))"
                          : "hsl(var(--destructive))",
                  }}
                >
                  {delta! > 0 ? "+" : delta! < 0 ? "−" : ""}
                  {fmt(Math.abs(delta!))} kg
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {goalWeight && goalWeight !== startWeight && goalProgress !== null && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${goalProgress}%`,
                backgroundColor:
                  goalProgress >= 100 ? "hsl(var(--success))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Start {fmt(startWeight)} kg → Ziel {fmt(goalWeight)} kg
            </span>
            <span className="font-bold text-foreground">{goalProgress}%</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {goalProgress >= 100
              ? <span>Du hast dein Gewichtsziel erreicht!</span>
              : <span>Du hast schon <span className="font-bold">{goalProgress} %</span> deines Gewichtsziels geschafft.</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default WeightTracker;
