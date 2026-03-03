import { useMemo, useState, useEffect } from "react";
import { NutritionEntry, formatDate } from "@/types/nutrition";

interface Props {
  entries: NutritionEntry[]; // selected day's entries
  allEntries: NutritionEntry[]; // all entries (needed for adjacent days)
  selectedDate: string;
}

const FastingAnalysis = ({ entries, allEntries, selectedDate }: Props) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = formatDate(now);
  const currentHour = now.getHours();
  const nowMinutes = currentHour * 60 + now.getMinutes();

  const isToday = selectedDate === todayStr;

  // Get the day before selected date (for cross-midnight gap calculation)
  const dayBeforeSelected = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }, [selectedDate]);

  const dayBeforeEntries = useMemo(
    () => (allEntries ?? []).filter((e) => e.date === dayBeforeSelected),
    [allEntries, dayBeforeSelected]
  );

  const { displayHours, fastingFlags, currentFast } = useMemo(() => {
    if (isToday) {
      // === TODAY: rolling 24h window, live fasting time ===
      const hours: { hour: number; isYesterday: boolean }[] = [];
      for (let i = 0; i < 24; i++) {
        const h = (currentHour + 1 + i) % 24;
        hours.push({ hour: h, isYesterday: i < (23 - currentHour) });
      }

      const todayFoodHours = new Set<number>();
      for (const e of entries) {
        if (e.time && e.calories > 0) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) todayFoodHours.add(h);
        }
      }
      const yesterdayFoodHours = new Set<number>();
      for (const e of dayBeforeEntries) {
        if (e.time && e.calories > 0) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) yesterdayFoodHours.add(h);
        }
      }

      const flags = hours.map(({ hour, isYesterday }) => {
        const foodSet = isYesterday ? yesterdayFoodHours : todayFoodHours;
        return !foodSet.has(hour);
      });

      // Live fasting: minutes since last meal (today + yesterday)
      const mealMinutesFromNow: number[] = [];
      for (const e of entries) {
        if (e.time && e.calories > 0) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            const mealMin = hh * 60 + mm;
            if (mealMin <= nowMinutes) {
              mealMinutesFromNow.push(nowMinutes - mealMin);
            }
          }
        }
      }
      for (const e of dayBeforeEntries) {
        if (e.time && e.calories > 0) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            const mealMin = hh * 60 + mm;
            mealMinutesFromNow.push(nowMinutes + (1440 - mealMin));
          }
        }
      }

      let fast = null;
      if (mealMinutesFromNow.length > 0) {
        const minAgo = Math.min(...mealMinutesFromNow);
        if (minAgo > 0) {
          fast = { hours: Math.floor(minAgo / 60), minutes: minAgo % 60, totalMin: minAgo };
        }
      }

      return { displayHours: hours, fastingFlags: flags, currentFast: fast };
    } else {
      // === PAST DAY: static 0-23, longest gap spanning into previous day ===
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, isYesterday: false }));

      const hoursWithFood = new Set<number>();
      for (const e of entries) {
        if (e.time && e.calories > 0) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) hoursWithFood.add(h);
        }
      }
      const flags = hours.map(({ hour }) => !hoursWithFood.has(hour));

      // Collect meal timestamps: selected day meals as minutes (0-1439)
      // and previous day meals as negative minutes (-1440 to -1)
      const allMealMinutes: number[] = [];
      for (const e of entries) {
        if (e.time && e.calories > 0) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) allMealMinutes.push(hh * 60 + mm);
        }
      }
      for (const e of dayBeforeEntries) {
        if (e.time && e.calories > 0) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) allMealMinutes.push(hh * 60 + mm - 1440);
        }
      }

      let fast = null;
      if (allMealMinutes.length > 0) {
        allMealMinutes.sort((a, b) => a - b);
        let maxGap = 0;
        for (let i = 1; i < allMealMinutes.length; i++) {
          const gap = allMealMinutes[i] - allMealMinutes[i - 1];
          if (gap > maxGap) maxGap = gap;
        }
        // Also check gap from last meal of selected day wrapping to end of day (23:59)
        // For past days we cap at end-of-day
        const selectedDayMeals = allMealMinutes.filter(m => m >= 0);
        if (selectedDayMeals.length > 0) {
          const lastMeal = selectedDayMeals[selectedDayMeals.length - 1];
          const gapToEndOfDay = 1440 - lastMeal;
          if (gapToEndOfDay > maxGap) maxGap = gapToEndOfDay;
        }
        if (maxGap > 0) {
          fast = { hours: Math.floor(maxGap / 60), minutes: maxGap % 60, totalMin: maxGap };
        }
      }

      return { displayHours: hours, fastingFlags: flags, currentFast: fast };
    }
  }, [entries, dayBeforeEntries, isToday, currentHour, nowMinutes]);

  // Tick labels every 3 hours
  const tickSet = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

  const clockStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="relative">
      {/* Timeline bar + labels */}
      <div className="flex gap-[1px]">
        {displayHours.map(({ hour, isYesterday }, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full h-5 rounded-[2px] transition-colors ${
                fastingFlags[idx] ? "bg-primary/80" : "bg-muted"
              } ${isYesterday ? "opacity-60" : ""}`}
              title={`${isYesterday ? "Gestern " : ""}${String(hour).padStart(2, "0")}:00 – ${fastingFlags[idx] ? "Fasten" : "Nahrung"}`}
            />
            {tickSet.has(hour) && (
              <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{hour}</span>
            )}
          </div>
        ))}
      </div>

      {/* Info row */}
      <div className="flex items-baseline justify-between mt-1.5">
        <span className="text-[9px] text-muted-foreground opacity-70 w-12">
          {isToday ? "Gestern" : ""}
        </span>
        <div className="text-center">
          {currentFast && (
            <p className="text-[11px] text-muted-foreground">
              {isToday ? "Aktuelle Fastenzeit" : "Längste Fastenperiode"}{" "}
              <span className="font-semibold text-foreground">
                {currentFast.hours > 0 && `${currentFast.hours} Std `}
                {currentFast.minutes > 0 && `${currentFast.minutes} Min`}
                {currentFast.hours === 0 && currentFast.minutes === 0 && "0 Min"}
              </span>
            </p>
          )}
          {!currentFast && entries.length > 0 && (
            <p className="text-[11px] text-muted-foreground">Gerade gegessen</p>
          )}
          {entries.length === 0 && !isToday && (
            <p className="text-[11px] text-muted-foreground">Keine Einträge</p>
          )}
        </div>
        <span className="text-[11px] font-semibold text-primary tabular-nums w-12 text-right">
          {isToday ? clockStr : ""}
        </span>
      </div>
    </div>
  );
};

export default FastingAnalysis;
