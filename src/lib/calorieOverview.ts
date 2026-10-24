import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";

/** Daily calorie intake averaged over logged days in an inclusive calendar window. */
export function calculateAverageCalorieIntake(entries: NutritionEntry[], selectedDate: string, days: 7 | 30): number {
  const start = new Date(`${selectedDate}T00:00:00`);
  start.setDate(start.getDate() - (days - 1));
  const startDate = formatDate(start);
  const dailyEntries = new Map<string, NutritionEntry[]>();
  for (const entry of entries) {
    if (entry.date < startDate || entry.date > selectedDate) continue;
    const day = dailyEntries.get(entry.date) ?? [];
    day.push(entry);
    dailyEntries.set(entry.date, day);
  }
  if (dailyEntries.size === 0) return 0;
  const total = [...dailyEntries.values()].reduce((sum, day) => sum + calculateDailySummary(day).totalCalories, 0);
  return Math.round(total / dailyEntries.size);
}

/**
 * Total calorie intake on the calendar day before the selected date.
 * Returns null when that day has no entries, so the UI can show a placeholder
 * instead of an average that would look like a real day.
 */
export function calculatePreviousDayCalorieIntake(entries: NutritionEntry[], selectedDate: string): number | null {
  const previousDay = new Date(`${selectedDate}T00:00:00`);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDate = formatDate(previousDay);
  const dayEntries = entries.filter((entry) => entry.date === previousDate);
  if (dayEntries.length === 0) return null;
  return Math.round(calculateDailySummary(dayEntries).totalCalories);
}
