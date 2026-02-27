import { useState, useEffect, useRef, useMemo } from "react";
import { ensureCompatibleImage, resizeImageToDataUrl } from "@/lib/imageUtils";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Trash2, ChevronDown, ChevronUp, Sparkles, Pencil, Check, Plus, Loader2, Share2, PlusCircle, MessageCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { foodDatabase, saveFoodDatabase, guessCategory, addFoodItem, type FoodItem } from "@/data/foodDatabase";
import ManualRecipeForm from "@/components/ManualRecipeForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecipeMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface RecipeIngredient {
  name: string;
  amount: string;
  isMain: boolean;
}

interface SavedRecipe {
  id: string;
  savedAt: string;
  name: string;
  servings: number;
  prepTime: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  totalMacros: RecipeMacros;
  perServing: RecipeMacros;
  photoUrl?: string;
}

const SAVED_RECIPES_KEY = "mampflogger-saved-recipes";

function loadSavedRecipes(): SavedRecipe[] {
  try {
    const data = localStorage.getItem(SAVED_RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSavedRecipes(recipes: SavedRecipe[]): void {
  try {
    localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      // Strip photos and retry
      const stripped = recipes.map(({ photoUrl, ...rest }) => rest);
      try {
        localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(stripped));
        console.warn("[RecipesTab] localStorage voll – Rezeptfotos wurden entfernt um Platz zu sparen.");
      } catch {
        console.error("[RecipesTab] localStorage voll – Rezepte konnten nicht gespeichert werden.");
      }
    }
  }
}

/** Extract the leading numeric part (e.g. "400" from "400g") */
function extractNumber(amount: string): { num: string; rest: string } | null {
  const m = amount.match(/^(\d+[\d.,]*)\s*(.*)/);
  if (m) return { num: m[1], rest: m[2] };
  return null;
}

interface RecipesTabProps {
  entries: NutritionEntry[];
  selectedDate: string;
  onAddEntry: (entry: NutritionEntry) => void;
}

const RecipesTab = ({ entries, selectedDate, onAddEntry }: RecipesTabProps) => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(loadSavedRecipes);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIngredients, setEditIngredients] = useState<RecipeIngredient[]>([]);
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const recipePhotoInputRef = useRef<HTMLInputElement>(null);
  const [recipePhotoTargetId, setRecipePhotoTargetId] = useState<string | null>(null);
  const { toast } = useToast();

  const foodSuggestions = useMemo(() => {
    const q = newIngredientName.trim().toLowerCase();
    if (q.length < 1) return [];
    return foodDatabase
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [newIngredientName]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    saveSavedRecipes(savedRecipes);
  }, [savedRecipes]);

  const handleDelete = (id: string) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
    toast({ title: "Gelöscht", description: "Rezept wurde entfernt." });
  };

  const buildShareText = (recipe: SavedRecipe) => {
    const ingredientsList = recipe.ingredients
      .map((ing) => `${ing.amount ? ing.amount + " " : ""}${ing.name}`)
      .join("\n");
    const stepsList = recipe.steps.map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, "")}`).join("\n");
    const ps = recipe.perServing;
    return [
      `🍽️ Ein Lieblingsrezept für dich:`,
      ``,
      `*${recipe.name}*`,
      `👥 ${recipe.servings} Portionen · ⏱️ ${recipe.prepTime}`,
      ``,
      `📋 Zutaten:`,
      ingredientsList,
      ``,
      `👨‍🍳 Zubereitung:`,
      stepsList,
      ``,
      `📊 Pro Portion: ${ps.calories} kcal · Protein ${ps.protein}g · Fett ${ps.fat}g · Kohlenhydrate ${ps.carbs}g · Ballaststoffe ${ps.fiber}g`,
      ``,
      `• Erstellt mit der *𝗸𝗼𝘀𝘁𝗲𝗻𝗹𝗼𝘀𝗲𝗻* Ernährungs-App auf 𝗠𝗮𝗺𝗽𝗳𝗟𝗼𝗴𝗴𝗲𝗿.𝗱𝗲`,
    ].join("\n");
  };

  const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File | null> => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], fileName, { type: blob.type || "image/jpeg" });
    } catch {
      return null;
    }
  };

  const isAppleShareSurface = () => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
  };

  const handleShare = async (recipe: SavedRecipe) => {
    const text = buildShareText(recipe);

    if (navigator.share) {
      try {
        // Try sharing with image first
        if (recipe.photoUrl) {
          const file = await dataUrlToFile(recipe.photoUrl, `${recipe.name.replace(/\s+/g, "_")}.jpg`);
          if (file && navigator.canShare?.({ files: [file] })) {
            try {
              await navigator.share({ text, files: [file] });
              return;
            } catch (imgErr: any) {
              // If user cancelled, stop entirely
              if (imgErr?.name === "AbortError") return;
              // Otherwise fall through to text-only share
              console.warn("Share with image failed, falling back to text:", imgErr);
            }
          }
        }

        // Fallback: text-only share
        await navigator.share({ text });
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Share failed:", e);
          toast({ title: "Teilen fehlgeschlagen", description: "Bitte versuche den WhatsApp-Button." });
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Kopiert!", description: "Rezept wurde in die Zwischenablage kopiert." });
    }
  };

  const handleWhatsAppShare = (recipe: SavedRecipe) => {
    const text = buildShareText(recipe);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  const handleManualSave = (recipe: SavedRecipe) => {
    setSavedRecipes((prev) => [recipe, ...prev]);
    setShowManualForm(false);
  };

  const handlePhotoCaptureClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);

    // Convert HEIC/HEIF to JPEG if needed
    try {
      file = await ensureCompatibleImage(file);
    } catch (err) {
      setPhotoError("Bildformat konnte nicht konvertiert werden. Bitte verwende JPG oder PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawBase64 = ev.target?.result as string;
      const base64 = await resizeImageToDataUrl(rawBase64);
      setPhotoPreview(base64);
      setShowPhotoDialog(true);
      setPhotoAnalyzing(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("photo-to-recipe", {
          body: { imageBase64: base64 },
        });

        if (fnError) {
          setPhotoError("Analyse fehlgeschlagen. Bitte versuche es erneut.");
          console.error("photo-to-recipe error:", fnError);
          setPhotoAnalyzing(false);
          return;
        }
        if (data?.error) {
          setPhotoError(data.error);
          setPhotoAnalyzing(false);
          return;
        }

        // Save new foods to database
        if (data.ingredients && Array.isArray(data.ingredients)) {
          const existingNames = new Set(foodDatabase.map(f => f.name.toLowerCase()));
          const newFoods: FoodItem[] = [];
          for (const ing of data.ingredients) {
            if (!existingNames.has(ing.name.toLowerCase()) && ing.per100g) {
              newFoods.push({
                name: ing.name,
                baseUnit: "100g",
                baseAmount: 100,
                calories: Math.round(ing.per100g.calories),
                protein: Math.round(ing.per100g.protein * 10) / 10,
                fat: Math.round(ing.per100g.fat * 10) / 10,
                carbs: Math.round(ing.per100g.carbs * 10) / 10,
                fiber: Math.round(ing.per100g.fiber * 10) / 10,
                category: guessCategory(ing.name, ing.category),
                isUserCreated: true,
              });
            }
          }
          if (newFoods.length > 0) {
            foodDatabase.push(...newFoods);
            saveFoodDatabase(foodDatabase);
          }
        }

        const recipe: SavedRecipe = {
          id: generateId(),
          savedAt: new Date().toISOString(),
          name: data.name || "Foto-Rezept",
          servings: data.servings || 2,
          prepTime: data.prepTime || "–",
          ingredients: (data.ingredients || []).map((ing: any) => ({
            name: ing.name,
            amount: ing.amount || "",
            isMain: ing.isMain || false,
          })),
          steps: data.steps || [],
          totalMacros: data.totalMacros || { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
          perServing: data.perServing || { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
        };

        // Store the photo with the recipe
        recipe.photoUrl = base64;
        setSavedRecipes((prev) => [recipe, ...prev]);
        setExpandedId(recipe.id);
        setShowPhotoDialog(false);
        setPhotoPreview(null);
        toast({ title: "Rezept erstellt!", description: `${recipe.name} wurde aus dem Foto generiert.` });
      } catch (err) {
        console.error("Photo-to-recipe error:", err);
        setPhotoError("Verbindungsfehler. Bitte versuche es erneut.");
      } finally {
        setPhotoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRecipePhotoClick = (recipeId: string) => {
    setRecipePhotoTargetId(recipeId);
    recipePhotoInputRef.current?.click();
  };

  const handleRecipePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !recipePhotoTargetId) return;

    // Convert HEIC/HEIF to JPEG if needed
    try {
      file = await ensureCompatibleImage(file);
    } catch (err) {
      toast({ title: "Fehler", description: "Bildformat konnte nicht konvertiert werden. Bitte verwende JPG oder PNG.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawBase64 = ev.target?.result as string;
      const base64 = await resizeImageToDataUrl(rawBase64);
      setSavedRecipes((prev) =>
        prev.map((r) => r.id === recipePhotoTargetId ? { ...r, photoUrl: base64 } : r)
      );
      toast({ title: "Foto gespeichert!", description: "Das Rezeptfoto wurde hinzugefügt." });
      setRecipePhotoTargetId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteRecipePhoto = (recipeId: string) => {
    setSavedRecipes((prev) =>
      prev.map((r) => r.id === recipeId ? { ...r, photoUrl: undefined } : r)
    );
    toast({ title: "Foto entfernt" });
  };

  const handleAddToLog = (recipe: SavedRecipe) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const ps = recipe.perServing;
    // Flüssigkeit aus ml-Zutaten berechnen
    const recipeLiquidMl = recipe.ingredients.reduce((sum, ing) => {
      if (/ml\b/i.test(ing.amount)) {
        const match = ing.amount.match(/[\d.,]+/);
        return sum + (match ? parseFloat(match[0].replace(",", ".")) : 0);
      }
      return sum;
    }, 0);
    const entryLiquidMl = recipeLiquidMl > 0 ? Math.round(recipeLiquidMl / recipe.servings) : undefined;

    const entry: NutritionEntry = {
      id: generateId(),
      date: selectedDate,
      time,
      food: `${recipe.name} (1 Portion)`,
      amount: Math.round(ps.calories),
      calories: ps.calories,
      protein: ps.protein,
      carbs: ps.carbs,
      fat: ps.fat,
      fiber: ps.fiber,
      ...(entryLiquidMl ? { liquidMl: entryLiquidMl } : {}),
    };
    onAddEntry(entry);

    // Rezept auch als Lebensmittel in der DB speichern (Kategorie "Eigene")
    // Makros werden auf "pro 100g einer Portion" normalisiert
    // Flüssigkeit aus Zutaten mit "ml" erkennen (z.B. "500 ml Wasser", "200ml Brühe")
    let totalLiquidMl = 0;
    const portionWeight = recipe.ingredients.reduce((sum, ing) => {
      const match = ing.amount.match(/[\d.,]+/);
      const val = match ? parseFloat(match[0].replace(",", ".")) : 0;
      if (/ml\b/i.test(ing.amount)) {
        totalLiquidMl += val;
      }
      return sum + val;
    }, 0) || 100; // Fallback 100g wenn keine Mengen erkennbar
    const liquidPerServing = Math.round(totalLiquidMl / recipe.servings);
    const servingWeight = Math.round(portionWeight / recipe.servings);
    const factor = 100 / servingWeight;
    const foodItem: FoodItem = {
      name: recipe.name,
      baseUnit: "100g",
      baseAmount: 100,
      calories: Math.round(ps.calories * factor),
      protein: Math.round(ps.protein * factor * 10) / 10,
      fat: Math.round(ps.fat * factor * 10) / 10,
      carbs: Math.round(ps.carbs * factor * 10) / 10,
      fiber: Math.round(ps.fiber * factor * 10) / 10,
      defaultAmount: servingWeight,
      ...(liquidPerServing > 0 ? { liquidMl: liquidPerServing } : {}),
      category: "Eigene",
      isUserCreated: true,
    };
    addFoodItem(foodItem);

    toast({ title: "Übernommen!", description: `${recipe.name} wurde ins Tagesprotokoll eingetragen.` });
  };

  const startEditing = (recipe: SavedRecipe) => {
    setEditingId(recipe.id);
    setEditIngredients([...recipe.ingredients]);
    setNewIngredientAmount("");
    setNewIngredientName("");
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditIngredients([]);
    setNewIngredientAmount("");
    setNewIngredientName("");
    setSelectedFoodItem(null);
    setShowSuggestions(false);
  };

  const handleAmountChange = (index: number, newNum: string) => {
    setEditIngredients((prev) => {
      const updated = [...prev];
      const parsed = extractNumber(updated[index].amount);
      if (parsed) {
        updated[index] = { ...updated[index], amount: `${newNum}${parsed.rest ? " " + parsed.rest : ""}`.trim() };
      }
      return updated;
    });
  };

  const handleDeleteIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectSuggestion = (food: FoodItem) => {
    setNewIngredientName(food.name);
    setSelectedFoodItem(food);
    setShowSuggestions(false);
  };

  const handleAddIngredient = () => {
    const name = newIngredientName.trim();
    if (!name) return;
    const amount = newIngredientAmount.trim();
    const amountStr = amount ? `${amount}` : "";
    setEditIngredients((prev) => [...prev, { name, amount: amountStr, isMain: false }]);
    setNewIngredientAmount("");
    setNewIngredientName("");
    setSelectedFoodItem(null);
    setShowSuggestions(false);
  };

  const handleSaveEdits = async (recipeId: string) => {
    // Add pending new ingredient if present
    let finalIngredients = [...editIngredients];
    const pendingName = newIngredientName.trim();
    if (pendingName) {
      const pendingAmount = newIngredientAmount.trim();
      finalIngredients.push({ name: pendingName, amount: pendingAmount || "", isMain: false });
    }

    if (finalIngredients.length === 0) {
      toast({ title: "Fehler", description: "Das Rezept braucht mindestens eine Zutat.", variant: "destructive" });
      return;
    }

    const recipe = savedRecipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    // Always recalculate when user explicitly saves (even if ingredients look the same)

    // Recalculate macros via AI
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("recipe-recalculate", {
        body: {
          ingredients: finalIngredients,
          servings: recipe.servings,
          recipeName: recipe.name,
          oldSteps: recipe.steps,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
        setRecalculating(false);
        return;
      }

      const updatedIngredients = data.ingredients || finalIngredients;
      const totalMacros = data.totalMacros || recipe.totalMacros;
      const perServing = data.perServing || recipe.perServing;
      const updatedSteps = data.steps || recipe.steps;

      // Add new ingredients to food database
      if (data.ingredients && Array.isArray(data.ingredients)) {
        const existingNames = new Set(foodDatabase.map(f => f.name.toLowerCase()));
        const newFoods: FoodItem[] = [];

        for (const ing of data.ingredients) {
          if (!existingNames.has(ing.name.toLowerCase()) && ing.per100g) {
            newFoods.push({
              name: ing.name,
              baseUnit: "100g",
              baseAmount: 100,
              calories: Math.round(ing.per100g.calories),
              protein: Math.round(ing.per100g.protein * 10) / 10,
              fat: Math.round(ing.per100g.fat * 10) / 10,
              carbs: Math.round(ing.per100g.carbs * 10) / 10,
              fiber: Math.round(ing.per100g.fiber * 10) / 10,
              category: guessCategory(ing.name, ing.category),
              isUserCreated: true,
            });
          }
        }

        if (newFoods.length > 0) {
          foodDatabase.push(...newFoods);
          saveFoodDatabase(foodDatabase);
          toast({ title: `${newFoods.length} neue Zutat(en)`, description: "In passende Kategorien einsortiert." });
        }
      }

      setSavedRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? { ...r, ingredients: updatedIngredients, totalMacros, perServing, steps: updatedSteps }
            : r
        )
      );
      stopEditing();
      toast({ title: "Gespeichert", description: "Rezept, Nährwerte und Zubereitung wurden aktualisiert." });
    } catch (e) {
      console.error("Recalculate error:", e);
      toast({ title: "Fehler", description: "Nährwerte konnten nicht neu berechnet werden.", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  if (savedRecipes.length === 0 && !showManualForm) {
    return (
      <div className="glass-card rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Gespeicherte Rezepte (0)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualForm(true)}
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              title="Neues Rezept anlegen"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Neu</span>
            </button>
            <button
              onClick={handlePhotoCaptureClick}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Rezept aus Foto erstellen"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Noch keine gespeicherten Rezepte.</p>
          <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-background p-2 mt-3 mx-auto max-w-[280px]">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed text-left">
              Gehe zu Lebensmittel, klicke bis zu fünf Kochmützen an und lass dir von der KI ein Rezept erstellen – oder lade ein Bild über das Kamerasymbol hoch.
            </p>
          </div>
        </div>
        {/* Hidden file input for photo-to-recipe (empty state) */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoFileChange}
        />
        {/* Photo-to-Recipe Dialog (empty state) */}
        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4" />
                Rezept aus Foto
              </DialogTitle>
            </DialogHeader>
            {photoAnalyzing && (
              <div className="flex flex-col items-center gap-2 py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Foto wird analysiert…</p>
              </div>
            )}
            {photoError && <p className="text-xs text-destructive text-center py-4">{photoError}</p>}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Gespeicherte Rezepte ({savedRecipes.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            title="Neues Rezept anlegen"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-[10px] font-semibold">Neu</span>
          </button>
          <button
            onClick={handlePhotoCaptureClick}
            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Rezept aus Foto erstellen"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showManualForm && (
        <div className="mb-2">
          <ManualRecipeForm onSave={handleManualSave} onCancel={() => setShowManualForm(false)} />
        </div>
      )}

      <div className="space-y-1.5">
        {savedRecipes.map((sr) => {
          const isEditing = editingId === sr.id;
          const displayIngredients = isEditing ? editIngredients : sr.ingredients;

          return (
            <div key={sr.id} className="rounded-lg bg-background border border-border/50">
              {/* Header row */}
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <button
                  onClick={() => setExpandedId(expandedId === sr.id ? null : sr.id)}
                  className="flex-1 text-left flex items-center gap-1.5"
                >
                  {expandedId === sr.id ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
                  <div>
                    <span className="block text-[11px] font-medium text-foreground">{sr.name}</span>
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      {sr.perServing.calories} kcal/Portion · {sr.servings} Portionen
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleWhatsAppShare(sr)}
                    className="p-1 rounded text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                    title="Via WhatsApp teilen"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleShare(sr)}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Rezept teilen"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(sr.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Rezept löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === sr.id && (() => {
                // Compute per-ingredient kcal so totals are always consistent with what's displayed
                const ingKcals: (number | null)[] = (isEditing ? editIngredients : sr.ingredients).map((ing) => {
                  const parsed = extractNumber(ing.amount);
                  if (!parsed) return null;
                  const val = parseFloat(parsed.num.replace(",", "."));
                  if (val <= 0) return null;
                  if ((ing as any).per100g?.calories != null) {
                    return Math.round(((ing as any).per100g.calories / 100) * val);
                  }
                  const ingNameLower = ing.name.toLowerCase();
                  const food = foodDatabase.find((f) => f.name.toLowerCase() === ingNameLower)
                    || foodDatabase.find((f) => ingNameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(ingNameLower));
                  if (food) return Math.round((food.calories / food.baseAmount) * val);
                  return null;
                });
                const allHaveKcal = ingKcals.every((v) => v !== null);
                const sumKcal = allHaveKcal ? ingKcals.reduce((s, v) => s! + v!, 0)! : null;

                // Derive consistent totals: use summed ingredient kcal when available, keep AI ratios for macros
                const displayTotal = { ...sr.totalMacros };
                const displayPerServing = { ...sr.perServing };
                if (sumKcal !== null && sr.totalMacros.calories > 0) {
                  const ratio = sumKcal / sr.totalMacros.calories;
                  displayTotal.calories = sumKcal;
                  displayTotal.protein = Math.round(sr.totalMacros.protein * ratio * 10) / 10;
                  displayTotal.fat = Math.round(sr.totalMacros.fat * ratio * 10) / 10;
                  displayTotal.carbs = Math.round(sr.totalMacros.carbs * ratio * 10) / 10;
                  displayTotal.fiber = Math.round(sr.totalMacros.fiber * ratio * 10) / 10;
                  displayPerServing.calories = Math.round(sumKcal / sr.servings);
                  displayPerServing.protein = Math.round(displayTotal.protein / sr.servings * 10) / 10;
                  displayPerServing.fat = Math.round(displayTotal.fat / sr.servings * 10) / 10;
                  displayPerServing.carbs = Math.round(displayTotal.carbs / sr.servings * 10) / 10;
                  displayPerServing.fiber = Math.round(displayTotal.fiber / sr.servings * 10) / 10;
                }

                return (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/30 pt-2">
                  {/* Ingredients + Photo stacked */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zutaten</p>
                        {!isEditing ? (
                          <button
                            onClick={() => startEditing(sr)}
                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Zutaten bearbeiten"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveEdits(sr.id)}
                            disabled={recalculating}
                            className="p-0.5 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                            title="Änderungen speichern"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {displayIngredients.map((ing, i) => {
                          const parsed = extractNumber(ing.amount);
                          const hasNumber = !!parsed;

                          const ingKcal = ingKcals[i];

                          return (
                            <li key={i} className="text-[11px] text-foreground flex items-baseline gap-0">
                              {isEditing && (
                                <button
                                  onClick={() => handleDeleteIngredient(i)}
                                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0 mr-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                              {isEditing && hasNumber ? (
                                <span className="flex items-center gap-1">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={parsed!.num}
                                    onChange={(e) => handleAmountChange(i, e.target.value)}
                                    className="h-6 w-14 px-1 text-[11px] text-center font-medium"
                                  />
                                  <span>{parsed!.rest} {ing.name}{ing.isMain ? " ⭐" : ""}</span>
                                </span>
                              ) : (
                                <>
                                  <span className="inline-block w-[5ch] text-right font-medium shrink-0 font-mono text-[10px]">
                                    {parsed ? parsed.num : ""}
                                  </span>
                                  <span className="inline-block w-[3ch] text-left shrink-0 font-mono text-[10px] ml-px">
                                    {parsed ? ` ${parsed.rest}` : ing.amount ? ing.amount : ""}
                                  </span>
                                  <span className="ml-1">
                                    {ing.name}{ing.isMain ? " ⭐" : ""}
                                    {ingKcal !== null && (
                                      <span className="font-medium text-muted-foreground"> ({ingKcal} kcal)</span>
                                    )}
                                  </span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Add ingredient fields in edit mode */}
                      {isEditing && (
                        <div className="relative flex items-center gap-1 mt-1.5">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={newIngredientAmount}
                            onChange={(e) => setNewIngredientAmount(e.target.value)}
                            placeholder="Menge"
                            className="h-6 text-[11px] px-2 w-16 shrink-0"
                          />
                          <div className="relative flex-1">
                            <Input
                              ref={nameInputRef}
                              type="text"
                              value={newIngredientName}
                              onChange={(e) => {
                                setNewIngredientName(e.target.value);
                                setSelectedFoodItem(null);
                                setShowSuggestions(true);
                              }}
                              onFocus={() => newIngredientName.trim().length >= 1 && setShowSuggestions(true)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                              placeholder="Zutat hinzufügen…"
                              className="h-6 text-[11px] px-2 w-full"
                            />
                            {showSuggestions && foodSuggestions.length > 0 && (
                              <div
                                ref={suggestionsRef}
                                className="absolute left-0 right-0 top-full mt-0.5 z-50 max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
                              >
                                {foodSuggestions.map((food, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    className="w-full text-left px-2 py-1 text-[11px] text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectSuggestion(food)}
                                  >
                                    <span className="font-medium">{food.name}</span>
                                    <span className="ml-1.5 text-muted-foreground">
                                      {food.calories} kcal
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleAddIngredient}
                            disabled={!newIngredientName.trim()}
                            className="p-0.5 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Servings + Time under ingredients */}
                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-1.5">
                        <span>👥 {sr.servings} Portionen</span>
                        <span>⏱️ {sr.prepTime}</span>
                      </div>
                    </div>

                    {/* Recipe Photo – below ingredients */}
                    {sr.photoUrl ? (
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Foto</span>
                          <button
                            onClick={() => handleRecipePhotoClick(sr.id)}
                            className="p-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Foto ändern"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="relative w-full max-w-[280px] aspect-[4/3] rounded-lg overflow-hidden border border-border/50 group">
                          <img src={sr.photoUrl} alt={sr.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeleteRecipePhoto(sr.id)}
                            className="absolute top-1 right-1 p-0.5 rounded bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Foto entfernen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRecipePhotoClick(sr.id)}
                        className="flex items-center gap-1.5 py-1 px-2 rounded-md border border-dashed border-border/60 text-muted-foreground/50 hover:border-primary/40 hover:text-primary/50 transition-colors cursor-pointer"
                        title="Foto hinzufügen"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Foto hinzufügen</span>
                      </button>
                    )}
                  </div>

                  {/* Steps */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zubereitung</p>
                    <ol className="space-y-1">
                      {sr.steps.map((step, i) => (
                        <li key={i} className="text-[11px] text-foreground leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Macros */}
                  <div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-semibold pb-1 text-[10px] uppercase tracking-wider">Nährstoffe</th>
                        <th className="text-right font-medium pb-1">kcal</th>
                        <th className="text-right font-medium pb-1" style={{ color: "hsl(var(--macro-pro))" }}>Pro</th>
                        <th className="text-right font-medium pb-1" style={{ color: "hsl(var(--macro-fat))" }}>Fat</th>
                        <th className="text-right font-medium pb-1" style={{ color: "hsl(var(--macro-kh))" }}>KH</th>
                        <th className="text-right font-medium pb-1" style={{ color: "hsl(var(--macro-fib))" }}>Fib</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-foreground">
                        <td className="font-semibold pr-2 py-0.5">Gesamt</td>
                        <td className="text-right py-0.5">{displayTotal.calories}</td>
                        <td className="text-right py-0.5">{displayTotal.protein}</td>
                        <td className="text-right py-0.5">{displayTotal.fat}</td>
                        <td className="text-right py-0.5">{displayTotal.carbs}</td>
                        <td className="text-right py-0.5">{displayTotal.fiber}</td>
                      </tr>
                      <tr className="text-foreground">
                        <td className="font-semibold pr-2 py-0.5">Pro Portion</td>
                        <td className="text-right py-0.5">{displayPerServing.calories}</td>
                        <td className="text-right py-0.5">{displayPerServing.protein}</td>
                        <td className="text-right py-0.5">{displayPerServing.fat}</td>
                        <td className="text-right py-0.5">{displayPerServing.carbs}</td>
                        <td className="text-right py-0.5">{displayPerServing.fiber}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddToLog(sr)}
                      disabled={recalculating}
                      className="flex-1 h-9 text-xs gap-1.5"
                    >
                      Portion buchen
                    </Button>
                    {isEditing && (
                      <Button
                        onClick={() => handleSaveEdits(sr.id)}
                        disabled={recalculating}
                        variant="default"
                        className="flex-1 h-9 text-xs gap-1.5"
                      >
                        {recalculating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Berechne…
                          </>
                        ) : (
                          "Rezept speichern"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Hidden file input for photo-to-recipe */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* Hidden file input for recipe photo upload */}
      <input
        ref={recipePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleRecipePhotoChange}
      />

      {/* Photo-to-Recipe Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" />
              Rezept aus Foto
            </DialogTitle>
          </DialogHeader>

          {photoPreview && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={photoPreview} alt="Gericht" className="w-full h-48 object-cover" />
            </div>
          )}

          {photoAnalyzing && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">KI erstellt Rezept aus Foto…</p>
            </div>
          )}

          {photoError && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {photoError}
            </div>
          )}

          {!photoAnalyzing && !photoError && photoPreview && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Rezept wurde erstellt und gespeichert!
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipesTab;
