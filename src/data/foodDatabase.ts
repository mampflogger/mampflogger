import defaultFoodsCsv from "@/data/defaultFoods.csv?raw";
import { supabase } from "@/integrations/supabase/client";

export const FOOD_CATEGORIES = [
  "Fleisch&Wurst",
  "Fisch&Meeresfrüchte",
  "Käse",
  "Nüsse&Samen",
  "Gemüse",
  "Brot&Teigwaren",
  "Öle&Fette",
  "Getränke",
  "Obst",
  "Milchprodukte",
  "Süßwaren",
  "Sonstiges",
  "Eigene",
  "Fertiggerichte",
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

export interface FoodVitamins {
  vitA?: number;
  vitB1?: number;
  vitB2?: number;
  vitB3?: number;
  vitB5?: number;
  vitB6?: number;
  vitB7?: number;
  vitB9?: number;
  vitB12?: number;
  vitC?: number;
  vitD?: number;
  vitE?: number;
  vitK?: number;
}

export interface FoodMinerals {
  calcium?: number;
  chlorid?: number;
  eisen?: number;
  fluorid?: number;
  kalium?: number;
  kupfer?: number;
  magnesium?: number;
  mangan?: number;
  natrium?: number;
  phosphor?: number;
  schwefel?: number;
  zink?: number;
}

export interface FoodDietaryFlags {
  vgn?: boolean; // Vegan
  vgt?: boolean; // Vegetarisch
  lc?: boolean;  // Low Carb
  hp?: boolean;  // High Protein
  ket?: boolean; // Keto
  gf?: boolean;  // Glutenfrei
  lf?: boolean;  // Laktosefrei
  zf?: boolean;  // Zuckerfrei
}

export const DIETARY_FLAG_LABELS: Record<keyof FoodDietaryFlags, string> = {
  vgn: "Vegan",
  vgt: "Vegetarisch",
  lc: "Low Carb",
  hp: "High Protein",
  ket: "Keto",
  gf: "Glutenfrei",
  lf: "Laktosefrei",
  zf: "Zuckerfrei",
};

export const DIETARY_FLAG_KEYS = ["vgn","vgt","lc","hp","ket","gf","lf","zf"] as const;

export interface FoodItem {
  name: string;
  baseUnit: string;
  baseAmount: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  gi?: number;
  defaultAmount?: number;
  liquidMl?: number;
  category?: FoodCategory;
  isUserCreated?: boolean;
  isRemote?: boolean;
  notes?: string;
  vitamins?: FoodVitamins;
  minerals?: FoodMinerals;
  dietary?: FoodDietaryFlags;
}

const VITAMIN_KEYS = ["vitA","vitB1","vitB2","vitB3","vitB5","vitB6","vitB7","vitB9","vitB12","vitC","vitD","vitE","vitK"] as const;
const MINERAL_KEYS = ["calcium","chlorid","eisen","fluorid","kalium","kupfer","magnesium","mangan","natrium","phosphor","schwefel","zink"] as const;

/** Parse the embedded CSV into DEFAULT_FOODS at module load time */
function parseDefaultFoodsCsv(csv: string): FoodItem[] {
  const lines = csv.trim().split("\n");
  const items: FoodItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name) continue;

    const baseUnit = cols[1] || "100g";
    const baseAmount = baseUnit.includes("Stk") ? 1 : 100;
    const gi = cols[7] ? parseFloat(cols[7]) : undefined;
    const defaultAmountRaw = cols[8] ? parseFloat(cols[8]) : undefined;
    const liquidMlRaw = cols[9] ? parseFloat(cols[9]) : undefined;
    const category = cols[10] || undefined;
    const notes = cols[11] ? cols[11].replace(/\\n/g, "\n") : undefined;

    const vitamins: FoodVitamins = {};
    let hasVitamins = false;
    VITAMIN_KEYS.forEach((k, idx) => {
      const v = cols[12 + idx] ? parseFloat(cols[12 + idx]) : undefined;
      if (v !== undefined && !isNaN(v) && v > 0) { (vitamins as any)[k] = v; hasVitamins = true; }
    });

    const minerals: FoodMinerals = {};
    let hasMinerals = false;
    MINERAL_KEYS.forEach((k, idx) => {
      const v = cols[25 + idx] ? parseFloat(cols[25 + idx]) : undefined;
      if (v !== undefined && !isNaN(v) && v > 0) { (minerals as any)[k] = v; hasMinerals = true; }
    });

    // Dietary flags start at column 37 (after 12 mineral cols starting at 25)
    const dietary: FoodDietaryFlags = {};
    let hasDietary = false;
    DIETARY_FLAG_KEYS.forEach((k, idx) => {
      const val = cols[37 + idx]?.toUpperCase();
      if (val === "J" || val === "N") {
        (dietary as any)[k] = val === "J";
        hasDietary = true;
      }
    });

    items.push({
      name,
      baseUnit,
      baseAmount,
      calories: parseFloat(cols[2]) || 0,
      protein: parseFloat(cols[3]) || 0,
      fat: parseFloat(cols[4]) || 0,
      carbs: parseFloat(cols[5]) || 0,
      fiber: parseFloat(cols[6]) || 0,
      ...(gi !== undefined && !isNaN(gi) && gi > 0 ? { gi } : {}),
      defaultAmount: defaultAmountRaw && !isNaN(defaultAmountRaw) ? defaultAmountRaw : undefined,
      liquidMl: liquidMlRaw && !isNaN(liquidMlRaw) ? liquidMlRaw : undefined,
      ...(category ? { category: category as FoodCategory } : {}),
      ...(notes ? { notes } : {}),
      ...(hasVitamins ? { vitamins } : {}),
      ...(hasMinerals ? { minerals } : {}),
      ...(hasDietary ? { dietary } : {}),
    });
  }
  return items;
}

export const DEFAULT_FOODS: FoodItem[] = parseDefaultFoodsCsv(defaultFoodsCsv);

/** Smart category guesser: checks exact match, then keyword-based heuristics. */
export function guessCategory(name: string, aiCategory?: string): FoodCategory {
  if (aiCategory && (FOOD_CATEGORIES as readonly string[]).includes(aiCategory)) {
    return aiCategory as FoodCategory;
  }
  // Check if a default food has this category
  const defaultItem = DEFAULT_FOODS.find(f => f.name === name);
  if (defaultItem?.category) return defaultItem.category;

  const lower = name.toLowerCase();
  const keywords: [string[], FoodCategory][] = [
    [["huhn", "hähn", "pute", "rind", "schwein", "lamm", "ente", "gans", "kalb", "wurst", "schinken", "speck", "hack", "filet", "steak", "braten", "gulasch", "schnitzel", "salami", "fleisch", "bacon", "reh", "hirsch", "wildschwein", "haxe", "keule", "roulade", "suppenhuhn", "sauerbraten", "karree"], "Fleisch&Wurst"],
    [["lachs", "forelle", "thunfisch", "kabeljau", "hering", "garnele", "shrimp", "muschel", "fisch", "scholle", "barsch", "karpfen", "dorsch", "sardine", "calamari", "tintenfisch", "dorade", "heilbutt", "makrele"], "Fisch&Meeresfrüchte"],
    [["käse", "parmesan", "mozzarella", "gouda", "edamer", "emmentaler", "cheddar", "feta", "brie", "camembert", "halloumi", "ricotta", "gorgonzola"], "Käse"],
    [["nuss", "nüsse", "mandel", "cashew", "pistazie", "walnuss", "erdnuss", "samen", "kerne", "pekan", "macadamia", "haselnuss", "paranuss"], "Nüsse&Samen"],
    [["salat", "spinat", "kohl", "brokkoli", "blumenkohl", "zucchini", "aubergine", "paprika", "tomate", "gurke", "karotte", "möhre", "lauch", "zwiebel", "knoblauch", "sellerie", "fenchel", "radieschen", "champignon", "pilz", "erbse", "bohne", "gemüse", "kartoffel", "süßkartoffel", "kürbis", "mais", "petersilie", "basilikum", "kräuter", "dill", "schnittlauch", "rosmarin", "thymian", "oregano", "kohlrabi", "rote bete"], "Gemüse"],
    [["brot", "nudel", "pasta", "spaghetti", "penne", "makkaroni", "reis", "mehl", "teig", "semmel", "brötchen", "toast", "couscous", "bulgur", "quinoa", "haferflocken", "müsli", "cornflakes", "tortilla", "wrap"], "Brot&Teigwaren"],
    [["öl", "fett", "butter", "margarine", "schmalz", "mayonnaise", "mayo"], "Öle&Fette"],
    [["saft", "cola", "limo", "wasser", "tee", "kaffee", "milchkaffee", "kakao", "brühe", "smoothie", "bier", "wein", "sekt", "energy", "mate"], "Getränke"],
    [["apfel", "birne", "banane", "orange", "zitrone", "limette", "kiwi", "mango", "ananas", "erdbeere", "himbeere", "blaubeere", "heidelbeere", "kirsche", "traube", "melone", "pflaume", "pfirsich", "aprikose", "obst", "beere"], "Obst"],
    [["joghurt", "quark", "milch", "sahne", "rahm", "skyr", "buttermilch", "kefir", "schmand", "crème fraîche", "molke"], "Milchprodukte"],
    [["schokolade", "gummibärchen", "bonbon", "keks", "kuchen", "eis", "zucker", "honig", "marmelade", "nutella", "süß"], "Süßwaren"],
    [["tiefkühlpizza", "fertiggericht", "pizza tk", "lasagne tk", "tk-pizza", "mikrowelle", "fertig-", "convenience", "tk ", "tiefkühl", "döner", "kebab", "burger", "asia-pfanne", "bami goreng", "nasi goreng", "cordon bleu", "cevapcici", "kroketten", "kartoffelpuffer", "wrap", "burrito", "hot dog", "chicken wings", "wedges", "taquitos", "backfisch", "rösti", "frikadellen", "cannelloni", "mac and cheese"], "Fertiggerichte"],
  ];
  for (const [words, cat] of keywords) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return "Eigene";
}

/** Lookup category for a food name */
export function getFoodCategory(name: string): FoodCategory | undefined {
  const def = DEFAULT_FOODS.find(f => f.name === name);
  return def?.category;
}

const FOOD_DB_KEY = "mampflogger-food-database";
const DELETED_FOODS_KEY = "mampflogger-deleted-foods";
const REMOTE_URL_KEY = "mampflogger-remote-url";
const LEGACY_AUTO_REMOTE_URL = "/lebensmittelliste.json";

function isRemoteSyncEnabled(): boolean {
  const stored = localStorage.getItem(REMOTE_URL_KEY)?.trim() || "";
  const isLegacyAutoUrl =
    !stored ||
    stored === LEGACY_AUTO_REMOTE_URL ||
    stored.includes("raw.githubusercontent.com/mampflogger") ||
    stored.includes("mampflogger.lovable.app");

  if (isLegacyAutoUrl) {
    // Migration cleanup: disable old auto-sync defaults
    localStorage.removeItem(REMOTE_URL_KEY);
    return false;
  }
  return true;
}

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

const LEGACY_FOOD_RENAMES: Record<string, string> = {
  "Bratwurst Geflügel": "Bratwurst (Geflügel)",
  "Bratwurst Lamm": "Bratwurst (Lamm)",
  "Bratwurst Rind": "Bratwurst (Rind)",
  "Bratwurst Schwein": "Bratwurst (Schwein)",
  "Appenzeller 50 %": "Appenzeller 50 % i. Tr.",
};

const REMOVED_FOOD_NAMES = new Set([
  "tafelspitz (rind)",
  "rinderbrust (tafelspitz)",
]);

function loadFoodDatabase(): FoodItem[] {

  try {
    const raw = localStorage.getItem(FOOD_DB_KEY);
    const deletedFoods = loadDeletedFoods();

    if (!raw) {
      // First run: filter out any previously deleted items
      const initial = DEFAULT_FOODS
        .filter(f => !deletedFoods.has(f.name.toLowerCase()))
        .map(f => ({ ...f, category: f.category || guessCategory(f.name) }));
      localStorage.setItem(FOOD_DB_KEY, JSON.stringify(initial));
      return [...initial];
    }
    const stored: FoodItem[] = JSON.parse(raw);

    let changed = false;
    const remoteSyncEnabled = isRemoteSyncEnabled();

    // Cleanup: remove stale remote items when remote sync is not configured,
    // and dedupe by case-insensitive name to avoid inflated base counts.
    const cleanedStored: FoodItem[] = [];
    const seenStoredNames = new Set<string>();
    for (const item of stored) {
      const key = item.name.toLowerCase();
      if (!remoteSyncEnabled && item.isRemote) {
        changed = true;
        continue;
      }
      if (seenStoredNames.has(key)) {
        changed = true;
        continue;
      }
      seenStoredNames.add(key);
      cleanedStored.push(item);
    }

    // Build a map of stored items by name (lowercase)
    const storedMap = new Map(cleanedStored.map((f) => [f.name.toLowerCase(), f]));

    // Migrate legacy names (rename + merge)
    for (const [legacyName, newName] of Object.entries(LEGACY_FOOD_RENAMES)) {
      const legacyKey = legacyName.toLowerCase();
      const newKey = newName.toLowerCase();
      const legacyItem = storedMap.get(legacyKey);
      if (!legacyItem) continue;

      if (!storedMap.has(newKey)) {
        storedMap.set(newKey, {
          ...legacyItem,
          name: newName,
          category: legacyItem.category || guessCategory(newName),
        });
      }

      storedMap.delete(legacyKey);
      changed = true;
    }

    // Remove deprecated defaults that should no longer appear
    for (const removedName of REMOVED_FOOD_NAMES) {
      if (storedMap.has(removedName)) {
        storedMap.delete(removedName);
        changed = true;
      }
    }

    // For each DEFAULT_FOOD:
    // - if deleted by user → skip entirely
    // - if not in stored → add it
    // - if in stored but NOT user-created → overwrite with updated DEFAULT values
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
        storedMap.set(key, { ...def, category: def.category || guessCategory(def.name) });
        changed = true;
      } else if (!existing.isUserCreated) {
        const updated: FoodItem = {
          ...def,
          category: def.category || guessCategory(def.name) || existing.category,
          ...(existing.defaultAmount !== undefined ? { defaultAmount: existing.defaultAmount } : {}),
          isUserCreated: false,
        };
        storedMap.set(key, updated);
        changed = true;
      }
    }

    // Migrate: apply categories to items that don't have one yet
    for (const [key, item] of storedMap) {
      if (!item.category) {
        const guessed = guessCategory(item.name);
        if (guessed !== "Eigene") { item.category = guessed; changed = true; }
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

/**
 * Normalize a food name for fuzzy comparison:
 * strips parenthetical qualifiers, common suffixes, and extra whitespace.
 */
function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")           // remove (roh), (ungekocht), etc.
    .replace(/\b(roh|ungekocht|trocken|gekocht|gegart|frisch|tiefgefroren|bio)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if an existing food item is essentially the same as a new one.
 * Matches on: normalized name similarity + calorie proximity (±15%).
 */
function findSimilarFood(item: FoodItem): FoodItem | undefined {
  const normalizedNew = normalizeFoodName(item.name);
  if (!normalizedNew) return undefined;

  // Normalize calories to per-100 basis for fair comparison
  const newCalPer100 = item.baseAmount > 0 ? (item.calories / item.baseAmount) * 100 : item.calories;

  for (const existing of foodDatabase) {
    const normalizedExisting = normalizeFoodName(existing.name);

    // Check name similarity: one contains the other, or they're identical after normalization
    const nameMatch =
      normalizedNew === normalizedExisting ||
      normalizedExisting.includes(normalizedNew) ||
      normalizedNew.includes(normalizedExisting);

    if (!nameMatch) continue;

    // Compare calories (per 100 basis) – within 15% tolerance
    const existCalPer100 = existing.baseAmount > 0 ? (existing.calories / existing.baseAmount) * 100 : existing.calories;
    if (existCalPer100 === 0 && newCalPer100 === 0) return existing;
    const maxCal = Math.max(existCalPer100, newCalPer100);
    if (maxCal > 0 && Math.abs(existCalPer100 - newCalPer100) / maxCal <= 0.15) {
      return existing;
    }
  }
  return undefined;
}

export function addFoodItem(item: FoodItem, skipAiEnrich = false): void {
  // Exact name match → skip
  if (foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
    return;
  }
  // Fuzzy duplicate detection → skip if a similar food already exists
  const similar = findSimilarFood(item);
  if (similar) {
    return;
  }
  // If user adds an item back, remove from deleted blacklist
  unmarkFoodDeleted(item.name);
  foodDatabase.push(item);
  saveFoodDatabase(foodDatabase);

  // Auto-enrich via AI in background (vitamins, minerals, dietary flags)
  if (!skipAiEnrich && !item.dietary && !item.vitamins && !item.minerals) {
    enrichFoodViaAi(item.name).catch(() => {});
  }
}

/** Background AI enrichment: fetches full nutrient data and updates the stored item. */
async function enrichFoodViaAi(foodName: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("food-lookup", {
      body: { foodName },
    });
    if (error || !data?.success || !data?.data) return;
    const n = data.data;

    const idx = foodDatabase.findIndex(f => f.name.toLowerCase() === foodName.toLowerCase());
    if (idx < 0) return;

    const existing = foodDatabase[idx];
    foodDatabase[idx] = {
      ...existing,
      // Only overwrite nutrient fields if they were empty
      calories: existing.calories || n.calories || 0,
      protein: existing.protein || n.protein || 0,
      fat: existing.fat || n.fat || 0,
      carbs: existing.carbs || n.carbs || 0,
      fiber: existing.fiber || n.fiber || 0,
      gi: existing.gi ?? n.gi,
      vitamins: existing.vitamins || n.vitamins,
      minerals: existing.minerals || n.minerals,
      dietary: existing.dietary || n.dietary,
      notes: existing.notes || n.notes,
      category: existing.category !== "Eigene" ? existing.category : (n.category || existing.category),
    };
    saveFoodDatabase(foodDatabase);
  } catch {
    // Silent fail – background enrichment is best-effort
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

/** Clear entire food list – marks ALL items (defaults + remote + current) as deleted */
export function clearFoodDatabase(): number {
  const deleted = loadDeletedFoods();
  // Mark every default food as deleted
  for (const def of DEFAULT_FOODS) {
    deleted.add(def.name.toLowerCase());
  }
  // Mark every currently loaded food as deleted (includes remote items)
  for (const item of foodDatabase) {
    deleted.add(item.name.toLowerCase());
  }
  saveDeletedFoods(deleted);
  // Clear remote sync cache so remote items won't re-appear
  localStorage.removeItem("mampflogger-remote-sync");

  const count = foodDatabase.length;
  foodDatabase.splice(0, foodDatabase.length);
  saveFoodDatabase(foodDatabase);
  return count;
}

/** Reset to factory defaults: clear DB, blacklist, sync cache, reload defaults */
export function resetFoodDatabase(): void {
  localStorage.removeItem(FOOD_DB_KEY);
  localStorage.removeItem(DELETED_FOODS_KEY);
  localStorage.removeItem("mampflogger-remote-url");
  localStorage.removeItem("mampflogger-remote-sync");
  foodDatabase.splice(0, foodDatabase.length);
  const defaults = loadFoodDatabase();
  foodDatabase.push(...defaults);
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
