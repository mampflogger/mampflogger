import { useMemo } from "react";
import { NutritionEntry } from "@/types/nutrition";

interface Props {
  entries: NutritionEntry[];
}

const FastingAnalysis = ({ entries }: Props) => {
  const { fastingHours, longestFast } = useMemo(() => {
    // Mark which hours had food
    const hoursWithFood = new Set<number>();
    for (const e of entries) {
      if (e.time) {
        const h = parseInt(e.time.split(":")[0], 10);
        if (!isNaN(h)) hoursWithFood.add(h);
      }
    }

    const fasting = Array.from({ length: 24 }, (_, i) => !hoursWithFood.has(i));

    // Find longest consecutive fasting window (circular – wraps around midnight)
    if (entries.length === 0) {
      return { fastingHours: fasting, longestFast: null };
    }

    // Collect meal timestamps in minutes for precise calculation
    const mealMinutes: number[] = [];
    for (const e of entries) {
      if (e.time) {
        const [hh, mm] = e.time.split(":").map(Number);
        if (!isNaN(hh) && !isNaN(mm)) mealMinutes.push(hh * 60 + mm);
      }
    }

    if (mealMinutes.length === 0) {
      return { fastingHours: fasting, longestFast: null };
    }

    mealMinutes.sort((a, b) => a - b);

    // Gaps between consecutive meals (and wrap-around gap)
    let maxGap = 0;
    let gapStart = 0;
    let gapEnd = 0;

    for (let i = 1; i < mealMinutes.length; i++) {
      const gap = mealMinutes[i] - mealMinutes[i - 1];
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = mealMinutes[i - 1];
        gapEnd = mealMinutes[i];
      }
    }

    // Wrap-around gap: last meal → next day first meal
    const wrapGap = 1440 - mealMinutes[mealMinutes.length - 1] + mealMinutes[0];
    if (wrapGap > maxGap) {
      maxGap = wrapGap;
      gapStart = mealMinutes[mealMinutes.length - 1];
      gapEnd = mealMinutes[0];
    }

    const hours = Math.floor(maxGap / 60);
    const minutes = maxGap % 60;

    return {
      fastingHours: fasting,
      longestFast: { hours, minutes, startMin: gapStart, endMin: gapEnd, totalMin: maxGap },
    };
  }, [entries]);

  const formatTime = (totalMin: number) => {
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const ticks = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="relative">
      {/* Timeline bar + labels */}
      <div className="flex gap-[1px]">
        {fastingHours.map((isFasting, hour) => (
          <div key={hour} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full h-5 rounded-[2px] transition-colors ${
                isFasting ? "bg-primary/80" : "bg-muted"
              }`}
              title={`${String(hour).padStart(2, "0")}:00 – ${isFasting ? "Fasten" : "Nahrung"}`}
            />
            {ticks.includes(hour) && (
              <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{hour}</span>
            )}
          </div>
        ))}
      </div>

      {/* Longest fast info */}
      {longestFast && (
        <p className="text-[11px] text-muted-foreground text-left mt-1.5">
          Fastenzeit{" "}
          <span className="font-semibold text-foreground">
            {longestFast.hours > 0 && `${longestFast.hours} Std `}
            {longestFast.minutes > 0 && `${longestFast.minutes} Min`}
          </span>
          <span className="ml-1 opacity-70">
            ({formatTime(longestFast.startMin)}–{formatTime(longestFast.endMin)})
          </span>
        </p>
      )}

      {entries.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center mt-1">
          Keine Einträge vorhanden
        </p>
      )}
    </div>
  );
};

export default FastingAnalysis;
