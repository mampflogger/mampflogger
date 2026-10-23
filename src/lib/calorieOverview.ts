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