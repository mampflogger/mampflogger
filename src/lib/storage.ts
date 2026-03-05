import { NutritionEntry } from "@/types/nutrition";
import { hydrateEntriesDerivedData } from "@/lib/entryDerivedData";

const STORAGE_KEY = "nutrition-log-entries";

export function loadEntries(): NutritionEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const entries: NutritionEntry[] = data ? JSON.parse(data) : [];

    const validEntries = entries.filter(
      (e) =>
        e.date &&
        e.date !== "undefined" &&
        e.date !== "null" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    );

    const hydratedEntries = hydrateEntriesDerivedData(validEntries);

    if (
      hydratedEntries.length !== entries.length ||
      hydratedEntries.some((entry, index) => entry !== validEntries[index])
    ) {
      saveEntries(hydratedEntries);
    }

    return hydratedEntries;
  } catch {
    return [];
  }
}

export function saveEntries(entries: NutritionEntry[]): void {
  const valid = entries.filter(
    (e) =>
      e.date &&
      e.date !== "undefined" &&
      e.date !== "null" &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
}
