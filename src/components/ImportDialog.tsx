import { useState, useRef } from "react";
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
import { Upload, FileSpreadsheet, Check, AlertCircle, FileUp } from "lucide-react";
import { NutritionEntry } from "@/types/nutrition";
import { FoodItem, addFoodItem, foodDatabase, reloadFoodDatabase } from "@/data/foodDatabase";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        setPreview(null);
        setFoodPreview(null);
        // Auto-parse after loading
        const result = parseImportText(text);
        setDetectedType(result.detectedType);
        if (result.foodItems.length > 0) {
          setFoodPreview(result.foodItems);
        } else if (result.entries.length > 0) {
          setPreview(result.entries);
        } else {
          setPreview([]);
        }
        toast.info(`Datei "${file.name}" geladen`);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      let added = 0;
      let skipped = 0;
      foodPreview.forEach((item) => {
        if (!foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
          addFoodItem(item);
          added++;
        } else {
          skipped++;
        }
      });
      reloadFoodDatabase();
      const msg = skipped > 0
        ? `${added} Lebensmittel importiert, ${skipped} übersprungen (bereits vorhanden)`
        : `${added} Lebensmittel importiert!`;
      toast.success(msg);
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] flex flex-col p-4 sm:p-6 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Daten importieren
          </DialogTitle>
          <DialogDescription className="text-xs">
            CSV, Tab oder Festbreite – Format wird automatisch erkannt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
          {/* Only show input section when no results yet */}
          {!hasResults && (
            <>
              <div className="rounded-md bg-accent/40 p-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Formate: </span>
                Protokoll, Bilanz oder Lebensmittelliste.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.tab"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Datei auswählen (.csv, .tsv, .txt)
              </Button>

              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground">oder einfügen</span>
              </div>

              <Textarea
                placeholder={"Daten hier einfügen…"}
                value={rawText}
                onChange={(e) => { setRawText(e.target.value); setPreview(null); setFoodPreview(null); }}
                className="min-h-[60px] max-h-[120px] font-mono text-xs overflow-x-auto whitespace-pre"
                rows={3}
              />

              <Button type="button" variant="secondary" className="w-full h-9 text-sm" onClick={handleParse} disabled={!rawText.trim()}>
                Vorschau anzeigen
              </Button>
            </>
          )}

          {(preview !== null || foodPreview !== null) && (
            <div className="rounded-lg border border-border p-2.5 space-y-1.5">
              {hasResults ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {resultCount} {typeLabel} erkannt
                  </div>
                  {dateRange && (
                    <p className="text-xs text-muted-foreground">
                      {dateRange.days} Tage: {dateRange.from} – {dateRange.to}
                    </p>
                  )}
                  {preview && (
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {preview.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="text-muted-foreground font-mono shrink-0">{e.date.slice(5)} {e.time}</span>
                            <span className="font-medium truncate">{e.food}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap ml-1 shrink-0">{e.calories} kcal</span>
                        </div>
                      ))}
                      {preview.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-0.5">… und {preview.length - 5} weitere</p>
                      )}
                    </div>
                  )}
                  {foodPreview && (
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {foodPreview.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-border/50 last:border-0">
                          <span className="font-medium truncate">{f.name}</span>
                          <span className="text-muted-foreground whitespace-nowrap ml-1 shrink-0">{f.calories} kcal/{f.baseUnit}</span>
                        </div>
                      ))}
                      {foodPreview.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-0.5">… und {foodPreview.length - 5} weitere</p>
                      )}
                    </div>
                  )}
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

        {/* Sticky import button always visible */}
        {hasResults && (
          <Button type="button" className="w-full h-10 shrink-0" onClick={handleImport}>
            <Check className="w-4 h-4 mr-2" />
            {resultCount} {typeLabel} importieren
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
