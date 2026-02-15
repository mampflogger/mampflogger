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
import { parseEntriesCsv, parseFoodDatabaseCsv } from "@/lib/csvExport";
import { FoodItem, foodDatabase } from "@/data/foodDatabase";
import { toast } from "sonner";

interface ImportDialogProps {
  onImport: (entries: NutritionEntry[]) => void;
}

type ImportType = "tsv" | "csv-entries" | "csv-food";

function parseImportData(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 7) continue;

    const first = cols[0].trim().toLowerCase();
    if (first.includes("datum") || first.includes("date") || first === "" || first.includes("tag")) continue;

    const dateStr = cols[0]?.trim() || "";
    const timeStr = cols[1]?.trim() || "";
    const food = cols[2]?.trim() || "";
    const amountStr = cols[3]?.trim() || "";
    const calStr = cols[4]?.trim() || "";
    const protStr = cols[5]?.trim() || "";
    const fatStr = cols[6]?.trim() || "";
    const carbStr = cols[7]?.trim() || "";
    const fiberStr = cols[8]?.trim() || "";

    const dateParts = dateStr.split(".");
    if (dateParts.length < 3) continue;

    const day = dateParts[0].padStart(2, "0");
    const month = dateParts[1].padStart(2, "0");
    let year = parseInt(dateParts[2]);
    if (isNaN(year)) continue;
    if (year < 100) year += 2000;
    const date = `${year}-${month}-${day}`;

    const time = timeStr.includes(":") ? timeStr.slice(0, 5) : "00:00";

    const amountMatch = amountStr.match(/(\d+(?:[.,]\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;

    const parseVal = (val: string): number => {
      if (!val) return 0;
      const cleaned = val.split("/")[0].trim().replace(",", ".");
      return parseFloat(cleaned) || 0;
    };

    if (!food) continue;

    entries.push({
      id: generateId() + Math.random().toString(36).slice(2, 5),
      date,
      time,
      food,
      amount,
      calories: Math.round(parseVal(calStr)),
      protein: parseVal(protStr),
      carbs: parseVal(carbStr),
      fat: parseVal(fatStr),
      fiber: parseVal(fiberStr),
    });
  }

  return entries;
}

const ImportDialog = ({ onImport }: ImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [importType, setImportType] = useState<ImportType>("tsv");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);

  const handleParse = () => {
    setFoodPreview(null);
    setPreview(null);

    if (importType === "csv-food") {
      const items = parseFoodDatabaseCsv(rawText);
      setFoodPreview(items);
    } else if (importType === "csv-entries") {
      const entries = parseEntriesCsv(rawText);
      setPreview(entries);
    } else {
      const parsed = parseImportData(rawText);
      setPreview(parsed);
    }
  };

  const handleImport = () => {
    if (importType === "csv-food" && foodPreview && foodPreview.length > 0) {
      // Add to food database in memory (append to foodDatabase array)
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
            Wähle den Importtyp und füge die Daten ein.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import type selector */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {([
              { id: "tsv" as ImportType, label: "TSV (Tabelle)" },
              { id: "csv-entries" as ImportType, label: "Protokoll (CSV)" },
              { id: "csv-food" as ImportType, label: "Lebensmittel (CSV)" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => { setImportType(t.id); setPreview(null); setFoodPreview(null); }}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  importType === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Format hint */}
          <div className="rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">
              {importType === "tsv" && "Format: Tab-getrennt (aus Tabelle kopiert)"}
              {importType === "csv-entries" && "Format: Semikolon-getrennt (FoodLog CSV Export)"}
              {importType === "csv-food" && "Format: Semikolon-getrennt (FoodLog Lebensmittel Export)"}
            </p>
            {importType === "tsv" && (
              <p className="font-mono text-[11px]">
                Datum → Uhrzeit → Lebensmittel → Menge → kcal → Eiweiß → Fett → KH → Ballast
              </p>
            )}
            {importType === "csv-entries" && (
              <p className="font-mono text-[11px]">
                Datum;Zeit;Lebensmittel;Menge;kcal;PRO;FAT;KH;FIB
              </p>
            )}
            {importType === "csv-food" && (
              <p className="font-mono text-[11px]">
                Lebensmittel;Einheit;Basis;kcal;PRO;FAT;KH;FIB
              </p>
            )}
          </div>

          <Textarea
            placeholder={
              importType === "tsv"
                ? "15.01.26\t20:00\tMilchkaffee\t600ml\t84\t4\t5 / 3\t6 / 6\t0"
                : importType === "csv-entries"
                ? "2026-01-15;20:00;Milchkaffee;600;84;4;5;6;0"
                : "Haferflocken;100g;100;372;13;7;59;10"
            }
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
                    {resultCount} {importType === "csv-food" ? "Lebensmittel" : "Einträge"} erkannt
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
                    {resultCount} {importType === "csv-food" ? "Lebensmittel" : "Einträge"} importieren
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
