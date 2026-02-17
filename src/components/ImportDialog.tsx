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
import { NutritionEntry } from "@/types/nutrition";
import { FoodItem, foodDatabase } from "@/data/foodDatabase";
import { parseImportText, DetectedType } from "@/lib/importParser";
import { toast } from "sonner";

interface ImportDialogProps {
  onImport: (entries: NutritionEntry[]) => void;
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

    const result = parseImportText(rawText);
    setDetectedType(result.detectedType);

    if (result.foodItems.length > 0) {
      setFoodPreview(result.foodItems);
    } else if (result.entries.length > 0) {
      setPreview(result.entries);
    } else {
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
