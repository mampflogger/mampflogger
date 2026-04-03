import { generateId } from "@/types/nutrition";
import type { FoodVitamins, FoodMinerals } from "@/data/foodDatabase";

/**
 * A single nutrient mapping within a supplement.
 * E.g. "Vitamin D3" → vitD, 250 µg
 */
export interface SupplementNutrient {
  /** Internal key matching VITAMIN_DEFINITIONS or MINERAL_DEFINITIONS */
  nutrientKey: string;
  /** "vitamins" or "minerals" */
  kind: "vitamins" | "minerals";
  /** Amount per unit (per capsule) in the nutrient's canonical unit */
  amountPerUnit: number;
  /** Display unit – µg, mg, IE etc. */
  displayUnit: string;
}

export interface Supplement {
  id: string;
  /** User-facing name, e.g. "Vitamin D3" or "Multivitamin Komplex" */
  name: string;
  /** Number of units (capsules) taken */
  quantity: number;
  /** Nutrient mappings – one or more for Kombipräparate */
  nutrients: SupplementNutrient[];
  /** If true, automatically counted every day */
  daily: boolean;
}

const STORAGE_KEY = "mampflogger-supplements";

export function loadSupplements(): Supplement[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSupplements(supplements: Supplement[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(supplements));
}

export function createSupplement(partial: Omit<Supplement, "id">): Supplement {
  return { id: generateId(), ...partial };
}

/**
 * Known unit conversion factors to the canonical unit used in micronutrients.ts.
 * IE (International Units) vary by nutrient.
 */
const IE_FACTORS: Record<string, number> = {
  vitD: 0.025,    // 1 IE Vitamin D = 0.025 µg
  vitA: 0.3,      // 1 IE Vitamin A (Retinol) = 0.3 µg
  vitE: 0.67,     // 1 IE Vitamin E = 0.67 mg (α-Tocopherol)
};

/**
 * Convert a supplement amount from its display unit to the canonical unit.
 */
export function convertToCanonical(
  nutrientKey: string,
  amount: number,
  displayUnit: string,
): number {
  const unitLower = displayUnit.toLowerCase().trim();

  if (unitLower === "ie" || unitLower === "iu") {
    const factor = IE_FACTORS[nutrientKey];
    if (factor) return amount * factor;
    // Unknown IE mapping – return as-is (user can adjust targets)
    return amount;
  }

  // mg → µg conversion for nutrients whose canonical unit is µg
  const UG_NUTRIENTS = new Set(["vitA", "vitB7", "vitB9", "vitB12", "vitD", "vitK"]);
  if (unitLower === "mg" && UG_NUTRIENTS.has(nutrientKey)) {
    return amount * 1000;
  }

  // µg → mg for nutrients whose canonical unit is mg
  if (unitLower === "µg" && !UG_NUTRIENTS.has(nutrientKey)) {
    return amount / 1000;
  }

  return amount;
}

/**
 * Aggregate active daily supplements into vitamin and mineral totals.
 */
export function aggregateSupplementNutrients(supplements: Supplement[]): {
  vitamins: FoodVitamins;
  minerals: FoodMinerals;
} {
  const vitamins: FoodVitamins = {};
  const minerals: FoodMinerals = {};

  for (const supp of supplements) {
    if (!supp.daily) continue;

    for (const n of supp.nutrients) {
      const canonical = convertToCanonical(n.nutrientKey, n.amountPerUnit, n.displayUnit) * supp.quantity;
      if (n.kind === "vitamins") {
        vitamins[n.nutrientKey as keyof FoodVitamins] =
          (vitamins[n.nutrientKey as keyof FoodVitamins] ?? 0) + canonical;
      } else {
        minerals[n.nutrientKey as keyof FoodMinerals] =
          (minerals[n.nutrientKey as keyof FoodMinerals] ?? 0) + canonical;
      }
    }
  }

  return { vitamins, minerals };
}

/**
 * All known nutrients for the supplement dropdown.
 */
export const SUPPLEMENT_NUTRIENT_OPTIONS: { key: string; kind: "vitamins" | "minerals"; label: string; defaultUnit: string }[] = [
  { key: "vitA", kind: "vitamins", label: "Vitamin A (Retinol)", defaultUnit: "µg" },
  { key: "vitB1", kind: "vitamins", label: "Vitamin B1 (Thiamin)", defaultUnit: "mg" },
  { key: "vitB2", kind: "vitamins", label: "Vitamin B2 (Riboflavin)", defaultUnit: "mg" },
  { key: "vitB3", kind: "vitamins", label: "Vitamin B3 (Niacin)", defaultUnit: "mg" },
  { key: "vitB5", kind: "vitamins", label: "Vitamin B5 (Pantothensäure)", defaultUnit: "mg" },
  { key: "vitB6", kind: "vitamins", label: "Vitamin B6 (Pyridoxin)", defaultUnit: "mg" },
  { key: "vitB7", kind: "vitamins", label: "Vitamin B7 (Biotin)", defaultUnit: "µg" },
  { key: "vitB9", kind: "vitamins", label: "Vitamin B9 (Folsäure)", defaultUnit: "µg" },
  { key: "vitB12", kind: "vitamins", label: "Vitamin B12 (Cobalamin)", defaultUnit: "µg" },
  { key: "vitC", kind: "vitamins", label: "Vitamin C", defaultUnit: "mg" },
  { key: "vitD", kind: "vitamins", label: "Vitamin D", defaultUnit: "µg" },
  { key: "vitE", kind: "vitamins", label: "Vitamin E (Tocopherol)", defaultUnit: "mg" },
  { key: "vitK", kind: "vitamins", label: "Vitamin K", defaultUnit: "µg" },
  { key: "calcium", kind: "minerals", label: "Calcium", defaultUnit: "mg" },
  { key: "chlorid", kind: "minerals", label: "Chlorid", defaultUnit: "mg" },
  { key: "eisen", kind: "minerals", label: "Eisen", defaultUnit: "mg" },
  { key: "fluorid", kind: "minerals", label: "Fluorid", defaultUnit: "mg" },
  { key: "kalium", kind: "minerals", label: "Kalium", defaultUnit: "mg" },
  { key: "kupfer", kind: "minerals", label: "Kupfer", defaultUnit: "mg" },
  { key: "magnesium", kind: "minerals", label: "Magnesium", defaultUnit: "mg" },
  { key: "mangan", kind: "minerals", label: "Mangan", defaultUnit: "mg" },
  { key: "natrium", kind: "minerals", label: "Natrium", defaultUnit: "mg" },
  { key: "phosphor", kind: "minerals", label: "Phosphor", defaultUnit: "mg" },
  { key: "schwefel", kind: "minerals", label: "Schwefel", defaultUnit: "mg" },
  { key: "zink", kind: "minerals", label: "Zink", defaultUnit: "mg" },
];
