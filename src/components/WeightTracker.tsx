import { useMemo, useRef, useState, useEffect } from "react";
import { Scale, Target, Info, ChevronDown } from "lucide-react";
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

const formatDateShort = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.`;
};

const WeightTracker = ({
  profile,
  entries,
  bookedActivities,
  weightLog,
  selectedDate,
  onSaveWeight,
}: WeightTrackerProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  // Voice events
  useEffect(() => {
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<{ value: number | string }>).detail;
      const v = detail?.value;
      if (v === "" || v === undefined || v === null) {
        setValue("");
        return;
      }
      const num = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."));
      if (Number.isFinite(num)) {
        setValue(num.toFixed(1).replace(".", ","));
        window.setTimeout(() => inputRef.current?.focus(), 30);
      }
    };
    const onSave = () => {
      // small delay so any pending setValue has applied
      window.setTimeout(() => handleSave(), 30);
    };
    window.addEventListener("mampflogger:weight-set", onSet);
    window.addEventListener("mampflogger:weight-save", onSave);
    return () => {
      window.removeEventListener("mampflogger:weight-set", onSet);
      window.removeEventListener("mampflogger:weight-save", onSave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedDate]);

  // Focus the input when section is activated via voice / navigation
  useEffect(() => {
    const handler = () => {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    };
    window.addEventListener("mampflogger:focus-weight-input", handler);
    return () => window.removeEventListener("mampflogger:focus-weight-input", handler);
  }, []);

  // Computed weight = effectiveWeight - sum(deficits since last weighing) / 7700
  // BMR uses the latest measured weight (or profile weight if none).
  const computed = useMemo(() => {
    const effectiveWeight = getEffectiveWeightKg(profile, weightLog, selectedDate);
    const bmr = calculateBMR(profile, effectiveWeight);
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
  }, [profile, entries, bookedActivities, selectedDate, weightLog]);

  // Latest manually entered weight up to selectedDate
  const latestActual = useMemo(() => {
    const sorted = weightLog
      .filter((w) => w.date <= selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] ?? null;
  }, [weightLog, selectedDate]);

  const sortedHistory = useMemo(
    () => [...weightLog].sort((a, b) => b.date.localeCompare(a.date)),
    [weightLog],
  );

  const actualKg = latestActual?.kg ?? null;
  const delta = actualKg !== null ? actualKg - computed : null;

  const startWeight = profile.weightKg;
  const goalWeight = profile.goalWeightKg;
  const referenceForBar = actualKg ?? computed;

  const goalProgress = useMemo(() => {
    if (!goalWeight || goalWeight === startWeight) return null;
    const totalDelta = startWeight - goalWeight;
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
    setValue(""); // clear input after booking
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
            pattern="[0-9.,]*"
            value={value}
            onChange={(e) => {
              // Plausibility (manual): allow only digits and one decimal separator
              const v = e.target.value.replace(/[^0-9.,]/g, "");
              setValue(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="kg"
            className="h-7 w-20 text-right text-sm"
            data-voice-target="weight-input"
            data-voice-numeric="true"
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
                <span>
                  Aktuelles Gewicht{" "}
                  <span className="text-muted-foreground/70">
                    (vom {formatDateShort(latestActual!.date)})
                  </span>
                </span>
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
          <div className="relative flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Start {fmt(startWeight)} kg → Ziel {fmt(goalWeight)} kg
            </span>
            <span className="font-bold text-foreground">{goalProgress}%</span>
          </div>
          <div className="relative text-xs text-muted-foreground pr-6">
            {goalProgress >= 100
              ? <span>Du hast dein Gewichtsziel erreicht!</span>
              : <span>Du hast schon <span className="font-bold">{goalProgress} %</span> deines Gewichtsziels geschafft.</span>
            }
            {sortedHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((s) => !s)}
                title={showHistory ? "Verlauf einklappen" : "Verlauf anzeigen"}
                className="absolute -bottom-0.5 right-0 p-1 rounded-full text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                {showHistory ? <ChevronDown className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </button>
            )}
          </div>
        </>
      )}

      {showHistory && sortedHistory.length > 0 && (
        <div className="rounded-lg bg-background px-3 py-2 space-y-1 max-h-56 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold pb-1 border-b border-border">
            Gewichtsverlauf · {sortedHistory.length} Einträge
          </div>
          {sortedHistory.map((w) => (
            <div key={w.date} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground tabular-nums">{formatDateShort(w.date)}</span>
              <span className="font-semibold text-foreground tabular-nums">{fmt(w.kg)} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeightTracker;

