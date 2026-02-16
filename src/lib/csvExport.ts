import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { FoodItem, foodDatabase } from "@/data/foodDatabase";
import {
  UserProfile,
  BookedActivity,
  calculateBMR,
  calculateBookedActivityBonus,
  loadProfile,
  loadBookedActivities,
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
  const header = "Lebensmittel;Einheit;kcal;PRO;FAT;KH;FIB";
  const rows = foodDatabase.map((f) =>
    [
      `"${f.name.replace(/"/g, '""')}"`,
      f.baseUnit,
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
export function exportCalorieBalanceCsv(entries: NutritionEntry[], bookedActivities?: BookedActivity[]): void {
  const profile = loadProfile();
  const activities = bookedActivities || loadBookedActivities();

  const dates = [...new Set(entries.map((e) => e.date))].sort();

  const header = "Datum;kcal;PRO;FAT;KH;FIB" + (profile ? ";Bonus;Defizit" : "");
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
      const bonus = calculateBookedActivityBonus(activities, date);
      const bmr = calculateBMR(profile);
      const budget = bmr + bonus;
      base.push(bonus, budget - summary.totalCalories);
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
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name || name.toLowerCase().includes("lebensmittel")) continue;

    const baseUnit = cols[1] || "100g";
    const baseAmount = baseUnit.includes("Stk") ? 1 : 100;

    items.push({
      name,
      baseUnit,
      baseAmount,
      calories: parseFloat(cols[2]) || 0,
      protein: parseFloat(cols[3]) || 0,
      fat: parseFloat(cols[4]) || 0,
      carbs: parseFloat(cols[5]) || 0,
      fiber: parseFloat(cols[6]) || 0,
    });
  }

  return items;
}

/** Parse nutrition entries from CSV (semicolon-separated) */
export function parseEntriesCsv(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 9) continue;
    const datum = cols[0];
    if (!datum || datum.toLowerCase().includes("datum")) continue;

    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: datum,
      time: cols[1] || "00:00",
      food: cols[2] || "",
      amount: parseFloat(cols[3]) || 0,
      calories: Math.round(parseFloat(cols[4]) || 0),
      protein: parseFloat(cols[5]) || 0,
      fat: parseFloat(cols[6]) || 0,
      carbs: parseFloat(cols[7]) || 0,
      fiber: parseFloat(cols[8]) || 0,
    });
  }

  return entries;
}
