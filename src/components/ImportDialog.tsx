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
import { toast } from "sonner";

interface ImportDialogProps {
  onImport: (entries: NutritionEntry[]) => void;
}

function parseImportData(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 7) continue;

    const first = cols[0].trim().toLowerCase();
    // Skip header rows
    if (
      first.includes("datum") ||
      first.includes("date") ||
      first === "" ||
      first.includes("tag")
    )
      continue;

    const dateStr = cols[0]?.trim() || "";
    const timeStr = cols[1]?.trim() || "";
    const food = cols[2]?.trim() || "";
    const amountStr = cols[3]?.trim() || "";
    const calStr = cols[4]?.trim() || "";
    const protStr = cols[5]?.trim() || "";
    const fatStr = cols[6]?.trim() || "";
    const carbStr = cols[7]?.trim() || "";
    const fiberStr = cols[8]?.trim() || "";

    // Parse date: DD.MM.YY or DD.MM.YYYY
    const dateParts = dateStr.split(".");
    if (dateParts.length < 3) continue;

    const day = dateParts[0].padStart(2, "0");
    const month = dateParts[1].padStart(2, "0");
    let year = parseInt(dateParts[2]);
    if (isNaN(year)) continue;
    if (year < 100) year += 2000;
    const date = `${year}-${month}-${day}`;

    // Parse time
    const time = timeStr.includes(":") ? timeStr.slice(0, 5) : "00:00";

    // Parse amount (extract number from e.g. "600ml", "125g", "2 Stk")
    const amountMatch = amountStr.match(/(\d+(?:[.,]\d+)?)/);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(",", "."))
      : 0;

    // Parse a value that may contain "/" separator (e.g. "5 / 3" → take first number)
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
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);

  const handleParse = () => {
    const parsed = parseImportData(rawText);
    setPreview(parsed);
  };

  const handleImport = () => {
    if (!preview || preview.length === 0) return;
    onImport(preview);
    toast.success(`${preview.length} Einträge erfolgreich importiert!`);
    setOpen(false);
    setRawText("");
    setPreview(null);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRawText("");
      setPreview(null);
    }
  };

  // Compute date range for preview
  const dateRange = preview
    ? (() => {
        const dates = [...new Set(preview.map((e) => e.date))].sort();
        if (dates.length === 0) return null;
        const fmt = (d: string) =>
          new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        return {
          from: fmt(dates[0]),
          to: fmt(dates[dates.length - 1]),
          days: dates.length,
        };
      })()
    : null;

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
            Kopiere deine Daten aus einer Tabelle (z.B. Google Sheets, Excel) und füge sie hier ein.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format hint */}
          <div className="rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Erwartetes Format (Tab-getrennt):</p>
            <p className="font-mono text-[11px]">
              Datum → Uhrzeit → Lebensmittel → Menge → kcal → Eiweiß → Fett → KH → Ballast
            </p>
            <p>
              Spalten mit „/" (z.B. „Fett / Gesät.") werden automatisch erkannt – nur der erste Wert wird verwendet.
            </p>
          </div>

          {/* Textarea */}
          <Textarea
            placeholder={"15.01.26\t20:00\tMilchkaffee\t600ml\t84\t4\t5 / 3\t6 / 6\t0\n15.01.26\t20:00\tAvocado\t125g\t200\t3\t19 / 3\t1 / 1\t8"}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setPreview(null);
            }}
            className="min-h-[140px] font-mono text-xs"
            rows={8}
          />

          {/* Parse / Preview */}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleParse}
            disabled={!rawText.trim()}
          >
            Vorschau anzeigen
          </Button>

          {/* Preview result */}
          {preview !== null && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              {preview.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {preview.length} Einträge erkannt
                  </div>
                  {dateRange && (
                    <p className="text-xs text-muted-foreground">
                      {dateRange.days} Tage: {dateRange.from} – {dateRange.to}
                    </p>
                  )}
                  {/* Sample entries */}
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {preview.slice(0, 10).map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-muted-foreground font-mono">
                            {e.date.slice(5)} {e.time}
                          </span>
                          <span className="font-medium truncate">{e.food}</span>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap ml-2">
                          {e.calories} kcal
                        </span>
                      </div>
                    ))}
                    {preview.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        … und {preview.length - 10} weitere Einträge
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full mt-2"
                    onClick={handleImport}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {preview.length} Einträge importieren
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
