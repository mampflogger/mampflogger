import { NutritionEntry } from "@/types/nutrition";

const STORAGE_KEY = "nutrition-log-entries";

export function loadEntries(): NutritionEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const entries: NutritionEntry[] = data ? JSON.parse(data) : [];
    // Filter out any entries with invalid/undefined dates
    return entries.filter(
      (e) =>
        e.date &&
        e.date !== "undefined" &&
        e.date !== "null" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    );
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
