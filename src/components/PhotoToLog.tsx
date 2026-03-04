import { useState, useRef, useEffect } from "react";
import { ensureCompatibleImage } from "@/lib/imageUtils";
import { Camera, Loader2, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { supabase } from "@/integrations/supabase/client";
import { addFoodItem, guessCategory } from "@/data/foodDatabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OPEN_PHOTO_LOG_EVENT = "mampflogger:open-photo-log";

interface RecognizedFood {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  category?: string;
  selected?: boolean;
}

interface PhotoToLogProps {
  selectedDate: string;
  onAddEntries: (entries: NutritionEntry[]) => void;
}

const PhotoToLog = ({ selectedDate, onAddEntries }: PhotoToLogProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const handleOpenPhotoLog = () => handleCapture();
    window.addEventListener(OPEN_PHOTO_LOG_EVENT, handleOpenPhotoLog);
    return () => window.removeEventListener(OPEN_PHOTO_LOG_EVENT, handleOpenPhotoLog);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setError(null);
    setRecognizedFoods([]);

    // Convert HEIC/HEIF to JPEG if needed
    try {
      file = await ensureCompatibleImage(file);
    } catch (err) {
      setError("Bildformat konnte nicht konvertiert werden. Bitte verwende JPG oder PNG.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setPreviewUrl(base64);
      setShowDialog(true);
      setIsAnalyzing(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "photo-to-log",
          { body: { imageBase64: base64 } }
        );

        if (fnError) {
          setError("Analyse fehlgeschlagen. Bitte versuche es erneut.");
          console.error("photo-to-log error:", fnError);
          return;
        }

        if (data?.error) {
          setError(data.error);
          return;
        }

        const items: RecognizedFood[] = (data?.items || []).map(
          (item: RecognizedFood) => ({
            ...item,
            selected: true,
          })
        );
        setRecognizedFoods(items);
      } catch (err) {
        console.error("Photo analysis error:", err);
        setError("Verbindungsfehler. Bitte versuche es erneut.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const toggleFood = (index: number) => {
    setRecognizedFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleAddSelected = () => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const entries: NutritionEntry[] = recognizedFoods
      .filter((f) => f.selected)
      .map((f) => {
        // Auto-add to local food database
        const baseAmount = 100;
        const factor = baseAmount / f.amount;
        addFoodItem({
          name: f.name,
          baseUnit: f.unit === "ml" ? "100ml" : "100g",
          baseAmount,
          calories: Math.round(f.calories * factor),
          protein: Math.round(f.protein * factor),
          fat: Math.round(f.fat * factor),
          carbs: Math.round(f.carbs * factor),
          fiber: Math.round(f.fiber * factor),
          category: f.category as any || guessCategory(f.name),
        });

        return {
          id: generateId(),
          date: selectedDate,
          time,
          food: f.name,
          amount: f.amount,
          calories: Math.round(f.calories),
          protein: Math.round(f.protein),
          fat: Math.round(f.fat),
          carbs: Math.round(f.carbs),
          fiber: Math.round(f.fiber),
        };
      });

    onAddEntries(entries);
    setShowDialog(false);
    setRecognizedFoods([]);
    setPreviewUrl(null);
  };

  const selectedCount = recognizedFoods.filter((f) => f.selected).length;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCapture}
        className="h-9 w-9 shrink-0"
        title="Foto-zu-Log"
      >
        <Camera className="w-4 h-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Foto-zu-Log
            </DialogTitle>
          </DialogHeader>

          {/* Image Preview */}
          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={previewUrl}
                alt="Mahlzeit"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                KI analysiert dein Foto…
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Recognized Foods */}
          {!isAnalyzing && recognizedFoods.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Erkannte Lebensmittel ({recognizedFoods.length})
              </p>
              {recognizedFoods.map((food, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleFood(index)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    food.selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">
                          {food.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ~{food.amount}
                          {food.unit}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{food.calories} kcal</span>
                        <span>P {food.protein}g</span>
                        <span>F {food.fat}g</span>
                        <span>KH {food.carbs}g</span>
                        <span>Fb {food.fiber}g</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        food.selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {food.selected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isAnalyzing && !error && recognizedFoods.length === 0 && previewUrl && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Lebensmittel erkannt. Versuche ein deutlicheres Foto.
            </p>
          )}

          {/* Add Button */}
          {!isAnalyzing && selectedCount > 0 && (
            <Button onClick={handleAddSelected} className="w-full">
              <Plus className="w-4 h-4 mr-1" />
              {selectedCount} Eintr{selectedCount === 1 ? "ag" : "äge"} hinzufügen
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoToLog;
