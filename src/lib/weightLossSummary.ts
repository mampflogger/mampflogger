import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { BookedActivity, UserProfile, WeightEntry, calculateBMR, calculateBookedActivityBonus, getEffectiveWeightKg } from "@/types/profile";

/** Completed calendar windows; missing food-log days contribute no assumed deficit. */
export function calculateWeightLossSummary(
  profile: UserProfile | null | undefined,
  entries: NutritionEntry[],
  activities: BookedActivity[],
  weightLog: WeightEntry[],
  selectedDate: string,
): { sevenDays: number | null; thirtyDays: number | null; sinceStart: number | null } {
  if (!profile) return { sevenDays: null, thirtyDays: null, sinceStart: null };
  const bmr = calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate));
  const totals = new Map<string, NutritionEntry[]>();
  for (const entry of entries) {
    const day = totals.get(entry.date) ?? [];
    day.push(entry);
    totals.set(entry.date, day);
  }
  const periodLoss = (days: number): number | null => {
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setDate(start.getDate() - days);
    const startDate = formatDate(start);
    let deficit = 0;
    let hasData = false;
    for (const [date, dayEntries] of totals) {
      if (date < startDate || date >= selectedDate) continue;
      hasData = true;
      deficit += bmr + calculateBookedActivityBonus(activities, date) - calculateDailySummary(dayEntries).totalCalories;
    }
    return hasData ? Math.round(deficit / 7.7) : null;
  };
  const hasMeasurement = weightLog.some((entry) => entry.date <= selectedDate);
  return {
    sevenDays: periodLoss(7),
    thirtyDays: periodLoss(30),
    sinceStart: hasMeasurement ? Math.round((profile.weightKg - getEffectiveWeightKg(profile, weightLog, selectedDate)) * 1000) : null,
  };
}