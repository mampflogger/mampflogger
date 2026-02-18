import { NutritionEntry, calculateDailySummary, formatDate, generateId } from "@/types/nutrition";
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

/** Convert ISO date "2026-01-15" to "15.01.26" */
export function formatDateDE(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

/** Convert "15.01.26" to "2026-01-15" */
export function parseDateDE(deDate: string): string {
  const parts = deDate.split(".");
  if (parts.length < 3) return deDate;
  const d = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  let y = parseInt(parts[2]);
  if (isNaN(y)) return deDate;
  if (y < 100) y += 2000;
  return `${y}-${m}-${d}`;
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
      formatDateDE(e.date),
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
  downloadCsv(csv, `mampflogger-protokoll-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Export food database */
export function exportFoodDatabaseCsv(): void {
  const header = "Lebensmittel;Einheit;kcal;PRO;FAT;KH;FIB;Standard;LiquidMl";
  const rows = foodDatabase.map((f) =>
    [
      `"${f.name.replace(/"/g, '""')}"`,
      f.baseUnit,
      f.calories,
      f.protein,
      f.fat,
      f.carbs,
      f.fiber,
      f.defaultAmount || "",
      f.liquidMl !== undefined ? f.liquidMl : "",
    ].join(";")
  );

  const csv = [header, ...rows].join("\n");
  downloadCsv(csv, `mampflogger-lebensmittel-${new Date().toISOString().slice(0, 10)}.csv`);
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
    const base: (string | number)[] = [
      formatDateDE(date),
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
  downloadCsv(csv, `mampflogger-kalorienbilanz-${new Date().toISOString().slice(0, 10)}.csv`);
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
    const defaultAmountRaw = cols[7] ? parseFloat(cols[7]) : undefined;
    const liquidMlRaw = cols[8] ? parseFloat(cols[8]) : undefined;

    items.push({
      name,
      baseUnit,
      baseAmount,
      calories: parseFloat(cols[2]) || 0,
      protein: parseFloat(cols[3]) || 0,
      fat: parseFloat(cols[4]) || 0,
      carbs: parseFloat(cols[5]) || 0,
      fiber: parseFloat(cols[6]) || 0,
      defaultAmount: defaultAmountRaw && !isNaN(defaultAmountRaw) ? defaultAmountRaw : undefined,
      liquidMl: liquidMlRaw && !isNaN(liquidMlRaw) ? liquidMlRaw : undefined,
    });
  }

  return items;
}

/** Parse nutrition entries from CSV (semicolon-separated, dates DD.MM.YY or YYYY-MM-DD) */
export function parseEntriesCsv(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 9) continue;
    const datum = cols[0];
    if (!datum || datum.toLowerCase().includes("datum")) continue;

    const date = datum.includes("-") ? datum : parseDateDE(datum);

    entries.push({
      id: generateId(),
      date,
      time: cols[1] || "00:00",
      food: cols[2] || "",
      amount: parseFloat(cols[3]) || 0,
      calories: Math.round(parseFloat(cols[4]) || 0),
      protein: Math.round(parseFloat(cols[5]) || 0),
      fat: Math.round(parseFloat(cols[6]) || 0),
      carbs: Math.round(parseFloat(cols[7]) || 0),
      fiber: Math.round(parseFloat(cols[8]) || 0),
    });
  }

  return entries;
}

/** Parse calorie balance CSV (Bilanz import) */
export function parseCalorieBalanceCsv(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 6) continue;
    const datum = cols[0];
    if (!datum || datum.toLowerCase().includes("datum")) continue;

    const date = datum.includes("-") ? datum : parseDateDE(datum);

    entries.push({
      id: generateId(),
      date,
      time: "00:00",
      food: "Tagesbilanz (Import)",
      amount: 0,
      calories: Math.round(parseFloat(cols[1]) || 0),
      protein: Math.round(parseFloat(cols[2]) || 0),
      fat: Math.round(parseFloat(cols[3]) || 0),
      carbs: Math.round(parseFloat(cols[4]) || 0),
      fiber: Math.round(parseFloat(cols[5]) || 0),
    });
  }

  return entries;
}

/** Export booked activities to CSV */
export function exportActivitiesCsv(activities: BookedActivity[]): void {
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const header = "Datum;Aktivität;Wert;Einheit;kcal";
  const rows = sorted.map((a) =>
    [
      formatDateDE(a.date),
      `"${a.activityName.replace(/"/g, '""')}"`,
      a.value,
      a.unit,
      Math.round(a.calories),
    ].join(";")
  );
  const csv = [header, ...rows].join("\n");
  downloadCsv(csv, `mampflogger-aktivitaeten-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Parse booked activities from CSV */
export function parseActivitiesCsv(text: string): BookedActivity[] {
  const lines = text.trim().split("\n");
  const activities: BookedActivity[] = [];

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 5) continue;
    const datum = cols[0];
    if (!datum || datum.toLowerCase().includes("datum")) continue;
    const date = datum.includes("-") ? datum : parseDateDE(datum);
    const activityName = cols[1];
    if (!activityName) continue;

    activities.push({
      id: generateId(),
      date,
      activityTypeId: activityName.toLowerCase().replace(/\s+/g, "_"),
      activityName,
      value: parseFloat(cols[2]) || 0,
      unit: cols[3] || "",
      calories: Math.round(parseFloat(cols[4]) || 0),
    });
  }

  return activities;
}
