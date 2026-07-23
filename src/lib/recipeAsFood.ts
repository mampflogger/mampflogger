import { addFoodItem, foodDatabase, updateFoodItem, type FoodItem } from "@/data/foodDatabase";

export interface RecipeMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface IngredientPer100g {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  isMain?: boolean;
  per100g?: IngredientPer100g;
}

interface RecipeLike {
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalMacros?: RecipeMacros;
  perServing: RecipeMacros;
}

interface DerivedRecipeNutrition {
  totalMacros: RecipeMacros;
  perServing: RecipeMacros;
  servingWeight: number;
  liquidPerServing: number;
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyMacros(): RecipeMacros {
  return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
}

function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findRecipeIngredientFood(name: string): FoodItem | undefined {
  const normalized = normalizeFoodName(name);
  if (!normalized) return undefined;

  const exact = foodDatabase.find((item) => normalizeFoodName(item.name) === normalized);
  if (exact) return exact;

  if (normalized.length < 4) return undefined;

  return foodDatabase.find((item) => {
    const itemName = normalizeFoodName(item.name);
    if (itemName.length < 4) return false;
    return normalized.includes(itemName) || itemName.includes(normalized);
  });
}

function extractAmountValue(amount: string): number | null {
  const match = amount?.match(/[\d.,]+/);
  if (!match) return null;
  const value = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getIngredientMacros(ingredient: RecipeIngredient): RecipeMacros | null {
  const amount = extractAmountValue(ingredient.amount);
  if (amount === null) return null;

  const per100g = ingredient.per100g;
  if (per100g?.calories != null) {
    const factor = amount / 100;
    return {
      calories: Math.round((per100g.calories || 0) * factor),
      protein: roundMacro((per100g.protein || 0) * factor),
      fat: roundMacro((per100g.fat || 0) * factor),
      carbs: roundMacro((per100g.carbs || 0) * factor),
      fiber: roundMacro((per100g.fiber || 0) * factor),
    };
  }

  const food = findRecipeIngredientFood(ingredient.name);
  if (!food || food.baseAmount <= 0) return null;

  const factor = amount / food.baseAmount;
  return {
    calories: Math.round(food.calories * factor),
    protein: roundMacro(food.protein * factor),
    fat: roundMacro(food.fat * factor),
    carbs: roundMacro(food.carbs * factor),
    fiber: roundMacro(food.fiber * factor),
  };
}

function sumMacros(items: RecipeMacros[]): RecipeMacros {
  const total = items.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    fat: sum.fat + item.fat,
    carbs: sum.carbs + item.carbs,
    fiber: sum.fiber + item.fiber,
  }), emptyMacros());

  return {
    calories: Math.round(total.calories),
    protein: roundMacro(total.protein),
    fat: roundMacro(total.fat),
    carbs: roundMacro(total.carbs),
    fiber: roundMacro(total.fiber),
  };
}

function divideMacros(total: RecipeMacros, servings: number): RecipeMacros {
  return {
    calories: Math.round(total.calories / servings),
    protein: roundMacro(total.protein / servings),
    fat: roundMacro(total.fat / servings),
    carbs: roundMacro(total.carbs / servings),
    fiber: roundMacro(total.fiber / servings),
  };
}

function fallbackTotalMacros(recipe: RecipeLike, servings: number): RecipeMacros {
  if (recipe.totalMacros && recipe.totalMacros.calories > 0) return recipe.totalMacros;

  return {
    calories: Math.round((recipe.perServing.calories || 0) * servings),
    protein: roundMacro((recipe.perServing.protein || 0) * servings),
    fat: roundMacro((recipe.perServing.fat || 0) * servings),
    carbs: roundMacro((recipe.perServing.carbs || 0) * servings),
    fiber: roundMacro((recipe.perServing.fiber || 0) * servings),
  };
}

export function deriveRecipeNutrition(recipe: RecipeLike): DerivedRecipeNutrition {
  const servings = Math.max(1, recipe.servings || 1);
  let totalLiquidMl = 0;
  const totalWeight = recipe.ingredients.reduce((sum, ingredient) => {
    const amount = extractAmountValue(ingredient.amount) || 0;
    if (/ml\b/i.test(ingredient.amount || "")) totalLiquidMl += amount;
    return sum + amount;
  }, 0) || 100;

  const ingredientMacros = recipe.ingredients.map(getIngredientMacros);
  const totalMacros = ingredientMacros.length > 0 && ingredientMacros.every((item) => item !== null)
    ? sumMacros(ingredientMacros.filter((item): item is RecipeMacros => item !== null))
    : fallbackTotalMacros(recipe, servings);

  return {
    totalMacros,
    perServing: divideMacros(totalMacros, servings),
    servingWeight: Math.max(1, Math.round(totalWeight / servings)),
    liquidPerServing: Math.round(totalLiquidMl / servings),
  };
}

/**
 * Adds (or updates) the recipe as a "food item" in the local food database
 * so it becomes selectable in the new-entry input mask immediately after saving.
 *
 * Macros are normalized to per-100g of one serving. Liquid amount per serving
 * is derived from ingredients with "ml" units.
 */
export function registerRecipeAsFood(recipe: RecipeLike): void {
  if (!recipe?.name || !recipe.ingredients?.length || !recipe.perServing) return;

  const { perServing, servingWeight, liquidPerServing } = deriveRecipeNutrition(recipe);
  const factor = 100 / servingWeight;

  const foodItem: FoodItem = {
    name: recipe.name,
    baseUnit: "100g",
    baseAmount: 100,
    calories: Math.round(perServing.calories * factor),
    protein: roundMacro(perServing.protein * factor),
    fat: roundMacro(perServing.fat * factor),
    carbs: roundMacro(perServing.carbs * factor),
    fiber: roundMacro(perServing.fiber * factor),
    defaultAmount: servingWeight,
    ...(liquidPerServing > 0 ? { liquidMl: liquidPerServing } : {}),
    category: "Eigene",
    isUserCreated: true,
  };

  const existing = foodDatabase.find((f) => f.name.toLowerCase() === recipe.name.toLowerCase());
  if (existing) {
    updateFoodItem(existing.name, { ...existing, ...foodItem, name: existing.name });
  } else {
    addFoodItem(foodItem);
  }
}
