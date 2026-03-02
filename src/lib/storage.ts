import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase } from "@/data/foodDatabase";

const STORAGE_KEY = "nutrition-log-entries";

export function loadEntries(): NutritionEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const entries: NutritionEntry[] = data ? JSON.parse(data) : [];
    const db = foodDatabase;
    // Filter invalid dates + recalculate liquidMl from DB on every load
    const result = entries
      .filter(
        (e) =>
          e.date &&
          e.date !== "undefined" &&
          e.date !== "null" &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      )
      .map((e) => {
        // Immer liquidMl anhand der aktuellen Lebensmittel-DB neu berechnen
        const food = db.find((f) => f.name.toLowerCase() === e.food.toLowerCase());
        if (food?.liquidMl && e.amount > 0) {
          const base = food.baseAmount;
          const factor = e.amount / base;
          const correctMl = Math.round(food.liquidMl * factor);
          if (e.liquidMl !== correctMl) {
            return { ...e, liquidMl: correctMl };
          }
          return e;
        }
        // Lebensmittel gefunden, aber OHNE liquidMl → Eintrag-liquidMl entfernen
        // Wenn kein passendes Lebensmittel gefunden → bestehenden liquidMl-Wert beibehalten
        if (food && e.liquidMl !== undefined && !food.liquidMl) {
          const { liquidMl: _, ...rest } = e;
          return rest as NutritionEntry;
        }
        return e;
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
