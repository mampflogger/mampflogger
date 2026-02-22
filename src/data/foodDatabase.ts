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
  liquidMl?: number; // Flüssigkeit in ml pro baseAmount (z.B. 100 bei 100ml-Basis)
  isUserCreated?: boolean; // Vom User selbst angelegt (niemals durch Remote überschreiben)
  isRemote?: boolean;      // Vom Remote-Server geladen
}

const FOOD_DB_KEY = "mampflogger-food-database";
const DELETED_FOODS_KEY = "mampflogger-deleted-foods";

// ---- Deleted-foods blacklist ----
function loadDeletedFoods(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_FOODS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveDeletedFoods(deleted: Set<string>): void {
  localStorage.setItem(DELETED_FOODS_KEY, JSON.stringify([...deleted]));
}

export function markFoodDeleted(name: string): void {
  const deleted = loadDeletedFoods();
  deleted.add(name.toLowerCase());
  saveDeletedFoods(deleted);
}

export function unmarkFoodDeleted(name: string): void {
  const deleted = loadDeletedFoods();
  deleted.delete(name.toLowerCase());
  saveDeletedFoods(deleted);
}

export function isDeletedFood(name: string): boolean {
  return loadDeletedFoods().has(name.toLowerCase());
}

export function clearDeletedFoods(): void {
  localStorage.removeItem(DELETED_FOODS_KEY);
}
const DEFAULT_FOODS: FoodItem[] = [
  { name: "7UP", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 0, fat: 0, carbs: 7, fiber: 0, liquidMl: 100 },
  { name: "Ananas", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1, fat: 0, carbs: 13, fiber: 1 },
  { name: "Apfel", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 0, fat: 0, carbs: 14, fiber: 2 },
  { name: "Apfelsaft", baseUnit: "100ml", baseAmount: 100, calories: 46, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Apfelschorle", baseUnit: "100ml", baseAmount: 100, calories: 28, protein: 0, fat: 0, carbs: 7, fiber: 0, liquidMl: 100 },
  { name: "Appenzeller 50 %", baseUnit: "100g", baseAmount: 100, calories: 395, protein: 25, fat: 31, carbs: 0, fiber: 0 },
  { name: "Aprikose", baseUnit: "100g", baseAmount: 100, calories: 48, protein: 1, fat: 0, carbs: 11, fiber: 2 },
  { name: "Aubergine", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 1, fat: 0, carbs: 3, fiber: 3 },
  { name: "Austernpilze", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 3, fat: 0, carbs: 6, fiber: 2 },
  { name: "Avocado", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 2, fat: 15, carbs: 9, fiber: 7, defaultAmount: 125 },
  { name: "Backkakao", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 20, fat: 20, carbs: 28, fiber: 33 },
  { name: "Backpulver", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 0, fat: 0, carbs: 25, fiber: 0 },
  { name: "Banane", baseUnit: "100g", baseAmount: 100, calories: 89, protein: 1, fat: 0, carbs: 23, fiber: 3 },
  { name: "Beinscheibe (Rind)", baseUnit: "100g", baseAmount: 100, calories: 150, protein: 20, fat: 8, carbs: 0, fiber: 0 },
  { name: "Bergkäse 45 %", baseUnit: "100g", baseAmount: 100, calories: 390, protein: 27, fat: 31, carbs: 0, fiber: 0 },
  { name: "Bierschinken", baseUnit: "100g", baseAmount: 100, calories: 158, protein: 15, fat: 10, carbs: 1, fiber: 0 },
  { name: "Bionade Holunder", baseUnit: "100ml", baseAmount: 100, calories: 25, protein: 0, fat: 0, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Birne", baseUnit: "100g", baseAmount: 100, calories: 57, protein: 0, fat: 0, carbs: 15, fiber: 3 },
  { name: "Bitter Lemon", baseUnit: "100ml", baseAmount: 100, calories: 52, protein: 0, fat: 0, carbs: 13, fiber: 0, liquidMl: 100 },
  { name: "Blattspinat", baseUnit: "100g", baseAmount: 100, calories: 23, protein: 3, fat: 0, carbs: 1, fiber: 2 },
  { name: "Blumenkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 2, fat: 0, carbs: 2, fiber: 2 },
  { name: "Blutwurst", baseUnit: "100g", baseAmount: 100, calories: 321, protein: 14, fat: 29, carbs: 1, fiber: 0 },
  { name: "Bratwurst (fein)", baseUnit: "100g", baseAmount: 100, calories: 296, protein: 13, fat: 27, carbs: 1, fiber: 0 },
  { name: "Brie 50 %", baseUnit: "100g", baseAmount: 100, calories: 290, protein: 20, fat: 23, carbs: 0, fiber: 0 },
  { name: "Brokkoli", baseUnit: "100g", baseAmount: 100, calories: 34, protein: 3, fat: 1, carbs: 3, fiber: 3 },
  { name: "Brombeeren", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1, fat: 0, carbs: 10, fiber: 5 },
  { name: "Brotchips (Knoblauch)", baseUnit: "100g", baseAmount: 100, calories: 461, protein: 9, fat: 16, carbs: 69, fiber: 4 },
  { name: "Bulgur", baseUnit: "100g", baseAmount: 100, calories: 345, protein: 12, fat: 1, carbs: 65, fiber: 8 },
  { name: "Butter", baseUnit: "100g", baseAmount: 100, calories: 740, protein: 0, fat: 85, carbs: 0, fiber: 0 },
  { name: "Cabanossi", baseUnit: "100g", baseAmount: 100, calories: 385, protein: 16, fat: 35, carbs: 1, fiber: 0 },
  { name: "Camembert 30 %", baseUnit: "100g", baseAmount: 100, calories: 225, protein: 22, fat: 14, carbs: 1, fiber: 0 },
  { name: "Camembert 45 %", baseUnit: "100g", baseAmount: 100, calories: 290, protein: 19, fat: 23, carbs: 1, fiber: 0 },
  { name: "Camembert 60 %", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 17, fat: 31, carbs: 1, fiber: 0 },
  { name: "Cashewkerne", baseUnit: "100g", baseAmount: 100, calories: 553, protein: 18, fat: 44, carbs: 30, fiber: 3 },
  { name: "Cervelatwurst", baseUnit: "100g", baseAmount: 100, calories: 365, protein: 19, fat: 32, carbs: 1, fiber: 0 },
  { name: "Champignons", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 4, fat: 0, carbs: 1, fiber: 3 },
  { name: "Cheddar 50 %", baseUnit: "100g", baseAmount: 100, calories: 403, protein: 25, fat: 33, carbs: 1, fiber: 0 },
  { name: "Cherrytomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 1, fat: 0, carbs: 3, fiber: 1 },
  { name: "Chia-Samen", baseUnit: "100g", baseAmount: 100, calories: 444, protein: 17, fat: 31, carbs: 5, fiber: 34 },
  { name: "Chinakohl", baseUnit: "100g", baseAmount: 100, calories: 13, protein: 1, fat: 0, carbs: 1, fiber: 1 },
  { name: "Chorizo", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 21, fat: 29, carbs: 2, fiber: 0 },
  { name: "Clementine", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 1, fat: 0, carbs: 12, fiber: 2 },
  { name: "Club Mate", baseUnit: "100ml", baseAmount: 100, calories: 20, protein: 0, fat: 0, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Coca-Cola Classic", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Coca-Cola Zero", baseUnit: "100ml", baseAmount: 100, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, liquidMl: 100 },
  { name: "Couscous", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 12, fat: 1, carbs: 69, fiber: 4 },
  { name: "Dorade", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 20, fat: 2, carbs: 0, fiber: 0 },
  { name: "Dr Pepper", baseUnit: "100ml", baseAmount: 100, calories: 27, protein: 0, fat: 0, carbs: 7, fiber: 0, liquidMl: 100 },
  { name: "Drachenfrucht", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1, fat: 0, carbs: 11, fiber: 3 },
  { name: "Edamer 30 %", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 28, fat: 15, carbs: 0, fiber: 0 },
  { name: "Edamer 40 %", baseUnit: "100g", baseAmount: 100, calories: 312, protein: 25, fat: 23, carbs: 0, fiber: 0 },
  { name: "Eier (XL)", baseUnit: "100g", baseAmount: 100, calories: 109, protein: 9, fat: 8, carbs: 1, fiber: 0 },
  { name: "Eistee Pfirsich", baseUnit: "100ml", baseAmount: 100, calories: 28, protein: 0, fat: 0, carbs: 7, fiber: 0, liquidMl: 100 },
  { name: "Emmentaler 45 %", baseUnit: "100g", baseAmount: 100, calories: 382, protein: 28, fat: 30, carbs: 0, fiber: 0 },
  { name: "Entenbrust (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 18, fat: 17, carbs: 0, fiber: 0 },
  { name: "Entenkeule (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 17, fat: 18, carbs: 0, fiber: 0 },
  { name: "Entrecôte (Rind)", baseUnit: "100g", baseAmount: 100, calories: 180, protein: 20, fat: 11, carbs: 0, fiber: 0 },
  { name: "Erdbeeren", baseUnit: "100g", baseAmount: 100, calories: 32, protein: 1, fat: 0, carbs: 8, fiber: 2 },
  { name: "Erdnüsse", baseUnit: "100g", baseAmount: 100, calories: 567, protein: 26, fat: 49, carbs: 16, fiber: 9 },
  { name: "Erdnussöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Fanta", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Fassbrause", baseUnit: "100ml", baseAmount: 100, calories: 26, protein: 0, fat: 0, carbs: 6, fiber: 0, liquidMl: 100 },
  { name: "Feige", baseUnit: "100g", baseAmount: 100, calories: 74, protein: 1, fat: 0, carbs: 19, fiber: 3 },
  { name: "Feldsalat", baseUnit: "100g", baseAmount: 100, calories: 14, protein: 2, fat: 0, carbs: 1, fiber: 2 },
  { name: "Fenchel", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1, fat: 0, carbs: 3, fiber: 3 },
  { name: "Feta", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 17, fat: 21, carbs: 1, fiber: 0 },
  { name: "Feta 45 %", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 14, fat: 21, carbs: 4, fiber: 0 },
  { name: "Fleischwurst", baseUnit: "100g", baseAmount: 100, calories: 260, protein: 12, fat: 24, carbs: 0, fiber: 0 },
  { name: "Flussbarsch", baseUnit: "100g", baseAmount: 100, calories: 82, protein: 18, fat: 1, carbs: 0, fiber: 0 },
  { name: "Frischkäse 0,2 %", baseUnit: "100g", baseAmount: 100, calories: 65, protein: 11, fat: 0, carbs: 4, fiber: 0 },
  { name: "Frischkäse 20 %", baseUnit: "100g", baseAmount: 100, calories: 145, protein: 9, fat: 10, carbs: 3, fiber: 0 },
  { name: "Frischkäse 60 %", baseUnit: "100g", baseAmount: 100, calories: 255, protein: 6, fat: 24, carbs: 3, fiber: 0 },
  { name: "Fritz-Kola", baseUnit: "100ml", baseAmount: 100, calories: 41, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Fritz-Limo", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10, fiber: 0, liquidMl: 100 },
  { name: "Frühkartoffeln", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 2, fat: 0, carbs: 14, fiber: 2 },
  { name: "Frühstücksfleisch", baseUnit: "100g", baseAmount: 100, calories: 240, protein: 13, fat: 20, carbs: 1, fiber: 0 },
  { name: "Garnele (Shrimps)", baseUnit: "100g", baseAmount: 100, calories: 92, protein: 20, fat: 1, carbs: 1, fiber: 0 },
  { name: "Gänsebrust (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 16, fat: 32, carbs: 0, fiber: 0 },
  { name: "Geflügelsalami", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 21, fat: 22, carbs: 1, fiber: 0 },
  { name: "Gelbwurst", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 11, fat: 21, carbs: 1, fiber: 0 },
  { name: "Gemüsebrühe", baseUnit: "100ml", baseAmount: 100, calories: 4, protein: 0, fat: 0, carbs: 1, fiber: 0, liquidMl: 100 },
  { name: "Ginger Ale", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Gemüsezwiebeln", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 1, fat: 0, carbs: 6, fiber: 2 },
  { name: "Gorgonzola 48 %", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 19, fat: 30, carbs: 1, fiber: 0 },
  { name: "Gouda 30 %", baseUnit: "100g", baseAmount: 100, calories: 275, protein: 29, fat: 16, carbs: 0, fiber: 0 },
  { name: "Gouda 45 %", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 23, fat: 28, carbs: 0, fiber: 0 },
  { name: "Granatapfel", baseUnit: "100g", baseAmount: 100, calories: 83, protein: 2, fat: 1, carbs: 19, fiber: 4 },
  { name: "Granatapfelsaft", baseUnit: "100ml", baseAmount: 100, calories: 65, protein: 0, fat: 0, carbs: 15, fiber: 0, liquidMl: 100 },
  { name: "Grapefruit", baseUnit: "100g", baseAmount: 100, calories: 42, protein: 1, fat: 0, carbs: 11, fiber: 2 },
  { name: "Griech. Joghurt (2%)", baseUnit: "100g", baseAmount: 100, calories: 58, protein: 8, fat: 1, carbs: 4, fiber: 0 },
  { name: "Grünkohl", baseUnit: "100g", baseAmount: 100, calories: 49, protein: 4, fat: 1, carbs: 9, fiber: 4 },
  { name: "Gurke", baseUnit: "100g", baseAmount: 100, calories: 12, protein: 1, fat: 0, carbs: 2, fiber: 1 },
  { name: "Hähnchenbrustfilet", baseUnit: "100g", baseAmount: 100, calories: 106, protein: 23, fat: 1, carbs: 0, fiber: 0 },
  { name: "Hähncheninnenfilet", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 23, fat: 1, carbs: 0, fiber: 0 },
  { name: "Hähnchenkeule (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 18, fat: 10, carbs: 0, fiber: 0 },
  { name: "Halloumi 43 %", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 22, fat: 25, carbs: 2, fiber: 0 },
  { name: "Hanföl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Hanfsamen (geschält)", baseUnit: "100g", baseAmount: 100, calories: 550, protein: 30, fat: 45, carbs: 3, fiber: 6 },
  { name: "Hamburger Patty (Rind)", baseUnit: "100g", baseAmount: 100, calories: 240, protein: 18, fat: 19, carbs: 0, fiber: 0 },
  { name: "Harzer Käse 0,5 %", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 30, fat: 1, carbs: 0, fiber: 0 },
  { name: "Haselnüsse", baseUnit: "100g", baseAmount: 100, calories: 628, protein: 15, fat: 61, carbs: 17, fiber: 10 },
  { name: "Heidelbeeren", baseUnit: "100g", baseAmount: 100, calories: 57, protein: 1, fat: 0, carbs: 14, fiber: 2 },
  { name: "Hefe (frisch)", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 8, fat: 1, carbs: 18, fiber: 0 },
  { name: "Heilbutt (weiß)", baseUnit: "100g", baseAmount: 100, calories: 95, protein: 20, fat: 2, carbs: 0, fiber: 0 },
  { name: "Heringsfilet (Nixe)", baseUnit: "100g", baseAmount: 100, calories: 196, protein: 13, fat: 15, carbs: 3, fiber: 0 },
  { name: "Himbeeren", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 1, fat: 1, carbs: 12, fiber: 7 },
  { name: "Hirtenkäse 45 %", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 16, fat: 17, carbs: 2, fiber: 0 },
  { name: "Honig", baseUnit: "100g", baseAmount: 100, calories: 300, protein: 0, fat: 0, carbs: 80, fiber: 0 },
  { name: "Honigmelone", baseUnit: "100g", baseAmount: 100, calories: 36, protein: 1, fat: 0, carbs: 9, fiber: 1 },
  { name: "Hüttenkäse", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 13, fat: 5, carbs: 4, fiber: 0, defaultAmount: 300 },
  { name: "Hüttenkäse 0,8 %", baseUnit: "100g", baseAmount: 100, calories: 68, protein: 13, fat: 1, carbs: 3, fiber: 0 },
  { name: "Hüttenkäse 4 %", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 12, fat: 4, carbs: 3, fiber: 0 },
  { name: "Hüttenkäse Bio", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 13, fat: 5, carbs: 4, fiber: 0, defaultAmount: 200 },
  { name: "Jagdwurst", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 14, fat: 19, carbs: 1, fiber: 0 },
  { name: "Joghurt 0,1 %", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 4, fat: 0, carbs: 5, fiber: 0 },
  { name: "Joghurt 1,5 %", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 4, fat: 2, carbs: 5, fiber: 0 },
  { name: "Joghurt 3,5 %", baseUnit: "100g", baseAmount: 100, calories: 62, protein: 4, fat: 4, carbs: 5, fiber: 0 },
  { name: "Johannisbeeren", baseUnit: "100g", baseAmount: 100, calories: 56, protein: 1, fat: 0, carbs: 14, fiber: 4 },
  { name: "Kabeljau (Dorsch)", baseUnit: "100g", baseAmount: 100, calories: 82, protein: 18, fat: 1, carbs: 0, fiber: 0 },
  { name: "Kaffee (Milch)", baseUnit: "1 Tasse", baseAmount: 1, calories: 60, protein: 2, fat: 3, carbs: 4, fiber: 0, defaultAmount: 1, liquidMl: 280 },
  { name: "Karottensaft", baseUnit: "100ml", baseAmount: 100, calories: 39, protein: 1, fat: 0, carbs: 9, fiber: 2, liquidMl: 100 },
  { name: "Kaffee (schwarz)", baseUnit: "100ml", baseAmount: 100, calories: 2, protein: 0, fat: 0, carbs: 0, fiber: 0, liquidMl: 100 },
  { name: "Kakao 100%", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 20, fat: 20, carbs: 28, fiber: 33 },
  { name: "Kakaopulver (rein)", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 20, fat: 11, carbs: 9, fiber: 33 },
  { name: "Kaki", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 1, fat: 0, carbs: 19, fiber: 4 },
  { name: "Kalbsleber", baseUnit: "100g", baseAmount: 100, calories: 130, protein: 19, fat: 4, carbs: 4, fiber: 0 },
  { name: "Kalbsleberwurst", baseUnit: "100g", baseAmount: 100, calories: 335, protein: 11, fat: 32, carbs: 1, fiber: 0 },
  { name: "Kalbsrücken", baseUnit: "100g", baseAmount: 100, calories: 110, protein: 22, fat: 2, carbs: 0, fiber: 0 },
  { name: "Kalbsschnitzel", baseUnit: "100g", baseAmount: 100, calories: 108, protein: 22, fat: 2, carbs: 0, fiber: 0 },
  { name: "Kaninchenfleisch", baseUnit: "100g", baseAmount: 100, calories: 150, protein: 21, fat: 7, carbs: 0, fiber: 0 },
  { name: "Karotten", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 1, fat: 0, carbs: 5, fiber: 4 },
  { name: "Karpfen", baseUnit: "100g", baseAmount: 100, calories: 127, protein: 18, fat: 6, carbs: 0, fiber: 0 },
  { name: "Kartoffeln", baseUnit: "100g", baseAmount: 100, calories: 77, protein: 2, fat: 0, carbs: 17, fiber: 2 },
  { name: "Kasseler Lachs", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 21, fat: 2, carbs: 1, fiber: 0 },
  { name: "Kasseler Nacken", baseUnit: "100g", baseAmount: 100, calories: 161, protein: 18, fat: 10, carbs: 1, fiber: 0 },
  { name: "Kassler (Aufschnitt)", baseUnit: "100g", baseAmount: 100, calories: 120, protein: 20, fat: 4, carbs: 1, fiber: 0 },
  { name: "Kiwi", baseUnit: "100g", baseAmount: 100, calories: 61, protein: 1, fat: 1, carbs: 15, fiber: 3 },
  { name: "Kochschinken", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 19, fat: 3, carbs: 0, fiber: 0 },
  { name: "Kohlrabi", baseUnit: "100g", baseAmount: 100, calories: 27, protein: 2, fat: 0, carbs: 4, fiber: 2 },
  { name: "Kokosnuss", baseUnit: "100g", baseAmount: 100, calories: 354, protein: 3, fat: 33, carbs: 15, fiber: 9 },
  { name: "Kokosnusswasser", baseUnit: "100ml", baseAmount: 100, calories: 19, protein: 1, fat: 0, carbs: 4, fiber: 0, liquidMl: 100 },
  { name: "Kokosraspel", baseUnit: "100g", baseAmount: 100, calories: 606, protein: 7, fat: 62, carbs: 6, fiber: 15 },
  { name: "Kokosöl", baseUnit: "100ml", baseAmount: 100, calories: 862, protein: 0, fat: 99, carbs: 0, fiber: 0 },
  { name: "Krakauer", baseUnit: "100g", baseAmount: 100, calories: 285, protein: 14, fat: 25, carbs: 1, fiber: 0 },
  { name: "Kräuterseitlinge", baseUnit: "100g", baseAmount: 100, calories: 26, protein: 3, fat: 0, carbs: 5, fiber: 1 },
  { name: "Kürbiskerne", baseUnit: "100g", baseAmount: 100, calories: 559, protein: 30, fat: 49, carbs: 11, fiber: 6 },
  { name: "Kürbiskernöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Lammfilet", baseUnit: "100g", baseAmount: 100, calories: 110, protein: 21, fat: 3, carbs: 0, fiber: 0 },
  { name: "Lammkeule", baseUnit: "100g", baseAmount: 100, calories: 185, protein: 18, fat: 12, carbs: 0, fiber: 0 },
  { name: "Lammkotelett", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 17, fat: 20, carbs: 0, fiber: 0 },
  { name: "Lammrücken", baseUnit: "100g", baseAmount: 100, calories: 118, protein: 21, fat: 4, carbs: 0, fiber: 0 },
  { name: "Landjäger", baseUnit: "100g", baseAmount: 100, calories: 472, protein: 23, fat: 42, carbs: 1, fiber: 0 },
  { name: "Lauchzwiebel", baseUnit: "100g", baseAmount: 100, calories: 32, protein: 2, fat: 0, carbs: 4, fiber: 3 },
  { name: "Leberwurst (fein)", baseUnit: "100g", baseAmount: 100, calories: 324, protein: 12, fat: 30, carbs: 1, fiber: 0 },
  { name: "Leerdammer 45 %", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 27, fat: 27, carbs: 0, fiber: 0 },
  { name: "Leinsamenöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Limette", baseUnit: "100g", baseAmount: 100, calories: 30, protein: 1, fat: 0, carbs: 11, fiber: 3 },
  { name: "Litschi", baseUnit: "100g", baseAmount: 100, calories: 66, protein: 1, fat: 0, carbs: 17, fiber: 1 },
  { name: "Lupinenschrot", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 36, fat: 9, carbs: 12, fiber: 28 },
  { name: "Lyoner", baseUnit: "100g", baseAmount: 100, calories: 258, protein: 12, fat: 23, carbs: 1, fiber: 0 },
  { name: "Macadamianüsse", baseUnit: "100g", baseAmount: 100, calories: 718, protein: 8, fat: 76, carbs: 14, fiber: 9 },
  { name: "Magerquark 0,2 %", baseUnit: "100g", baseAmount: 100, calories: 67, protein: 12, fat: 0, carbs: 4, fiber: 0 },
  { name: "Makrele", baseUnit: "100g", baseAmount: 100, calories: 205, protein: 19, fat: 14, carbs: 0, fiber: 0 },
  { name: "Malzbier", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10, fiber: 0, liquidMl: 100 },
  { name: "Mandarine", baseUnit: "100g", baseAmount: 100, calories: 53, protein: 1, fat: 0, carbs: 13, fiber: 2 },
  { name: "Mandeln", baseUnit: "100g", baseAmount: 100, calories: 579, protein: 21, fat: 50, carbs: 22, fiber: 13 },
  { name: "Mango", baseUnit: "100g", baseAmount: 100, calories: 60, protein: 1, fat: 0, carbs: 15, fiber: 2 },
  { name: "Maracuja", baseUnit: "100g", baseAmount: 100, calories: 97, protein: 2, fat: 1, carbs: 23, fiber: 10 },
  { name: "Matjesfilet", baseUnit: "100g", baseAmount: 100, calories: 263, protein: 14, fat: 22, carbs: 0, fiber: 0 },
  { name: "Melone Cantaloupe", baseUnit: "100g", baseAmount: 100, calories: 34, protein: 1, fat: 0, carbs: 8, fiber: 1 },
  { name: "Mezzo Mix", baseUnit: "100ml", baseAmount: 100, calories: 43, protein: 0, fat: 0, carbs: 10, fiber: 0, liquidMl: 100 },
  { name: "Melone Wasser", baseUnit: "100g", baseAmount: 100, calories: 30, protein: 1, fat: 0, carbs: 8, fiber: 0 },
  { name: "Mettwurst", baseUnit: "100g", baseAmount: 100, calories: 330, protein: 18, fat: 28, carbs: 1, fiber: 0 },
  { name: "Milch 0,1 %", baseUnit: "100ml", baseAmount: 100, calories: 35, protein: 3, fat: 0, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Miesmuscheln", baseUnit: "100g", baseAmount: 100, calories: 73, protein: 12, fat: 2, carbs: 2, fiber: 0 },
  { name: "Mineralwasser", baseUnit: "100ml", baseAmount: 100, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, liquidMl: 100 },
  { name: "Milch 1,5 %", baseUnit: "100ml", baseAmount: 100, calories: 47, protein: 3, fat: 2, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Milch (3,8%)", baseUnit: "100ml", baseAmount: 100, calories: 64, protein: 3, fat: 4, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Milch 3,5 %", baseUnit: "100ml", baseAmount: 100, calories: 64, protein: 3, fat: 4, carbs: 5, fiber: 0, liquidMl: 100 },
  { name: "Milchkaffee", baseUnit: "1 Tasse", baseAmount: 1, calories: 60, protein: 2, fat: 3, carbs: 4, fiber: 0, defaultAmount: 1, liquidMl: 280 },
  { name: "Mini Harzer", baseUnit: "100g", baseAmount: 100, calories: 121, protein: 29, fat: 1, carbs: 0, fiber: 0 },
  { name: "Marmelade", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 0, fat: 0, carbs: 60, fiber: 1 },
  { name: "Mehl", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 10, fat: 1, carbs: 70, fiber: 3 },
  { name: "Möhren", baseUnit: "100g", baseAmount: 100, calories: 41, protein: 1, fat: 0, carbs: 5, fiber: 3 },
  { name: "Monster Energy", baseUnit: "100ml", baseAmount: 100, calories: 47, protein: 0, fat: 0, carbs: 12, fiber: 0, liquidMl: 100 },
  { name: "Mortadella", baseUnit: "100g", baseAmount: 100, calories: 311, protein: 12, fat: 29, carbs: 0, fiber: 0 },
  { name: "Mountain Dew", baseUnit: "100ml", baseAmount: 100, calories: 48, protein: 0, fat: 0, carbs: 12, fiber: 0, liquidMl: 100 },
  { name: "Multivitaminsaft", baseUnit: "100ml", baseAmount: 100, calories: 48, protein: 1, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Mozzarella 8 %", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 19, fat: 9, carbs: 2, fiber: 0 },
  { name: "Mozzarella 20 %", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 18, fat: 22, carbs: 2, fiber: 0 },
  { name: "Nektarine", baseUnit: "100g", baseAmount: 100, calories: 44, protein: 1, fat: 0, carbs: 11, fiber: 2 },
  { name: "Norwegischer Lachs", baseUnit: "100g", baseAmount: 100, calories: 202, protein: 20, fat: 13, carbs: 0, fiber: 0 },
  { name: "Nudeln", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 12, fat: 2, carbs: 71, fiber: 3 },
  { name: "Nürnberger Rostbratwurst", baseUnit: "100g", baseAmount: 100, calories: 312, protein: 14, fat: 28, carbs: 1, fiber: 0 },
  { name: "Olivenöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Orange", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 1, fat: 0, carbs: 12, fiber: 2 },
  { name: "Orangensaft", baseUnit: "100ml", baseAmount: 100, calories: 45, protein: 1, fat: 0, carbs: 10, fiber: 0, liquidMl: 100 },
  { name: "Papaya", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1, fat: 0, carbs: 11, fiber: 2 },
  { name: "Paprika (grün/gelb)", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1, fat: 0, carbs: 5, fiber: 4 },
  { name: "Paprika (rot)", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1, fat: 0, carbs: 9, fiber: 3 },
  { name: "Paprikalyoner", baseUnit: "100g", baseAmount: 100, calories: 245, protein: 11, fat: 22, carbs: 2, fiber: 0 },
  { name: "Paranüsse", baseUnit: "100g", baseAmount: 100, calories: 659, protein: 14, fat: 66, carbs: 12, fiber: 8 },
  { name: "Parmesan 32 %", baseUnit: "100g", baseAmount: 100, calories: 431, protein: 38, fat: 29, carbs: 4, fiber: 0 },
  { name: "Pastinaken", baseUnit: "100g", baseAmount: 100, calories: 75, protein: 1, fat: 1, carbs: 12, fiber: 5 },
  { name: "Paulaner Spezi", baseUnit: "100ml", baseAmount: 100, calories: 35, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Pekannüsse", baseUnit: "100g", baseAmount: 100, calories: 691, protein: 9, fat: 72, carbs: 14, fiber: 10 },
  { name: "Pepsi", baseUnit: "100ml", baseAmount: 100, calories: 43, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Pfirsich", baseUnit: "100g", baseAmount: 100, calories: 39, protein: 1, fat: 0, carbs: 10, fiber: 2 },
  { name: "Pflaume", baseUnit: "100g", baseAmount: 100, calories: 46, protein: 1, fat: 0, carbs: 11, fiber: 1 },
  { name: "Physalis", baseUnit: "100g", baseAmount: 100, calories: 72, protein: 2, fat: 0, carbs: 11, fiber: 4 },
  { name: "Pinienkerne", baseUnit: "100g", baseAmount: 100, calories: 673, protein: 14, fat: 68, carbs: 13, fiber: 4 },
  { name: "Pistazien", baseUnit: "100g", baseAmount: 100, calories: 562, protein: 20, fat: 45, carbs: 28, fiber: 10 },
  { name: "Porree (Lauch)", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 2, fat: 0, carbs: 7, fiber: 3 },
  { name: "Presssack (rot)", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 14, fat: 25, carbs: 0, fiber: 0 },
  { name: "Proteinpulver", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 76, fat: 4, carbs: 4, fiber: 0 },
  { name: "Putenbrust", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 24, fat: 1, carbs: 0, fiber: 0 },
  { name: "Putenbrust (Aufschnitt)", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 22, fat: 2, carbs: 1, fiber: 0 },
  { name: "Putenfleisch", baseUnit: "100g", baseAmount: 100, calories: 147, protein: 30, fat: 3, carbs: 0, fiber: 0 },
  { name: "Putenoberkeule", baseUnit: "100g", baseAmount: 100, calories: 145, protein: 20, fat: 7, carbs: 0, fiber: 0 },
  { name: "Putensteak", baseUnit: "100g", baseAmount: 100, calories: 108, protein: 23, fat: 2, carbs: 0, fiber: 0 },
  { name: "Quark 20 %", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 11, fat: 5, carbs: 3, fiber: 0 },
  { name: "Quark 40 %", baseUnit: "100g", baseAmount: 100, calories: 150, protein: 9, fat: 11, carbs: 3, fiber: 0 },
  { name: "Quinoa", baseUnit: "100g", baseAmount: 100, calories: 370, protein: 14, fat: 6, carbs: 59, fiber: 7 },
  { name: "Quitte", baseUnit: "100g", baseAmount: 100, calories: 57, protein: 0, fat: 0, carbs: 15, fiber: 2 },
  { name: "Radieschen", baseUnit: "100g", baseAmount: 100, calories: 16, protein: 1, fat: 0, carbs: 2, fiber: 2 },
  { name: "Radler (alkoholfrei)", baseUnit: "100ml", baseAmount: 100, calories: 25, protein: 0, fat: 0, carbs: 6, fiber: 0, liquidMl: 100 },
  { name: "Rapsöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Red Bull", baseUnit: "100ml", baseAmount: 100, calories: 45, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Red Bull Energy", baseUnit: "100ml", baseAmount: 100, calories: 45, protein: 0, fat: 0, carbs: 11, fiber: 0, liquidMl: 100 },
  { name: "Regenbogen-Forelle", baseUnit: "100g", baseAmount: 100, calories: 139, protein: 20, fat: 6, carbs: 0, fiber: 0 },
  { name: "Reis", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 7, fat: 1, carbs: 78, fiber: 1 },
  { name: "Rhabarber", baseUnit: "100g", baseAmount: 100, calories: 21, protein: 1, fat: 0, carbs: 5, fiber: 2 },
  { name: "Rotbarsch", baseUnit: "100g", baseAmount: 100, calories: 103, protein: 18, fat: 4, carbs: 0, fiber: 0 },
  { name: "Ricotta 13 %", baseUnit: "100g", baseAmount: 100, calories: 174, protein: 11, fat: 13, carbs: 3, fiber: 0 },
  { name: "Rinderfilet", baseUnit: "100g", baseAmount: 100, calories: 121, protein: 21, fat: 4, carbs: 0, fiber: 0 },
  { name: "Rindergulasch", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 21, fat: 4, carbs: 0, fiber: 0 },
  { name: "Rinderhackfleisch", baseUnit: "100g", baseAmount: 100, calories: 232, protein: 19, fat: 17, carbs: 0, fiber: 0 },
  { name: "Rinderhüfte", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 22, fat: 3, carbs: 0, fiber: 0 },
  { name: "Rindersalami", baseUnit: "100g", baseAmount: 100, calories: 315, protein: 24, fat: 24, carbs: 1, fiber: 0 },
  { name: "Roastbeef", baseUnit: "100g", baseAmount: 100, calories: 135, protein: 22, fat: 5, carbs: 0, fiber: 0 },
  { name: "Romanasalat", baseUnit: "100g", baseAmount: 100, calories: 16, protein: 1, fat: 0, carbs: 2, fiber: 2 },
  { name: "Rosenkohl", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 4, fat: 0, carbs: 9, fiber: 4 },
  { name: "Rote Bete (Glas)", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 1, fat: 0, carbs: 7, fiber: 2 },
  { name: "Rote Bete (vorgegart)", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 2, fat: 0, carbs: 10, fiber: 3 },
  { name: "Rotkohl", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 2, fat: 0, carbs: 7, fiber: 3 },
  { name: "Salami", baseUnit: "100g", baseAmount: 100, calories: 380, protein: 20, fat: 33, carbs: 1, fiber: 0 },
  { name: "Sanddornbeeren", baseUnit: "100g", baseAmount: 100, calories: 90, protein: 1, fat: 7, carbs: 6, fiber: 3 },
  { name: "Sardinen (abgetr.)", baseUnit: "100g", baseAmount: 100, calories: 188, protein: 24, fat: 10, carbs: 0, fiber: 0 },
  { name: "Sauerkirschen", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1, fat: 0, carbs: 12, fiber: 1 },
  { name: "Sauerkraut", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 2, fat: 0, carbs: 2, fiber: 2 },
  { name: "Schafskäse 45 %", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 16, fat: 23, carbs: 1, fiber: 0 },
  { name: "Schinken (gekocht)", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 20, fat: 4, carbs: 1, fiber: 0 },
  { name: "Schokolade Dunkel (70%)", baseUnit: "100g", baseAmount: 100, calories: 595, protein: 9, fat: 44, carbs: 34, fiber: 11 },
  { name: "Schokolade Dunkel (85%)", baseUnit: "100g", baseAmount: 100, calories: 610, protein: 10, fat: 50, carbs: 19, fiber: 15 },
  { name: "Schokolade Dunkel (100%)", baseUnit: "100g", baseAmount: 100, calories: 620, protein: 12, fat: 53, carbs: 12, fiber: 17 },
  { name: "Schokolade Erdbeer-Joghurt", baseUnit: "100g", baseAmount: 100, calories: 570, protein: 7, fat: 38, carbs: 49, fiber: 1 },
  { name: "Schokolade Haselnuss", baseUnit: "100g", baseAmount: 100, calories: 560, protein: 8, fat: 37, carbs: 47, fiber: 4 },
  { name: "Schokolade Keks & Crunch", baseUnit: "100g", baseAmount: 100, calories: 545, protein: 6, fat: 32, carbs: 58, fiber: 2 },
  { name: "Schokolade Mandelsplitter", baseUnit: "100g", baseAmount: 100, calories: 555, protein: 9, fat: 36, carbs: 48, fiber: 4 },
  { name: "Schokolade Marzipan", baseUnit: "100g", baseAmount: 100, calories: 495, protein: 6, fat: 27, carbs: 55, fiber: 4 },
  { name: "Schokolade Noisette", baseUnit: "100g", baseAmount: 100, calories: 550, protein: 8, fat: 35, carbs: 52, fiber: 3 },
  { name: "Schokolade Nougat", baseUnit: "100g", baseAmount: 100, calories: 540, protein: 7, fat: 33, carbs: 54, fiber: 2 },
  { name: "Schokolade Vollmilch", baseUnit: "100g", baseAmount: 100, calories: 535, protein: 7, fat: 30, carbs: 59, fiber: 2 },
  { name: "Schokolade Weiß", baseUnit: "100g", baseAmount: 100, calories: 540, protein: 6, fat: 32, carbs: 58, fiber: 0 },
  { name: "Scholle", baseUnit: "100g", baseAmount: 100, calories: 86, protein: 17, fat: 2, carbs: 0, fiber: 0 },
  { name: "Schinkenpeperoni", baseUnit: "100g", baseAmount: 100, calories: 210, protein: 16, fat: 14, carbs: 4, fiber: 0 },
  { name: "Schwarzwälder Schinken", baseUnit: "100g", baseAmount: 100, calories: 251, protein: 26, fat: 16, carbs: 1, fiber: 0 },
  { name: "Schweinebauch", baseUnit: "100g", baseAmount: 100, calories: 300, protein: 15, fat: 27, carbs: 0, fiber: 0 },
  { name: "Schweinefilet", baseUnit: "100g", baseAmount: 100, calories: 106, protein: 21, fat: 2, carbs: 0, fiber: 0 },
  { name: "Schweinegeschnetzeltes", baseUnit: "100g", baseAmount: 100, calories: 120, protein: 21, fat: 4, carbs: 0, fiber: 0 },
  { name: "Schweinegulasch", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 20, fat: 9, carbs: 0, fiber: 0 },
  { name: "Schweinekotelett", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 20, fat: 9, carbs: 0, fiber: 0 },
  { name: "Schweinenacken", baseUnit: "100g", baseAmount: 100, calories: 210, protein: 18, fat: 15, carbs: 0, fiber: 0 },
  { name: "Schweineschnitzel (Oberschale)", baseUnit: "100g", baseAmount: 100, calories: 114, protein: 22, fat: 3, carbs: 0, fiber: 0 },
  { name: "Schweppes Tonic", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Seelachs", baseUnit: "100g", baseAmount: 100, calories: 81, protein: 18, fat: 1, carbs: 0, fiber: 0 },
  { name: "Sellerie (Stauden)", baseUnit: "100g", baseAmount: 100, calories: 16, protein: 1, fat: 0, carbs: 2, fiber: 2 },
  { name: "Senf", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 6, fat: 7, carbs: 7, fiber: 0 },
  { name: "Serrano Schinken", baseUnit: "100g", baseAmount: 100, calories: 232, protein: 30, fat: 12, carbs: 1, fiber: 0 },
  { name: "Sesamöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Sonnenblumenkerne", baseUnit: "100g", baseAmount: 100, calories: 584, protein: 21, fat: 51, carbs: 20, fiber: 9 },
  { name: "Sonnenblumenöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Spezi", baseUnit: "100ml", baseAmount: 100, calories: 43, protein: 0, fat: 0, carbs: 10, fiber: 0, liquidMl: 100 },
  { name: "Spitzkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 2, fat: 0, carbs: 3, fiber: 3 },
  { name: "Sprite", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Stachelbeeren", baseUnit: "100g", baseAmount: 100, calories: 44, protein: 1, fat: 0, carbs: 10, fiber: 3 },
  { name: "Sucuk", baseUnit: "100g", baseAmount: 100, calories: 332, protein: 17, fat: 29, carbs: 1, fiber: 0 },
  { name: "Suppengrün", baseUnit: "100g", baseAmount: 100, calories: 35, protein: 1, fat: 0, carbs: 5, fiber: 3 },
  { name: "Süßkartoffeln", baseUnit: "100g", baseAmount: 100, calories: 86, protein: 2, fat: 0, carbs: 20, fiber: 3 },
  { name: "Süßkirschen", baseUnit: "100g", baseAmount: 100, calories: 63, protein: 1, fat: 0, carbs: 16, fiber: 2 },
  { name: "Tafelspitz (Rind)", baseUnit: "100g", baseAmount: 100, calories: 190, protein: 19, fat: 13, carbs: 0, fiber: 0 },
  { name: "Teewurst", baseUnit: "100g", baseAmount: 100, calories: 417, protein: 10, fat: 41, carbs: 1, fiber: 0 },
  { name: "Thunfisch (Dose)", baseUnit: "100g", baseAmount: 100, calories: 109, protein: 25, fat: 1, carbs: 0, fiber: 0 },
  { name: "Thunfisch (frisch)", baseUnit: "100g", baseAmount: 100, calories: 144, protein: 23, fat: 5, carbs: 0, fiber: 0 },
  { name: "Tilsiter 30 %", baseUnit: "100g", baseAmount: 100, calories: 260, protein: 28, fat: 15, carbs: 1, fiber: 0 },
  { name: "Tilsiter 45 %", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 25, fat: 26, carbs: 0, fiber: 0 },
  { name: "Tintenfisch (Calamari)", baseUnit: "100g", baseAmount: 100, calories: 85, protein: 16, fat: 1, carbs: 1, fiber: 0 },
  { name: "TK-Heidelbeeren", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1, fat: 1, carbs: 7, fiber: 5 },
  { name: "Tomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 1, fat: 0, carbs: 4, fiber: 2 },
  { name: "Tomatenketchup", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 1, fat: 0, carbs: 23, fiber: 0 },
  { name: "Tomatensaft", baseUnit: "100ml", baseAmount: 100, calories: 17, protein: 1, fat: 0, carbs: 3, fiber: 1, liquidMl: 100 },
  { name: "Tonic Water", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 0, fat: 0, carbs: 9, fiber: 0, liquidMl: 100 },
  { name: "Traubenkernöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Traubensaft", baseUnit: "100ml", baseAmount: 100, calories: 67, protein: 0, fat: 0, carbs: 16, fiber: 0, liquidMl: 100 },
  { name: "Vollkornbrot", baseUnit: "100g", baseAmount: 100, calories: 218, protein: 7, fat: 1, carbs: 41, fiber: 28 },
  { name: "Vollkornmehl", baseUnit: "100g", baseAmount: 100, calories: 325, protein: 13, fat: 2, carbs: 60, fiber: 11 },
  { name: "Vollkornnudeln", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 13, fat: 3, carbs: 63, fiber: 10 },
  { name: "Walnüsse", baseUnit: "100g", baseAmount: 100, calories: 654, protein: 15, fat: 65, carbs: 14, fiber: 7 },
  { name: "Walnussöl", baseUnit: "100ml", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  { name: "Wasser", baseUnit: "100g", baseAmount: 100, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  { name: "Weintrauben", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 1, fat: 0, carbs: 18, fiber: 1 },
  { name: "Weintrauben rot", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 1, fat: 0, carbs: 16, fiber: 2 },
  { name: "Weiße Bohnen (Dose)", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 7, fat: 0, carbs: 13, fiber: 17 },
  { name: "Weiße Bohnen (Lidl)", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 7, fat: 0, carbs: 13, fiber: 17 },
  { name: "Weißkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 1, fat: 0, carbs: 4, fiber: 3 },
  { name: "Wels", baseUnit: "100g", baseAmount: 100, calories: 164, protein: 15, fat: 11, carbs: 0, fiber: 0 },
  { name: "Weißwurst", baseUnit: "100g", baseAmount: 100, calories: 258, protein: 11, fat: 24, carbs: 1, fiber: 0 },
  { name: "Wiener Würstchen", baseUnit: "100g", baseAmount: 100, calories: 272, protein: 12, fat: 25, carbs: 1, fiber: 0 },
  { name: "Wirsing", baseUnit: "100g", baseAmount: 100, calories: 27, protein: 3, fat: 0, carbs: 2, fiber: 3 },
  { name: "Ziegenkäse", baseUnit: "100g", baseAmount: 100, calories: 286, protein: 20, fat: 23, carbs: 1, fiber: 0 },
  { name: "Ziegenkäse 45 %", baseUnit: "100g", baseAmount: 100, calories: 300, protein: 18, fat: 25, carbs: 1, fiber: 0 },
  { name: "Zitrone", baseUnit: "100g", baseAmount: 100, calories: 29, protein: 1, fat: 0, carbs: 9, fiber: 3 },
  { name: "Zitronensaft", baseUnit: "100ml", baseAmount: 100, calories: 30, protein: 0, fat: 0, carbs: 3, fiber: 0, liquidMl: 100 },
  { name: "Zucchini", baseUnit: "100g", baseAmount: 100, calories: 17, protein: 1, fat: 0, carbs: 2, fiber: 1 },
  { name: "Zucker", baseUnit: "100g", baseAmount: 100, calories: 400, protein: 0, fat: 0, carbs: 100, fiber: 0 },
  { name: "Zwetschge", baseUnit: "100g", baseAmount: 100, calories: 45, protein: 1, fat: 0, carbs: 10, fiber: 2 },
  { name: "Zwiebelmettwurst", baseUnit: "100g", baseAmount: 100, calories: 218, protein: 15, fat: 17, carbs: 1, fiber: 0 },
  { name: "Zander", baseUnit: "100g", baseAmount: 100, calories: 84, protein: 19, fat: 1, carbs: 0, fiber: 0 },
  { name: "Zwiebeln", baseUnit: "100g", baseAmount: 100, calories: 28, protein: 1, fat: 0, carbs: 6, fiber: 2 },
];

function loadFoodDatabase(): FoodItem[] {
  try {
    const raw = localStorage.getItem(FOOD_DB_KEY);
    const deletedFoods = loadDeletedFoods();

    if (!raw) {
      // First run: filter out any previously deleted items
      const initial = DEFAULT_FOODS.filter(f => !deletedFoods.has(f.name.toLowerCase()));
      localStorage.setItem(FOOD_DB_KEY, JSON.stringify(initial));
      return [...initial];
    }
    const stored: FoodItem[] = JSON.parse(raw);

    // Build a map of stored items by name (lowercase)
    const storedMap = new Map(stored.map((f) => [f.name.toLowerCase(), f]));

    // For each DEFAULT_FOOD:
    // - if deleted by user → skip entirely
    // - if not in stored → add it
    // - if in stored but NOT user-created → overwrite with updated DEFAULT values
    let changed = false;
    for (const def of DEFAULT_FOODS) {
      const key = def.name.toLowerCase();
      if (deletedFoods.has(key)) {
        // User explicitly deleted this → remove if still present
        if (storedMap.has(key)) {
          storedMap.delete(key);
          changed = true;
        }
        continue;
      }
      const existing = storedMap.get(key);
      if (!existing) {
        storedMap.set(key, { ...def });
        changed = true;
      } else if (!existing.isUserCreated) {
        const updated: FoodItem = {
          ...def,
          ...(existing.defaultAmount !== undefined ? { defaultAmount: existing.defaultAmount } : {}),
          isUserCreated: false,
        };
        storedMap.set(key, updated);
        changed = true;
      }
    }

    const merged = Array.from(storedMap.values());
    if (changed) {
      localStorage.setItem(FOOD_DB_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {}
  return [...DEFAULT_FOODS];
}

export function saveFoodDatabase(items: FoodItem[]): void {
  localStorage.setItem(FOOD_DB_KEY, JSON.stringify(items));
}

export const foodDatabase: FoodItem[] = loadFoodDatabase();

export function addFoodItem(item: FoodItem): void {
  if (!foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
    // If user adds an item back, remove from deleted blacklist
    unmarkFoodDeleted(item.name);
    foodDatabase.push(item);
    saveFoodDatabase(foodDatabase);
  }
}

export function removeFoodItem(name: string): void {
  const index = foodDatabase.findIndex((f) => f.name === name);
  if (index >= 0) {
    // Track deletion so DEFAULT_FOODS and remote sync don't re-add it
    markFoodDeleted(name);
    foodDatabase.splice(index, 1);
    saveFoodDatabase(foodDatabase);
  }
}

export function clearFoodDatabase(): number {
  const count = foodDatabase.length;
  foodDatabase.splice(0, foodDatabase.length);
  saveFoodDatabase(foodDatabase);
  return count;
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

export function reloadFoodDatabase(): void {
  try {
    const data = localStorage.getItem(FOOD_DB_KEY);
    if (data) {
      const items: FoodItem[] = JSON.parse(data);
      foodDatabase.splice(0, foodDatabase.length, ...items);
    }
  } catch {}
}

// ---- Unit management (persistent) ----
const UNIT_KEY = "mampflogger-units";

const DEFAULT_UNITS = ["100g", "100ml", "1 Stk", "1 Tasse", "1 Scheibe", "1 Portion"];

export function loadUnits(): string[] {
  try {
    const data = localStorage.getItem(UNIT_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  // First run: persist the defaults
  saveUnits(DEFAULT_UNITS);
  return [...DEFAULT_UNITS];
}

export function saveUnits(units: string[]): void {
  localStorage.setItem(UNIT_KEY, JSON.stringify(units));
}

export function deleteUnit(unit: string): void {
  if (unit === "100g") return; // protected
  const units = loadUnits().filter(u => u !== unit);
  saveUnits(units);
  // Reset foods using this unit to 100g
  foodDatabase.forEach(f => {
    if (f.baseUnit === unit) { f.baseUnit = "100g"; f.baseAmount = 100; }
  });
  saveFoodDatabase(foodDatabase);
}

export function addUnit(unit: string): void {
  const units = loadUnits();
  if (!units.includes(unit)) {
    units.push(unit);
    saveUnits(units);
  }
}

// ---- Usage tracking ----
const USAGE_KEY = "mampflogger-food-usage";

export function loadFoodUsage(): Record<string, number> {
  try {
    const data = localStorage.getItem(USAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function trackFoodUsage(foodName: string): void {
  const usage = loadFoodUsage();
  const key = foodName.toLowerCase();
  usage[key] = (usage[key] ?? 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export function getFoodUsageCount(foodName: string): number {
  const usage = loadFoodUsage();
  return usage[foodName.toLowerCase()] ?? 0;
}

export function searchFood(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const usage = loadFoodUsage();

  const matches = foodDatabase.filter((item) =>
    item.name.toLowerCase().includes(lower)
  );

  // Sort: items used before come first (desc), then alphabetically
  matches.sort((a, b) => {
    const ua = usage[a.name.toLowerCase()] ?? 0;
    const ub = usage[b.name.toLowerCase()] ?? 0;
    if (ub !== ua) return ub - ua;
    return a.name.localeCompare(b.name, "de");
  });

  return matches.slice(0, 10);
}
