import { useMemo, useState, useEffect } from "react";
import { NutritionEntry, formatDate } from "@/types/nutrition";

interface Props {
  entries: NutritionEntry[]; // today's entries
  allEntries: NutritionEntry[]; // all entries (needed for yesterday)
  selectedDate: string;
}

const FastingAnalysis = ({ entries, allEntries, selectedDate }: Props) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isToday = selectedDate === formatDate(new Date());
  const currentHour = now.getHours();
  const nowMinutes = currentHour * 60 + now.getMinutes();

  // Get yesterday's date string
  const yesterdayDate = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }, [selectedDate]);

  const yesterdayEntries = useMemo(
    () => allEntries.filter((e) => e.date === yesterdayDate),
    [allEntries, yesterdayDate]
  );

  const { displayHours, fastingFlags, currentFast } = useMemo(() => {
    if (isToday) {
      // ROLLING 24h: rightmost box = current hour, leftmost = same hour yesterday
      // We show 24 boxes representing the last 24 hours ending at currentHour
      const hours: { hour: number; isYesterday: boolean }[] = [];
      for (let i = 0; i < 24; i++) {
        const h = (currentHour + 1 + i) % 24;
        // If h > currentHour, it's yesterday's hour; if h <= currentHour, it's today
        const isYest = h > currentHour || (i < 23 && h === currentHour + 1);
        // Simpler: first (23 - currentHour) boxes are yesterday, rest are today
        hours.push({ hour: h, isYesterday: i < (23 - currentHour) });
      }

      // Mark food hours
      const todayFoodHours = new Set<number>();
      for (const e of entries) {
        if (e.time) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) todayFoodHours.add(h);
        }
      }
      const yesterdayFoodHours = new Set<number>();
      for (const e of yesterdayEntries) {
        if (e.time) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) yesterdayFoodHours.add(h);
        }
      }

      const flags = hours.map(({ hour, isYesterday }) => {
        const foodSet = isYesterday ? yesterdayFoodHours : todayFoodHours;
        return !foodSet.has(hour); // true = fasting
      });

      // Calculate current fasting: time since last meal (across both days)
      // Collect all meal times as minutes-ago-from-now
      const mealMinutesFromNow: number[] = [];
      for (const e of entries) {
        if (e.time) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            const mealMin = hh * 60 + mm;
            if (mealMin <= nowMinutes) {
              mealMinutesFromNow.push(nowMinutes - mealMin);
            }
          }
        }
      }
      for (const e of yesterdayEntries) {
        if (e.time) {
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
      // Past day: standard 0-23 view
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, isYesterday: false }));

      const hoursWithFood = new Set<number>();
      for (const e of entries) {
        if (e.time) {
          const h = parseInt(e.time.split(":")[0], 10);
          if (!isNaN(h)) hoursWithFood.add(h);
        }
      }
      const flags = hours.map(({ hour }) => !hoursWithFood.has(hour));

      // Largest gap including wrap-around
      const mealMinutes: number[] = [];
      for (const e of entries) {
        if (e.time) {
          const [hh, mm] = e.time.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) mealMinutes.push(hh * 60 + mm);
        }
      }

      let fast = null;
      if (mealMinutes.length > 0) {
        mealMinutes.sort((a, b) => a - b);
        let maxGap = 0;
        for (let i = 1; i < mealMinutes.length; i++) {
          const gap = mealMinutes[i] - mealMinutes[i - 1];
          if (gap > maxGap) maxGap = gap;
        }
        const wrapGap = 1440 - mealMinutes[mealMinutes.length - 1] + mealMinutes[0];
        if (wrapGap > maxGap) maxGap = wrapGap;
        if (maxGap > 0) {
          fast = { hours: Math.floor(maxGap / 60), minutes: maxGap % 60, totalMin: maxGap };
        }
      }

      return { displayHours: hours, fastingFlags: flags, currentFast: fast };
    }
  }, [entries, yesterdayEntries, isToday, currentHour, nowMinutes]);

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

      {/* Info row: "Gestern" left, fasting center, clock right */}
      <div className="flex items-baseline justify-between mt-1.5">
        <span className="text-[9px] text-muted-foreground opacity-70 w-12">
          {isToday ? "Gestern" : ""}
        </span>
        <div className="text-center">
          {currentFast && (
            <p className="text-[11px] text-muted-foreground">
              Aktuelle Fastenzeit{" "}
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
