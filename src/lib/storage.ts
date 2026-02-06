import { NutritionEntry } from "@/types/nutrition";

const STORAGE_KEY = "nutrition-log-entries";

export function loadEntries(): NutritionEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: NutritionEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
