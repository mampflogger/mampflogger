import { NutritionEntry, generateId } from "@/types/nutrition";
import { parseEntriesCsv, parseFoodDatabaseCsv, parseCalorieBalanceCsv, parseActivitiesCsv } from "@/lib/csvExport";
import { FoodItem } from "@/data/foodDatabase";
import { BookedActivity } from "@/types/profile";

export type DetectedType = "entries" | "food" | "balance" | "activities";
type Delimiter = "tab" | "semi" | "comma" | "fixed";

/** Parse a value that may contain "/" separators (e.g. "5 / 3") */
function parseVal(val: string): number {
  if (!val) return 0;
  const cleaned = val.split("/")[0].trim().replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/** Parse a localized number (handles both comma and dot decimals) */
function parseLocalNum(val: string): number {
  if (!val) return 0;
  let s = val.trim().replace(/[^\d.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return parseFloat(s) || 0;
}

/** Detect the dominant delimiter for the whole text */
function detectDelimiter(text: string): Delimiter {
  const lines = text.trim().split("\n").slice(0, 10);
  let tabScore = 0, semiScore = 0, commaScore = 0, fixedScore = 0;

  for (const line of lines) {
    const tabCount = line.split("\t").length;
    const semiCount = line.split(";").length;
    const unquoted = line.replace(/"[^"]*"/g, "");
    const commaCount = unquoted.split(",").length;
    const fixedCount = line.split(/\s{2,}/).length;

    if (tabCount >= 3) tabScore += tabCount;
    if (semiCount >= 3) semiScore += semiCount;
    if (commaCount >= 3) commaScore += commaCount;
    if (fixedCount >= 3) fixedScore += fixedCount;
  }

  if (tabScore >= semiScore && tabScore >= commaScore && tabScore >= fixedScore && tabScore > 0) return "tab";
  if (semiScore >= commaScore && semiScore >= fixedScore && semiScore > 0) return "semi";
  if (commaScore >= fixedScore && commaScore > 0) return "comma";
  return "fixed";
}

/** Split a line using a specific delimiter */
function splitWithDelimiter(line: string, delim: Delimiter): string[] {
  switch (delim) {
    case "tab":
      return line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
    case "semi":
      return line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    case "comma": {
      const cols: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cols.push(current.trim().replace(/^"|"$/g, ""));
      return cols;
    }
    case "fixed":
      return line.split(/\s{2,}/).map((c) => c.trim());
  }
}

/** Split a line, auto-detecting delimiter if not specified */
function splitLine(line: string, forceDelim?: Delimiter): string[] {
  if (forceDelim) return splitWithDelimiter(line, forceDelim);
  const tabCols = line.split("\t");
  if (tabCols.length >= 3) return tabCols.map((c) => c.trim().replace(/^"|"$/g, ""));
  const semiCols = line.split(";");
  if (semiCols.length >= 3) return semiCols.map((c) => c.trim().replace(/^"|"$/g, ""));
  const commaCols = splitWithDelimiter(line, "comma");
  if (commaCols.length >= 3) return commaCols;
  const fwCols = line.split(/\s{2,}/).map((c) => c.trim());
  if (fwCols.length >= 3) return fwCols;
  return tabCols.map((c) => c.trim());
}

function looksLikeDate(s: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(".");
  if (parts.length < 3) return null;
  const d = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  let y = parseInt(parts[2]);
  if (isNaN(y)) return null;
  if (y < 100) y += 2000;
  return `${y}-${m}-${d}`;
}

function looksLikeFoodName(s: string): boolean {
  if (!s) return false;
  if (looksLikeDate(s)) return false;
  if (/^\d+([.,]\d+)?$/.test(s)) return false;
  return /[a-zA-ZäöüÄÖÜß]/.test(s);
}

/** Universal entry parser */
function parseAllEntries(text: string, delim: Delimiter): NutritionEntry[] {
  if (delim === "semi") {
    const csvEntries = parseEntriesCsv(text);
    if (csvEntries.length > 0) return csvEntries;
    const balanceEntries = parseCalorieBalanceCsv(text);
    if (balanceEntries.length > 0) return balanceEntries;
  }

  const lines = text.trim().split("\n");
  const detailedEntries: NutritionEntry[] = [];
  const balanceEntries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = splitLine(line, delim);
    if (cols.length < 6) continue;
    const first = cols[0].toLowerCase();
    if (first.includes("datum") || first.includes("date") || first === "" || first.includes("tag") || first.includes("lebensmittel") || first.includes("summe")) continue;
    const date = parseDate(cols[0]);
    if (!date) continue;

    if (cols.length >= 9 && /^\d{1,2}:\d{2}/.test(cols[1])) {
      const time = cols[1].slice(0, 5);
      const food = cols[2];
      if (!food) continue;
      const amountMatch = cols[3].match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;
      detailedEntries.push({
        id: generateId() + Math.random().toString(36).slice(2, 5),
        date, time, food, amount,
        calories: Math.round(parseVal(cols[4])),
        protein: parseVal(cols[5]),
        fat: parseVal(cols[6]),
        carbs: parseVal(cols[7]),
        fiber: parseVal(cols[8]),
      });
    } else if (cols.length >= 6) {
      balanceEntries.push({
        id: generateId(),
        date, time: "00:00", food: "Tagesbilanz (Import)", amount: 0,
        calories: Math.round(parseLocalNum(cols[1])),
        protein: Math.round(parseLocalNum(cols[2])),
        fat: Math.round(parseLocalNum(cols[3])),
        carbs: Math.round(parseLocalNum(cols[4])),
        fiber: Math.round(parseLocalNum(cols[5])),
      });
    }
  }

  // Always return only detailed entries – balance/summary rows are never imported as individual items
  return detailedEntries;
}

/** Universal food database parser */
function parseFoodItems(text: string, delim: Delimiter): FoodItem[] {
  if (delim === "semi") {
    const csvItems = parseFoodDatabaseCsv(text);
    if (csvItems.length > 0) return csvItems;
  }

  const lines = text.trim().split("\n");
  const items: FoodItem[] = [];

  for (const line of lines) {
    const cols = splitLine(line, delim);
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name || name.toLowerCase().includes("lebensmittel")) continue;
    if (looksLikeDate(name)) continue;
    const baseUnit = cols[1] || "100g";
    items.push({
      name, baseUnit,
      baseAmount: baseUnit.startsWith("1 ") ? 1 : 100,
      calories: parseLocalNum(cols[2]),
      protein: parseLocalNum(cols[3]),
      fat: parseLocalNum(cols[4]),
      carbs: parseLocalNum(cols[5]),
      fiber: parseLocalNum(cols[6]),
    });
  }
  return items;
}

export interface ParseResult {
  entries: NutritionEntry[];
  foodItems: FoodItem[];
  activities: BookedActivity[];
  detectedType: DetectedType;
}

/**
 * Main entry point: parse import text with auto-detection of format and delimiter.
 * Optionally pass a hint for expected type.
 */
export function parseImportText(text: string, typeHint?: DetectedType): ParseResult {
  const empty: ParseResult = { entries: [], foodItems: [], activities: [], detectedType: "entries" };
  if (!text.trim()) return empty;

  const delim = detectDelimiter(text);
  const lines = text.trim().split("\n");

  // Check for activities format first (5 cols: Datum;Aktivität;Wert;Einheit;kcal)
  if (delim === "semi") {
    const acts = parseActivitiesCsv(text);
    if (acts.length > 0) {
      // Verify it's actually activities (header or data pattern)
      const firstDataLine = lines.find(l => {
        const lower = l.toLowerCase().trim();
        return lower && !lower.includes("datum") && !lower.includes("aktivit");
      });
      if (firstDataLine) {
        const cols = firstDataLine.split(";").map(c => c.trim().replace(/^"|"$/g, ""));
        // Activities have exactly 5 cols and col[3] is a unit like "Schritte", "km", "min"
        if (cols.length === 5 && /[a-zA-ZäöüÄÖÜß]/.test(cols[3])) {
          return { entries: [], foodItems: [], activities: acts, detectedType: "activities" };
        }
      }
    }
  }

  // If type hint given, try that first
  if (typeHint === "food") {
    const foodItems = parseFoodItems(text, delim);
    if (foodItems.length > 0) return { ...empty, foodItems, detectedType: "food" };
  }
  if (typeHint === "balance") {
    const entries = parseAllEntries(text, delim);
    if (entries.length > 0) return { ...empty, entries, detectedType: "balance" };
  }
  if (typeHint === "entries") {
    const entries = parseAllEntries(text, delim);
    if (entries.length > 0) return { ...empty, entries, detectedType: "entries" };
  }

  // Auto-detect: analyze first data lines
  const dataLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (line.trim() === "") return false;
    const headerWords = ["lebensmittel", "datum", "date", "food", "zeit", "time"];
    const matchCount = headerWords.filter((w) => lower.includes(w)).length;
    if (matchCount >= 2) return false;
    if (lower.includes("kcal") && (lower.includes("pro") || lower.includes("fat") || lower.includes("kh"))) return false;
    return true;
  });

  const sampleLines = (dataLines.length > 0 ? dataLines : lines.filter(l => l.trim())).slice(0, 5);
  const firstCols = sampleLines.map((l) => splitLine(l, delim));

  let dateCount = 0, foodNameCount = 0;
  for (const cols of firstCols) {
    if (cols.length < 3) continue;
    if (looksLikeDate(cols[0])) dateCount++;
    if (looksLikeFoodName(cols[0])) foodNameCount++;
  }

  if (foodNameCount > dateCount && foodNameCount > 0) {
    const foodItems = parseFoodItems(text, delim);
    if (foodItems.length > 0) return { ...empty, foodItems, detectedType: "food" };
  }

  // Check if it looks like a balance file (6 cols, no time column)
  const isBalanceFile = firstCols.every(cols => cols.length >= 6 && cols.length <= 8 && !/^\d{1,2}:\d{2}/.test(cols[1]));
  if (isBalanceFile && dateCount > 0) {
    return { ...empty, detectedType: "balance" };
  }

  const entries = parseAllEntries(text, delim);
  if (entries.length > 0) {
    return { ...empty, entries, detectedType: "entries" };
  }

  return empty;
}
