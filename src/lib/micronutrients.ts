import type { FoodItem, FoodMinerals, FoodVitamins } from "@/data/foodDatabase";
import { foodDatabase } from "@/data/foodDatabase";
import type { NutritionEntry } from "@/types/nutrition";

export type MicronutrientGender = "male" | "female";

export interface MicronutrientDefinition {
  key: string;
  label: string;
  fullName: string;
  unit: string;
  target: {
    male: number | null;
    female: number | null;
  };
}

export const VITAMIN_DEFINITIONS = [
  { key: "vitA", label: "A", fullName: "Retinol", unit: "µg", target: { male: 850, female: 700 } },
  { key: "vitB1", label: "B1", fullName: "Thiamin", unit: "mg", target: { male: 1.2, female: 1.0 } },
  { key: "vitB2", label: "B2", fullName: "Riboflavin", unit: "mg", target: { male: 1.4, female: 1.1 } },
  { key: "vitB3", label: "B3", fullName: "Niacin", unit: "mg", target: { male: 15, female: 12 } },
  { key: "vitB5", label: "B5", fullName: "Pantothensäure", unit: "mg", target: { male: 5, female: 5 } },
  { key: "vitB6", label: "B6", fullName: "Pyridoxin", unit: "mg", target: { male: 1.6, female: 1.4 } },
  { key: "vitB7", label: "B7", fullName: "Biotin", unit: "µg", target: { male: 40, female: 40 } },
  { key: "vitB9", label: "B9", fullName: "Folsäure", unit: "µg", target: { male: 300, female: 300 } },
  { key: "vitB12", label: "B12", fullName: "Cobalamin", unit: "µg", target: { male: 4, female: 4 } },
  { key: "vitC", label: "C", fullName: "Ascorbinsäure", unit: "mg", target: { male: 110, female: 95 } },
  { key: "vitD", label: "D", fullName: "Calciferol", unit: "µg", target: { male: 20, female: 20 } },
  { key: "vitE", label: "E", fullName: "Tocopherol", unit: "mg", target: { male: 14, female: 12 } },
  { key: "vitK", label: "K", fullName: "Phyllochinon", unit: "µg", target: { male: 70, female: 60 } },
] as const satisfies readonly MicronutrientDefinition[];

export const MINERAL_DEFINITIONS = [
  { key: "calcium", label: "Ca", fullName: "Calcium", unit: "mg", target: { male: 1000, female: 1000 } },
  { key: "chlorid", label: "Cl", fullName: "Chlorid", unit: "mg", target: { male: 2300, female: 2300 } },
  { key: "eisen", label: "Fe", fullName: "Eisen", unit: "mg", target: { male: 10, female: 15 } },
  { key: "fluorid", label: "F", fullName: "Fluorid", unit: "mg", target: { male: 3.5, female: 3.1 } },
  { key: "kalium", label: "K", fullName: "Kalium", unit: "mg", target: { male: 4000, female: 4000 } },
  { key: "kupfer", label: "Cu", fullName: "Kupfer", unit: "mg", target: { male: 1.25, female: 1.25 } },
  { key: "magnesium", label: "Mg", fullName: "Magnesium", unit: "mg", target: { male: 350, female: 300 } },
  { key: "mangan", label: "Mn", fullName: "Mangan", unit: "mg", target: { male: 3.5, female: 3.5 } },
  { key: "natrium", label: "Na", fullName: "Natrium", unit: "mg", target: { male: 1500, female: 1500 } },
  { key: "phosphor", label: "P", fullName: "Phosphor", unit: "mg", target: { male: 550, female: 550 } },
  { key: "schwefel", label: "S", fullName: "Schwefel", unit: "mg", target: { male: null, female: null } },
  { key: "zink", label: "Zn", fullName: "Zink", unit: "mg", target: { male: 14, female: 8 } },
] as const satisfies readonly MicronutrientDefinition[];

const findMatchingFood = (name: string): FoodItem | undefined => {
  const lower = name.trim().toLowerCase();
  if (!lower) return undefined;

  return (
    foodDatabase.find((item) => item.name.toLowerCase() === lower) ??
    foodDatabase.find((item) => lower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(lower))
  );
};

const extractAmountValue = (amount: string): number => {
  const match = amount.match(/[\d.,]+/);
  return match ? parseFloat(match[0].replace(",", ".")) || 0 : 0;
};

const scaleVitaminValues = (vitamins: FoodVitamins | undefined, factor: number): FoodVitamins | undefined => {
  if (!vitamins || factor <= 0) return undefined;

  const scaled: FoodVitamins = {};
  let hasValues = false;

  for (const definition of VITAMIN_DEFINITIONS) {
    const value = vitamins[definition.key as keyof FoodVitamins];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      scaled[definition.key as keyof FoodVitamins] = value * factor;
      hasValues = true;
    }
  }

  return hasValues ? scaled : undefined;
};

const scaleMineralValues = (minerals: FoodMinerals | undefined, factor: number): FoodMinerals | undefined => {
  if (!minerals || factor <= 0) return undefined;

  const scaled: FoodMinerals = {};
  let hasValues = false;

  for (const definition of MINERAL_DEFINITIONS) {
    const value = minerals[definition.key as keyof FoodMinerals];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      scaled[definition.key as keyof FoodMinerals] = value * factor;
      hasValues = true;
    }
  }

  return hasValues ? scaled : undefined;
};

export function buildMicronutrientsFromFood(food: Pick<FoodItem, "baseAmount" | "vitamins" | "minerals">, amount: number) {
  const factor = food.baseAmount > 0 ? amount / food.baseAmount : 0;

  return {
    vitamins: scaleVitaminValues(food.vitamins, factor),
    minerals: scaleMineralValues(food.minerals, factor),
  };
}

export function estimateRecipeMicronutrients(
  ingredients: Array<{ name: string; amount: string }>,
  servings = 1,
) {
  const vitaminTotals: FoodVitamins = {};
  const mineralTotals: FoodMinerals = {};

  for (const ingredient of ingredients) {
    const food = findMatchingFood(ingredient.name);
    const amount = extractAmountValue(ingredient.amount);
    if (!food || amount <= 0 || food.baseAmount <= 0) continue;

    const factor = amount / food.baseAmount;
    const scaledVitamins = scaleVitaminValues(food.vitamins, factor);
    const scaledMinerals = scaleMineralValues(food.minerals, factor);

    for (const definition of VITAMIN_DEFINITIONS) {
      const key = definition.key as keyof FoodVitamins;
      vitaminTotals[key] = (vitaminTotals[key] ?? 0) + (scaledVitamins?.[key] ?? 0);
    }

    for (const definition of MINERAL_DEFINITIONS) {
      const key = definition.key as keyof FoodMinerals;
      mineralTotals[key] = (mineralTotals[key] ?? 0) + (scaledMinerals?.[key] ?? 0);
    }
  }

  if (servings > 1) {
    for (const definition of VITAMIN_DEFINITIONS) {
      const key = definition.key as keyof FoodVitamins;
      if (vitaminTotals[key] !== undefined) {
        vitaminTotals[key] = (vitaminTotals[key] ?? 0) / servings;
      }
    }

    for (const definition of MINERAL_DEFINITIONS) {
      const key = definition.key as keyof FoodMinerals;
      if (mineralTotals[key] !== undefined) {
        mineralTotals[key] = (mineralTotals[key] ?? 0) / servings;
      }
    }
  }

  const hasVitaminData = VITAMIN_DEFINITIONS.some((definition) => (vitaminTotals[definition.key as keyof FoodVitamins] ?? 0) > 0);
  const hasMineralData = MINERAL_DEFINITIONS.some((definition) => (mineralTotals[definition.key as keyof FoodMinerals] ?? 0) > 0);

  return {
    vitamins: hasVitaminData ? vitaminTotals : undefined,
    minerals: hasMineralData ? mineralTotals : undefined,
  };
}

export function aggregateMicronutrients(entries: NutritionEntry[]) {
  const vitaminTotals = Object.fromEntries(VITAMIN_DEFINITIONS.map((definition) => [definition.key, 0])) as Record<string, number>;
  const mineralTotals = Object.fromEntries(MINERAL_DEFINITIONS.map((definition) => [definition.key, 0])) as Record<string, number>;

  for (const entry of entries) {
    for (const definition of VITAMIN_DEFINITIONS) {
      vitaminTotals[definition.key] += entry.vitamins?.[definition.key as keyof FoodVitamins] ?? 0;
    }

    for (const definition of MINERAL_DEFINITIONS) {
      mineralTotals[definition.key] += entry.minerals?.[definition.key as keyof FoodMinerals] ?? 0;
    }
  }

  return {
    vitamins: vitaminTotals,
    minerals: mineralTotals,
  };
}

export function getMicronutrientTarget(definition: MicronutrientDefinition, gender: MicronutrientGender): number | null {
  return definition.target[gender];
}

export function formatMicronutrientValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 100) return Math.round(value).toLocaleString("de-DE");
  if (value >= 10) return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  if (value >= 1) return value.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  return value.toLocaleString("de-DE", { maximumFractionDigits: 3 });
}
