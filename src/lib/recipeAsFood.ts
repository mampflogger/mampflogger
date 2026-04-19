import { addFoodItem, type FoodItem } from "@/data/foodDatabase";

interface RecipeMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface RecipeIngredient {
  name: string;
  amount: string;
  isMain?: boolean;
}

interface RecipeLike {
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  perServing: RecipeMacros;
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

  let totalLiquidMl = 0;
  const portionWeight = recipe.ingredients.reduce((sum, ing) => {
    const match = ing.amount?.match(/[\d.,]+/);
    const val = match ? parseFloat(match[0].replace(",", ".")) : 0;
    if (/ml\b/i.test(ing.amount || "")) {
      totalLiquidMl += val;
    }
    return sum + val;
  }, 0) || 100; // Fallback 100g when no amounts detected

  const servings = Math.max(1, recipe.servings || 1);
  const liquidPerServing = Math.round(totalLiquidMl / servings);
  const servingWeight = Math.max(1, Math.round(portionWeight / servings));
  const factor = 100 / servingWeight;
  const ps = recipe.perServing;

  const foodItem: FoodItem = {
    name: recipe.name,
    baseUnit: "100g",
    baseAmount: 100,
    calories: Math.round(ps.calories * factor),
    protein: Math.round(ps.protein * factor * 10) / 10,
    fat: Math.round(ps.fat * factor * 10) / 10,
    carbs: Math.round(ps.carbs * factor * 10) / 10,
    fiber: Math.round(ps.fiber * factor * 10) / 10,
    defaultAmount: servingWeight,
    ...(liquidPerServing > 0 ? { liquidMl: liquidPerServing } : {}),
    category: "Eigene",
    isUserCreated: true,
  };

  addFoodItem(foodItem);
}
