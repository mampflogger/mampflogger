import { foodDatabase, type FoodItem } from "@/data/foodDatabase";
import { buildMicronutrientsFromFood } from "@/lib/micronutrients";
import type { NutritionEntry } from "@/types/nutrition";

function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestFoodMatch(name: string): FoodItem | undefined {
  const normalized = normalizeFoodName(name);
  if (!normalized) return undefined;

  return (
    foodDatabase.find((item) => normalizeFoodName(item.name) === normalized) ??
    foodDatabase.find((item) => {
      const itemName = normalizeFoodName(item.name);
      return normalized.includes(itemName) || itemName.includes(normalized);
    })
  );
}

function recordsEqual<T extends object>(left?: T, right?: T) {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export function hydrateEntryDerivedData(entry: NutritionEntry): NutritionEntry {
  const food = findBestFoodMatch(entry.food);
  if (!food || entry.amount <= 0) return entry;

  let changed = false;
  const nextEntry: NutritionEntry = { ...entry };

  if (food.liquidMl && food.baseAmount > 0) {
    const correctLiquidMl = Math.round(food.liquidMl * (entry.amount / food.baseAmount));
    if (nextEntry.liquidMl !== correctLiquidMl) {
      nextEntry.liquidMl = correctLiquidMl;
      changed = true;
    }
  } else if (nextEntry.liquidMl !== undefined) {
    delete nextEntry.liquidMl;
    changed = true;
  }

  const micronutrients = buildMicronutrientsFromFood(food, entry.amount);

  if (micronutrients.vitamins && !recordsEqual(nextEntry.vitamins, micronutrients.vitamins)) {
    nextEntry.vitamins = micronutrients.vitamins;
    changed = true;
  }

  if (micronutrients.minerals && !recordsEqual(nextEntry.minerals, micronutrients.minerals)) {
    nextEntry.minerals = micronutrients.minerals;
    changed = true;
  }

  return changed ? nextEntry : entry;
}

export function hydrateEntriesDerivedData(entries: NutritionEntry[]): NutritionEntry[] {
  return entries.map(hydrateEntryDerivedData);
}
