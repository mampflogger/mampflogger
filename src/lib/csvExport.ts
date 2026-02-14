import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { FoodItem, foodDatabase } from "@/data/foodDatabase";
import {
  UserProfile,
  DailyActivity,
  calculateTDEE,
  getActivityForDate,
  loadProfile,
  loadActivities,
} from "@/types/profile";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Export raw nutrition entries */
export function exportEntriesToCsv(entries: NutritionEntry[]): void {
  const sorted = [...entries].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    return dateComp !== 0 ? dateComp : a.time.localeCompare(b.time);
  });

  const header = "Datum;Zeit;Lebensmittel;Menge;kcal;PRO;FAT;KH;FIB";
  const rows = sorted.map((e) =>
    [
      e.date,
      e.time,
      `"${e.food.replace(/"/g, '""')}"`,
      e.amount,
      Math.round(e.calories),
      Math.round(e.protein),
      Math.round(e.fat),
      Math.round(e.carbs),
      Math.round(e.fiber),
    ].join(";")
  );

  const csv = [header, ...rows].join("\n");
  downloadCsv(csv, `foodlog-protokoll-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Export food database */
export function exportFoodDatabaseCsv(): void {
  const header = "Lebensmittel;Einheit;Basis;kcal;PRO;FAT;KH;FIB";
  const rows = foodDatabase.map((f) =>
    [
      `"${f.name.replace(/"/g, '""')}"`,
      f.baseUnit,
      f.baseAmount,
      f.calories,
      f.protein,
      f.fat,
      f.carbs,
      f.fiber,
    ].join(";")
  );

  const csv = [header, ...rows].join("\n");
  downloadCsv(csv, `foodlog-lebensmittel-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Export daily calorie balance (Kalorienbilanz) */
export function exportCalorieBalanceCsv(entries: NutritionEntry[]): void {
  const profile = loadProfile();
  const activities = loadActivities();

  // Collect all unique dates
  const dates = [...new Set(entries.map((e) => e.date))].sort();

  const header = "Datum;kcal;PRO;FAT;KH;FIB" + (profile ? ";TDEE;Defizit" : "");
  const rows = dates.map((date) => {
    const dayEntries = entries.filter((e) => e.date === date);
    const summary = calculateDailySummary(dayEntries);
    const base = [
      date,
      summary.totalCalories,
      summary.totalProtein,
      summary.totalFat,
      summary.totalCarbs,
      summary.totalFiber,
    ];
    if (profile) {
      const activity = getActivityForDate(activities, date);
      const tdee = calculateTDEE(profile, activity);
      base.push(tdee, tdee - summary.totalCalories);
    }
    return base.join(";");
  });

  const csv = [header, ...rows].join("\n");
  downloadCsv(csv, `foodlog-kalorienbilanz-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Import food database from CSV */
export function parseFoodDatabaseCsv(text: string): FoodItem[] {
  const lines = text.trim().split("\n");
  const items: FoodItem[] = [];

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 8) continue;
    const name = cols[0];
    if (!name || name.toLowerCase().includes("lebensmittel")) continue;

    items.push({
      name,
      baseUnit: cols[1] || "100g",
      baseAmount: parseFloat(cols[2]) || 100,
      calories: parseFloat(cols[3]) || 0,
      protein: parseFloat(cols[4]) || 0,
      fat: parseFloat(cols[5]) || 0,
      carbs: parseFloat(cols[6]) || 0,
      fiber: parseFloat(cols[7]) || 0,
    });
  }

  return items;
}
