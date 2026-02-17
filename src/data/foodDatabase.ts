export interface FoodItem {
  name: string;
  baseUnit: string; // "100g", "100ml", "1 Stk"
  baseAmount: number; // numeric base: 100 for g/ml, 1 for Stk
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  defaultAmount?: number; // Standardmenge, z.B. 125g für eine Avocado
}

const FOOD_DB_KEY = "foodlog-food-database";

const DEFAULT_FOODS: FoodItem[] = [
  { name: "Avocado", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 2, fat: 15, carbs: 3, fiber: 18, defaultAmount: 125 },
  { name: "Backkakao", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 20, fat: 20, carbs: 28, fiber: 33 },
  { name: "Banane", baseUnit: "100g", baseAmount: 100, calories: 89, protein: 1, fat: 0, carbs: 20, fiber: 2 },
  { name: "Brotchips (Knoblauch)", baseUnit: "100g", baseAmount: 100, calories: 461, protein: 9, fat: 16, carbs: 69, fiber: 4 },
  { name: "Butter", baseUnit: "100g", baseAmount: 100, calories: 740, protein: 0, fat: 85, carbs: 0, fiber: 0 },
  { name: "Champignons", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 4, fat: 0, carbs: 1, fiber: 3 },
  { name: "Eier (XL)", baseUnit: "1 Stk", baseAmount: 1, calories: 109, protein: 9, fat: 8, carbs: 1, fiber: 0 },
  { name: "Feldsalat", baseUnit: "100g", baseAmount: 100, calories: 14, protein: 2, fat: 0, carbs: 1, fiber: 2 },
  { name: "Fenchel", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1, fat: 0, carbs: 3, fiber: 3 },
  { name: "Feta", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 17, fat: 21, carbs: 1, fiber: 0 },
  { name: "Gekochter Schinken", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 19, fat: 3, carbs: 0, fiber: 0 },
  { name: "Gemüsebrühe", baseUnit: "100ml", baseAmount: 100, calories: 4, protein: 0, fat: 0, carbs: 1, fiber: 0 },
  { name: "Gemüsezwiebeln", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 1, fat: 0, carbs: 6, fiber: 2 },
  { name: "Granatapfelsaft", baseUnit: "100ml", baseAmount: 100, calories: 65, protein: 0, fat: 0, carbs: 15, fiber: 0 },
  { name: "Griech. Joghurt (2%)", baseUnit: "100g", baseAmount: 100, calories: 58, protein: 8, fat: 1, carbs: 4, fiber: 0 },
  { name: "Heringsfilet (Nixe)", baseUnit: "100g", baseAmount: 100, calories: 196, protein: 13, fat: 15, carbs: 3, fiber: 0 },
  { name: "Honig", baseUnit: "100g", baseAmount: 100, calories: 300, protein: 0, fat: 0, carbs: 80, fiber: 0 },
  { name: "Kaffee (schwarz)", baseUnit: "100ml", baseAmount: 100, calories: 2, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  { name: "Kakaopulver (rein)", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 20, fat: 11, carbs: 9, fiber: 33 },
  { name: "Kartoffeln", baseUnit: "100g", baseAmount: 100, calories: 77, protein: 2, fat: 0, carbs: 17, fiber: 2 },
  { name: "Kasseler Lachs", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 21, fat: 2, carbs: 1, fiber: 0 },
  { name: "Kasseler Nacken", baseUnit: "100g", baseAmount: 100, calories: 161, protein: 18, fat: 10, carbs: 1, fiber: 0 },
  { name: "Kohlrabi", baseUnit: "100g", baseAmount: 100, calories: 27, protein: 2, fat: 0, carbs: 4, fiber: 2 },
  { name: "Kürbiskerne", baseUnit: "100g", baseAmount: 100, calories: 570, protein: 30, fat: 50, carbs: 10, fiber: 11 },
  { name: "Lauchzwiebel", baseUnit: "100g", baseAmount: 100, calories: 32, protein: 2, fat: 0, carbs: 4, fiber: 3 },
  { name: "Milch (3,8%)", baseUnit: "100ml", baseAmount: 100, calories: 64, protein: 3, fat: 4, carbs: 5, fiber: 0 },
  { name: "Mini Harzer", baseUnit: "100g", baseAmount: 100, calories: 121, protein: 29, fat: 1, carbs: 0, fiber: 0 },
  { name: "Möhren", baseUnit: "100g", baseAmount: 100, calories: 41, protein: 1, fat: 0, carbs: 5, fiber: 3 },
  { name: "Norwegischer Lachs", baseUnit: "100g", baseAmount: 100, calories: 202, protein: 20, fat: 13, carbs: 0, fiber: 0 },
  { name: "Olivenöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Paprika (rot)", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1, fat: 0, carbs: 9, fiber: 3 },
  { name: "Physalis", baseUnit: "100g", baseAmount: 100, calories: 72, protein: 2, fat: 0, carbs: 11, fiber: 4 },
  { name: "Proteinpulver", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 76, fat: 4, carbs: 4, fiber: 0 },
  { name: "Putenfleisch", baseUnit: "100g", baseAmount: 100, calories: 147, protein: 30, fat: 3, carbs: 0, fiber: 0 },
  { name: "Regenbogen-Forelle", baseUnit: "100g", baseAmount: 100, calories: 139, protein: 20, fat: 6, carbs: 0, fiber: 0 },
  { name: "Rote Bete (Glas)", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 1, fat: 0, carbs: 7, fiber: 2 },
  { name: "Sardinen (abgetr.)", baseUnit: "100g", baseAmount: 100, calories: 188, protein: 24, fat: 10, carbs: 0, fiber: 0 },
  { name: "Sauerkraut", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 2, fat: 0, carbs: 2, fiber: 2 },
  { name: "Schweinefilet", baseUnit: "100g", baseAmount: 100, calories: 106, protein: 21, fat: 2, carbs: 0, fiber: 0 },
  { name: "Senf", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 6, fat: 7, carbs: 7, fiber: 0 },
  { name: "TK-Heidelbeeren", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1, fat: 1, carbs: 7, fiber: 5 },
  { name: "Thunfisch (Dose)", baseUnit: "100g", baseAmount: 100, calories: 109, protein: 25, fat: 1, carbs: 0, fiber: 0 },
  { name: "Tomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 1, fat: 0, carbs: 4, fiber: 2 },
  { name: "Tomatenketchup", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 1, fat: 0, carbs: 23, fiber: 0 },
  { name: "Vollkornbrot", baseUnit: "100g", baseAmount: 100, calories: 218, protein: 7, fat: 1, carbs: 41, fiber: 28 },
  { name: "Walnüsse", baseUnit: "100g", baseAmount: 100, calories: 678, protein: 15, fat: 65, carbs: 7, fiber: 7 },
  { name: "Weiße Bohnen (Lidl)", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 7, fat: 0, carbs: 13, fiber: 17 },
  { name: "Weintrauben rot", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 1, fat: 0, carbs: 16, fiber: 2 },
  { name: "Ziegenkäse", baseUnit: "100g", baseAmount: 100, calories: 286, protein: 20, fat: 23, carbs: 1, fiber: 0 },
  { name: "Zitronensaft", baseUnit: "100ml", baseAmount: 100, calories: 30, protein: 0, fat: 0, carbs: 3, fiber: 0 },
  { name: "Zucchini", baseUnit: "100g", baseAmount: 100, calories: 17, protein: 1, fat: 0, carbs: 2, fiber: 1 },
  { name: "Zwiebeln", baseUnit: "100g", baseAmount: 100, calories: 28, protein: 1, fat: 0, carbs: 6, fiber: 2 },
  { name: "Kiwi", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 1, fat: 0, carbs: 10, fiber: 3 },
  { name: "Matjesfilet", baseUnit: "100g", baseAmount: 100, calories: 263, protein: 14, fat: 22, carbs: 0, fiber: 0 },
];

function loadFoodDatabase(): FoodItem[] {
  try {
    const data = localStorage.getItem(FOOD_DB_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [...DEFAULT_FOODS];
}

function saveFoodDatabase(items: FoodItem[]): void {
  localStorage.setItem(FOOD_DB_KEY, JSON.stringify(items));
}

export const foodDatabase: FoodItem[] = loadFoodDatabase();

export function addFoodItem(item: FoodItem): void {
  if (!foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
    foodDatabase.push(item);
    saveFoodDatabase(foodDatabase);
  }
}

export function removeFoodItem(name: string): void {
  const index = foodDatabase.findIndex((f) => f.name === name);
  if (index >= 0) {
    foodDatabase.splice(index, 1);
    saveFoodDatabase(foodDatabase);
  }
}

export function updateFoodItem(originalName: string, updated: FoodItem): void {
  const index = foodDatabase.findIndex((f) => f.name === originalName);
  if (index >= 0) {
    foodDatabase[index] = updated;
  } else {
    foodDatabase.push(updated);
  }
  saveFoodDatabase(foodDatabase);
}

export function searchFood(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return foodDatabase
    .filter((item) => item.name.toLowerCase().includes(lower))
    .slice(0, 8);
}
