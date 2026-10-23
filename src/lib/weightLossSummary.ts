import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { BookedActivity, UserProfile, WeightEntry, calculateBMR, calculateBookedActivityBonus, getEffectiveWeightKg } from "@/types/profile";

/**
 * Average daily loss in grams over a completed calendar window that includes the selected day.
 * Days without food entries are skipped instead of diluting the average; loss since start is the
 * measured difference between the starting weight and the latest weight on or before the selected day.
 */
export function calculateWeightLossSummary(
  profile: UserProfile | null | undefined,
  entries: NutritionEntry[],
  activities: BookedActivity[],
  weightLog: WeightEntry[],
  selectedDate: string,
): { avgSevenDays: number | null; avgThirtyDays: number | null; sinceStart: number | null } {
  if (!profile) return { avgSevenDays: null, avgThirtyDays: null, sinceStart: null };
  const bmr = calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate));
  const totals = new Map<string, NutritionEntry[]>();
  for (const entry of entries) {
    const day = totals.get(entry.date) ?? [];
    day.push(entry);
    totals.set(entry.date, day);
  }
  const averageLoss = (days: number): number | null => {
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setDate(start.getDate() - (days - 1));
    const startDate = formatDate(start);
    let deficit = 0;
    let daysWithData = 0;
    for (const [date, dayEntries] of totals) {
      if (date < startDate || date > selectedDate) continue;
      daysWithData++;
      deficit += bmr + calculateBookedActivityBonus(activities, date) - calculateDailySummary(dayEntries).totalCalories;
    }
    return daysWithData > 0 ? Math.round(deficit / daysWithData / 7.7) : null;
  };
  const hasMeasurement = weightLog.some((entry) => entry.date <= selectedDate);
  return {
    avgSevenDays: averageLoss(7),
    avgThirtyDays: averageLoss(30),
    sinceStart: hasMeasurement ? Math.round((profile.weightKg - getEffectiveWeightKg(profile, weightLog, selectedDate)) * 1000) : null,
  };
}
