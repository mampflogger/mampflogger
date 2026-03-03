import { NutritionEntry, calculateDailySummary, formatDate, generateId } from "@/types/nutrition";
import { FoodItem, FoodVitamins, FoodMinerals, FoodDietaryFlags, DIETARY_FLAG_KEYS, foodDatabase } from "@/data/foodDatabase";
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

const VITAMIN_KEYS = ["vitA","vitB1","vitB2","vitB3","vitB5","vitB6","vitB7","vitB9","vitB12","vitC","vitD","vitE","vitK"] as const;
const MINERAL_KEYS = ["calcium","chlorid","eisen","fluorid","kalium","kupfer","magnesium","mangan","natrium","phosphor","schwefel","zink"] as const;
const DIETARY_KEYS = DIETARY_FLAG_KEYS;

/** Export food database */
export function exportFoodDatabaseCsv(): void {
  const header = [
    "Lebensmittel","Einheit","kcal","PRO","FAT","KH","FIB","GI","Standard","LiquidMl","Kategorie","Zusatzinfo",
    ...VITAMIN_KEYS, ...MINERAL_KEYS, ...DIETARY_KEYS.map(k => k.toUpperCase()),
  ].join(";");

  const rows = foodDatabase.map((f) => {
    const vitVals = VITAMIN_KEYS.map(k => f.vitamins?.[k] ?? "");
    const minVals = MINERAL_KEYS.map(k => f.minerals?.[k] ?? "");
    const dietVals = DIETARY_KEYS.map(k => f.dietary?.[k] !== undefined ? (f.dietary[k] ? "J" : "N") : "");
    return [
      `"${f.name.replace(/"/g, '""')}"`,
      f.baseUnit,
      f.calories,
      f.protein,
      f.fat,
      f.carbs,
      f.fiber,
      f.gi ?? "",
      f.defaultAmount || "",
      f.liquidMl !== undefined ? f.liquidMl : "",
      f.category || "",
      f.notes ? `"${f.notes.replace(/"/g, '""').replace(/\n/g, '\\n')}"` : "",
      ...vitVals,
      ...minVals,
      ...dietVals,
    ].join(";");
  });

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

  // Detect header to find column indices
  const headerLine = lines[0]?.toLowerCase() ?? "";
  const isExtended = headerLine.includes("gi") || headerLine.includes("zusatzinfo") || headerLine.includes("vita");

  for (const line of lines) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name || name.toLowerCase().includes("lebensmittel")) continue;

    const baseUnit = cols[1] || "100g";
    const baseAmount = baseUnit.includes("Stk") ? 1 : 100;

    if (isExtended) {
      // Extended format: Name;Einheit;kcal;PRO;FAT;KH;FIB;GI;Standard;LiquidMl;Kategorie;Zusatzinfo;13 vitamins;12 minerals
      const gi = cols[7] ? parseFloat(cols[7]) : undefined;
      const defaultAmountRaw = cols[8] ? parseFloat(cols[8]) : undefined;
      const liquidMlRaw = cols[9] ? parseFloat(cols[9]) : undefined;
      const category = cols[10] || undefined;
      const notes = cols[11] ? cols[11].replace(/\\n/g, "\n") : undefined;

      // Parse vitamins (cols 12-24)
      const vitamins: FoodVitamins = {};
      let hasVitamins = false;
      VITAMIN_KEYS.forEach((k, i) => {
        const v = cols[12 + i] ? parseFloat(cols[12 + i]) : undefined;
        if (v !== undefined && !isNaN(v) && v > 0) { (vitamins as any)[k] = v; hasVitamins = true; }
      });

      // Parse minerals (cols 25-36)
      const minerals: FoodMinerals = {};
      let hasMinerals = false;
      MINERAL_KEYS.forEach((k, i) => {
        const v = cols[25 + i] ? parseFloat(cols[25 + i]) : undefined;
        if (v !== undefined && !isNaN(v) && v > 0) { (minerals as any)[k] = v; hasMinerals = true; }
      });

      // Parse dietary flags (cols 37-44)
      const dietary: FoodDietaryFlags = {};
      let hasDietary = false;
      DIETARY_KEYS.forEach((k, i) => {
        const val = cols[37 + i]?.toUpperCase();
        if (val === "J" || val === "N") { (dietary as any)[k] = val === "J"; hasDietary = true; }
      });

      items.push({
        name,
        baseUnit,
        baseAmount,
        calories: parseFloat(cols[2]) || 0,
        protein: parseFloat(cols[3]) || 0,
        fat: parseFloat(cols[4]) || 0,
        carbs: parseFloat(cols[5]) || 0,
        fiber: parseFloat(cols[6]) || 0,
        ...(gi !== undefined && !isNaN(gi) && gi > 0 ? { gi } : {}),
        defaultAmount: defaultAmountRaw && !isNaN(defaultAmountRaw) ? defaultAmountRaw : undefined,
        liquidMl: liquidMlRaw && !isNaN(liquidMlRaw) ? liquidMlRaw : undefined,
        ...(category ? { category: category as FoodItem["category"] } : {}),
        ...(notes ? { notes } : {}),
        ...(hasVitamins ? { vitamins } : {}),
        ...(hasMinerals ? { minerals } : {}),
        ...(hasDietary ? { dietary } : {}),
      });
    } else {
      // Legacy format: Name;Einheit;kcal;PRO;FAT;KH;FIB;Standard;LiquidMl;Kategorie
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
