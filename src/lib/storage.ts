import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase } from "@/data/foodDatabase";

const STORAGE_KEY = "nutrition-log-entries";

export function loadEntries(): NutritionEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const entries: NutritionEntry[] = data ? JSON.parse(data) : [];
    const db = foodDatabase;
    // Filter invalid dates + migrate missing liquidMl from DB
    const result = entries
      .filter(
        (e) =>
          e.date &&
          e.date !== "undefined" &&
          e.date !== "null" &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      )
      .map((e) => {
        if (e.liquidMl !== undefined) return e;
        const food = db.find((f) => f.name.toLowerCase() === e.food.toLowerCase());
        if (!food?.liquidMl) return e;
        const factor = e.amount / food.baseAmount;
        return { ...e, liquidMl: Math.round(food.liquidMl * factor) };
      });
    // Persist migration so backups include liquidMl
    if (result.some((e, i) => e !== entries[i])) {
      saveEntries(result);
    }
    return result;
  } catch {
    return [];
  }
}

export function saveEntries(entries: NutritionEntry[]): void {
  // Always strip invalid entries before saving
  const valid = entries.filter(
    (e) =>
      e.date &&
      e.date !== "undefined" &&
      e.date !== "null" &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
}
