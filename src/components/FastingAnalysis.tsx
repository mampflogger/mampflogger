import { useMemo, useState, useEffect } from "react";
import { NutritionEntry, formatDate } from "@/types/nutrition";

interface Props {
  entries: NutritionEntry[];
  selectedDate: string;
}

const FastingAnalysis = ({ entries, selectedDate }: Props) => {
  const [now, setNow] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isToday = selectedDate === formatDate(new Date());
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const nowMinutes = currentHour * 60 + currentMin;

  const { visibleHours, fastingHours, currentFast } = useMemo(() => {
    // For today: only show hours 0..currentHour. For past days: all 24.
    const maxHour = isToday ? currentHour : 23;
    const visible = Array.from({ length: maxHour + 1 }, (_, i) => i);

    // Mark which hours had food
    const hoursWithFood = new Set<number>();
    for (const e of entries) {
      if (e.time) {
        const h = parseInt(e.time.split(":")[0], 10);
        if (!isNaN(h) && h <= maxHour) hoursWithFood.add(h);
      }
    }

    const fasting = visible.map((h) => !hoursWithFood.has(h));

    // Calculate current fasting duration:
    // Time since last meal until now (today) or end of day (past)
    const mealMinutes: number[] = [];
    for (const e of entries) {
      if (e.time) {
        const [hh, mm] = e.time.split(":").map(Number);
        if (!isNaN(hh) && !isNaN(mm)) mealMinutes.push(hh * 60 + mm);
      }
    }

    if (mealMinutes.length === 0) {
      return { visibleHours: visible, fastingHours: fasting, currentFast: null };
    }

    mealMinutes.sort((a, b) => a - b);

    const endPoint = isToday ? nowMinutes : 1440; // now vs end of day
    const lastMeal = mealMinutes[mealMinutes.length - 1];

    // For today: fasting = now - lastMeal
    // For past days: find largest gap (original circular logic)
    if (isToday) {
      const gap = endPoint - lastMeal;
      if (gap <= 0) {
        return { visibleHours: visible, fastingHours: fasting, currentFast: null };
      }
      const hours = Math.floor(gap / 60);
      const minutes = gap % 60;
      return {
        visibleHours: visible,
        fastingHours: fasting,
        currentFast: { hours, minutes, startMin: lastMeal, endMin: endPoint, totalMin: gap },
      };
    } else {
      // Past day: largest gap including wrap-around
      let maxGap = 0, gapStart = 0, gapEnd = 0;
      for (let i = 1; i < mealMinutes.length; i++) {
        const gap = mealMinutes[i] - mealMinutes[i - 1];
        if (gap > maxGap) { maxGap = gap; gapStart = mealMinutes[i - 1]; gapEnd = mealMinutes[i]; }
      }
      const wrapGap = 1440 - mealMinutes[mealMinutes.length - 1] + mealMinutes[0];
      if (wrapGap > maxGap) { maxGap = wrapGap; gapStart = mealMinutes[mealMinutes.length - 1]; gapEnd = mealMinutes[0]; }

      const hours = Math.floor(maxGap / 60);
      const minutes = maxGap % 60;
      return {
        visibleHours: visible,
        fastingHours: fasting,
        currentFast: { hours, minutes, startMin: gapStart, endMin: gapEnd, totalMin: maxGap },
      };
    }
  }, [entries, isToday, currentHour, nowMinutes]);

  const formatTime = (totalMin: number) => {
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Show tick labels every 3 hours within visible range
  const tickSet = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

  const clockStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="relative">
      {/* Timeline bar + labels */}
      <div className="flex gap-[1px]">
        {visibleHours.map((hour, idx) => (
          <div key={hour} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full h-5 rounded-[2px] transition-colors ${
                fastingHours[idx] ? "bg-primary/80" : "bg-muted"
              }`}
              title={`${String(hour).padStart(2, "0")}:00 – ${fastingHours[idx] ? "Fasten" : "Nahrung"}`}
            />
            {tickSet.has(hour) && (
              <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{hour}</span>
            )}
          </div>
        ))}
      </div>

      {/* Fasting info + clock */}
      <div className="flex items-baseline justify-between mt-1.5">
        <div>
          {currentFast && (
            <p className="text-[11px] text-muted-foreground text-left">
              {isToday ? "Aktuelle Fastenzeit" : "Fastenzeit"}{" "}
              <span className="font-semibold text-foreground">
                {currentFast.hours > 0 && `${currentFast.hours} Std `}
                {currentFast.minutes > 0 && `${currentFast.minutes} Min`}
                {currentFast.hours === 0 && currentFast.minutes === 0 && "0 Min"}
              </span>
              <span className="ml-1 opacity-70">
                ({formatTime(currentFast.startMin)}–{isToday ? clockStr : formatTime(currentFast.endMin)})
              </span>
            </p>
          )}
          {entries.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Keine Einträge vorhanden</p>
          )}
        </div>
        {isToday && (
          <span className="text-[11px] font-semibold text-primary tabular-nums">{clockStr}</span>
        )}
      </div>
    </div>
  );
};

export default FastingAnalysis;
