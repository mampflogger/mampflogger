import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { parseEntriesCsv, parseFoodDatabaseCsv, parseCalorieBalanceCsv } from "@/lib/csvExport";
import { FoodItem, foodDatabase } from "@/data/foodDatabase";
import { toast } from "sonner";

interface ImportDialogProps {
  onImport: (entries: NutritionEntry[]) => void;
}

type DetectedType = "entries" | "food" | "balance";

/** Parse a value that may contain "/" separators (e.g. "5 / 3") */
function parseVal(val: string): number {
  if (!val) return 0;
  const cleaned = val.split("/")[0].trim().replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/** Try to split a line into columns using the best delimiter */
function splitLine(line: string): string[] {
  // Try tab first
  const tabCols = line.split("\t");
  if (tabCols.length >= 6) return tabCols.map((c) => c.trim());

  // Try semicolon
  const semiCols = line.split(";");
  if (semiCols.length >= 6) return semiCols.map((c) => c.trim().replace(/^"|"$/g, ""));

  // Try comma (but careful with decimal commas)
  const commaCols = line.split(",");
  if (commaCols.length >= 6) return commaCols.map((c) => c.trim().replace(/^"|"$/g, ""));

  // Fixed width: try splitting by 2+ spaces
  const fwCols = line.split(/\s{2,}/).map((c) => c.trim());
  if (fwCols.length >= 6) return fwCols;

  return tabCols.map((c) => c.trim());
}

/** Detect the dominant delimiter for the whole text */
function detectDelimiter(text: string): "tab" | "semi" | "comma" | "fixed" {
  const lines = text.trim().split("\n").slice(0, 5);
  let tabScore = 0, semiScore = 0, commaScore = 0, fixedScore = 0;

  for (const line of lines) {
    if (line.split("\t").length >= 6) tabScore++;
    if (line.split(";").length >= 6) semiScore++;
    if (line.split(",").length >= 6) commaScore++;
    if (line.split(/\s{2,}/).length >= 6) fixedScore++;
  }

  if (tabScore >= semiScore && tabScore >= commaScore && tabScore >= fixedScore) return "tab";
  if (semiScore >= commaScore && semiScore >= fixedScore) return "semi";
  if (commaScore >= fixedScore) return "comma";
  return "fixed";
}

/** Check if a string looks like a date */
function looksLikeDate(s: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Parse date from DD.MM.YY or YYYY-MM-DD */
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

/** Check if first column looks like a food name (not a date, not a number) */
function looksLikeFoodName(s: string): boolean {
  if (!s) return false;
  if (looksLikeDate(s)) return false;
  if (/^\d+([.,]\d+)?$/.test(s)) return false;
  return /[a-zA-ZäöüÄÖÜß]/.test(s);
}

/** Detect content type and parse automatically */
function autoDetectAndParse(text: string): {
  entries: NutritionEntry[];
  foodItems: FoodItem[];
  detectedType: DetectedType;
} {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return { entries: [], foodItems: [], detectedType: "entries" };

  // Skip header lines
  const dataLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return !lower.includes("lebensmittel") && !lower.includes("datum") && !lower.includes("date") && line.trim() !== "";
  });

  if (dataLines.length === 0) {
    // Maybe all lines are headers, try without filter
    // but still skip obvious headers
  }

  // Analyze first few data lines to detect type
  const sampleLines = (dataLines.length > 0 ? dataLines : lines).slice(0, 5);
  const firstCols = sampleLines.map((l) => splitLine(l));

  // Heuristic: if first column of data lines looks like food names → food database
  // If first column looks like dates → entries or balance
  let dateCount = 0;
  let foodNameCount = 0;
  let hasTimeColumn = 0;

  for (const cols of firstCols) {
    if (cols.length < 3) continue;
    if (looksLikeDate(cols[0])) dateCount++;
    if (looksLikeFoodName(cols[0])) foodNameCount++;
    if (cols.length >= 3 && /^\d{1,2}:\d{2}/.test(cols[1])) hasTimeColumn++;
  }

  // Food database: first col = name, ~7 cols, no dates
  if (foodNameCount > dateCount && foodNameCount > 0) {
    const foodItems = parseFoodItems(text);
    if (foodItems.length > 0) {
      return { entries: [], foodItems, detectedType: "food" };
    }
  }

  // Entries with time column (9 cols: date, time, food, amount, kcal, pro, fat, kh, fib)
  // Balance without time (6 cols: date, kcal, pro, fat, kh, fib)
  const entries = parseAllEntries(text);
  if (entries.length > 0) {
    // Check if these look like balance entries (no time, no food name)
    const isBalance = entries.every((e) => e.food === "Tagesbilanz (Import)" || e.time === "00:00");
    return { entries, foodItems: [], detectedType: isBalance ? "balance" : "entries" };
  }

  return { entries: [], foodItems: [], detectedType: "entries" };
}

/** Universal entry parser - tries all delimiters and column layouts */
function parseAllEntries(text: string): NutritionEntry[] {
  // Try CSV parser first (semicolon)
  const csvEntries = parseEntriesCsv(text);
  if (csvEntries.length > 0) return csvEntries;

  // Try balance CSV
  const balanceEntries = parseCalorieBalanceCsv(text);
  if (balanceEntries.length > 0) return balanceEntries;

  // Try TSV / fixed-width / any delimiter
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = splitLine(line);
    if (cols.length < 6) continue;

    const first = cols[0].toLowerCase();
    if (first.includes("datum") || first.includes("date") || first === "" || first.includes("tag")) continue;

    // Try: date in first column
    const date = parseDate(cols[0]);
    if (!date) continue;

    // Detect layout: with time+food (9 cols) or balance (6 cols)
    if (cols.length >= 9 && /^\d{1,2}:\d{2}/.test(cols[1])) {
      // Full entry: date, time, food, amount, kcal, pro, fat, kh, fib
      const time = cols[1].slice(0, 5);
      const food = cols[2];
      if (!food) continue;
      const amountMatch = cols[3].match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;

      entries.push({
        id: generateId() + Math.random().toString(36).slice(2, 5),
        date,
        time,
        food,
        amount,
        calories: Math.round(parseVal(cols[4])),
        protein: parseVal(cols[5]),
        fat: parseVal(cols[6]),
        carbs: parseVal(cols[7]),
        fiber: parseVal(cols[8]),
      });
    } else if (cols.length >= 6) {
      // Balance: date, kcal, pro, fat, kh, fib
      entries.push({
        id: generateId(),
        date,
        time: "00:00",
        food: "Tagesbilanz (Import)",
        amount: 0,
        calories: Math.round(parseFloat(cols[1]) || 0),
        protein: Math.round(parseFloat(cols[2]) || 0),
        fat: Math.round(parseFloat(cols[3]) || 0),
        carbs: Math.round(parseFloat(cols[4]) || 0),
        fiber: Math.round(parseFloat(cols[5]) || 0),
      });
    }
  }

  return entries;
}

/** Universal food database parser */
function parseFoodItems(text: string): FoodItem[] {
  // Try the existing CSV parser first
  const csvItems = parseFoodDatabaseCsv(text);
  if (csvItems.length > 0) return csvItems;

  // Try other delimiters
  const lines = text.trim().split("\n");
  const items: FoodItem[] = [];

  for (const line of lines) {
    const cols = splitLine(line);
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name || name.toLowerCase().includes("lebensmittel")) continue;
    if (looksLikeDate(name)) continue;

    const baseUnit = cols[1] || "100g";
    const baseAmount = baseUnit.startsWith("1 ") ? 1 : 100;

    items.push({
      name,
      baseUnit,
      baseAmount,
      calories: parseFloat(cols[2]) || 0,
      protein: parseFloat(cols[3]) || 0,
      fat: parseFloat(cols[4]) || 0,
      carbs: parseFloat(cols[5]) || 0,
      fiber: parseFloat(cols[6]) || 0,
    });
  }

  return items;
}

const ImportDialog = ({ onImport }: ImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);
  const [detectedType, setDetectedType] = useState<DetectedType>("entries");

  const handleParse = () => {
    setFoodPreview(null);
    setPreview(null);

    const result = autoDetectAndParse(rawText);
    setDetectedType(result.detectedType);

    if (result.foodItems.length > 0) {
      setFoodPreview(result.foodItems);
    } else if (result.entries.length > 0) {
      setPreview(result.entries);
    } else {
      // Show empty state
      setPreview([]);
    }
  };

  const handleImport = () => {
    if (detectedType === "food" && foodPreview && foodPreview.length > 0) {
      foodPreview.forEach((item) => {
        if (!foodDatabase.find((f) => f.name === item.name)) {
          foodDatabase.push(item);
        }
      });
      toast.success(`${foodPreview.length} Lebensmittel importiert!`);
      handleClose(false);
      return;
    }

    if (!preview || preview.length === 0) return;
    onImport(preview);
    toast.success(`${preview.length} Einträge erfolgreich importiert!`);
    handleClose(false);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRawText("");
      setPreview(null);
      setFoodPreview(null);
    }
  };

  const dateRange = preview
    ? (() => {
        const dates = [...new Set(preview.map((e) => e.date))].sort();
        if (dates.length === 0) return null;
        const fmt = (d: string) =>
          new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
        return { from: fmt(dates[0]), to: fmt(dates[dates.length - 1]), days: dates.length };
      })()
    : null;

  const hasResults = (preview && preview.length > 0) || (foodPreview && foodPreview.length > 0);
  const resultCount = preview?.length || foodPreview?.length || 0;
  const typeLabel = detectedType === "food" ? "Lebensmittel" : detectedType === "balance" ? "Tagesbilanzen" : "Einträge";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Daten importieren">
          <Upload className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Daten importieren
          </DialogTitle>
          <DialogDescription>
            Daten einfügen – Format wird automatisch erkannt (CSV, Tab, Festbreite).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format hint */}
          <div className="rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Unterstützte Formate</p>
            <p>Protokoll, Kalorienbilanz oder Lebensmittelliste – Semikolon, Tab oder Festbreite.</p>
          </div>

          <Textarea
            placeholder={"Daten hier einfügen (CSV, Tab-getrennt oder Festbreite)…"}
            value={rawText}
            onChange={(e) => { setRawText(e.target.value); setPreview(null); setFoodPreview(null); }}
            className="min-h-[140px] font-mono text-xs"
            rows={8}
          />

          <Button type="button" variant="secondary" className="w-full" onClick={handleParse} disabled={!rawText.trim()}>
            Vorschau anzeigen
          </Button>

          {(preview !== null || foodPreview !== null) && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              {hasResults ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {resultCount} {typeLabel} erkannt
                  </div>
                  {dateRange && (
                    <p className="text-xs text-muted-foreground">
                      {dateRange.days} Tage: {dateRange.from} – {dateRange.to}
                    </p>
                  )}
                  {preview && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {preview.slice(0, 10).map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-muted-foreground font-mono">{e.date.slice(5)} {e.time}</span>
                            <span className="font-medium truncate">{e.food}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap ml-2">{e.calories} kcal</span>
                        </div>
                      ))}
                      {preview.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">… und {preview.length - 10} weitere</p>
                      )}
                    </div>
                  )}
                  {foodPreview && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {foodPreview.slice(0, 10).map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                          <span className="font-medium truncate">{f.name}</span>
                          <span className="text-muted-foreground whitespace-nowrap ml-2">{f.calories} kcal/{f.baseUnit}</span>
                        </div>
                      ))}
                      {foodPreview.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">… und {foodPreview.length - 10} weitere</p>
                      )}
                    </div>
                  )}
                  <Button type="button" className="w-full mt-2" onClick={handleImport}>
                    <Check className="w-4 h-4 mr-2" />
                    {resultCount} {typeLabel} importieren
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  Keine Einträge erkannt. Bitte prüfe das Format.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
