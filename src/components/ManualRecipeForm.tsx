import { useState, useRef, useMemo, useEffect } from "react";
import { generateId } from "@/types/nutrition";
import { X, Plus, Loader2, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { foodDatabase, saveFoodDatabase, guessCategory, type FoodItem } from "@/data/foodDatabase";

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
}

interface ManualRecipeFormProps {
  onSave: (recipe: SavedRecipe) => void;
  onCancel: () => void;
}

const ManualRecipeForm = ({ onSave, onCancel }: ManualRecipeFormProps) => {
  const [name, setName] = useState("");
  const [servings, setServings] = useState("2");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stepsText, setStepsText] = useState("");
  const [aiGenerateSteps, setAiGenerateSteps] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const recipeNameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-focus recipe name field on mount
  useEffect(() => {
    setTimeout(() => recipeNameInputRef.current?.focus(), 100);
  }, []);

  const foodSuggestions = useMemo(() => {
    const q = newIngredientName.trim().toLowerCase();
    if (q.length < 1) return [];
    return foodDatabase
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [newIngredientName]);

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

  const handleSelectSuggestion = (food: FoodItem) => {
    setNewIngredientName(food.name);
    setShowSuggestions(false);
  };

  const handleAddIngredient = () => {
    const n = newIngredientName.trim();
    if (!n) return;
    const a = newIngredientAmount.trim();
    setIngredients((prev) => [...prev, { name: n, amount: a, isMain: false }]);
    setNewIngredientAmount("");
    setNewIngredientName("");
    setShowSuggestions(false);
  };

  const handleDeleteIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Fehler", description: "Bitte gib einen Rezeptnamen ein.", variant: "destructive" });
      return;
    }

    // Add pending ingredient
    let finalIngredients = [...ingredients];
    const pendingName = newIngredientName.trim();
    if (pendingName) {
      finalIngredients.push({ name: pendingName, amount: newIngredientAmount.trim(), isMain: false });
    }

    if (finalIngredients.length === 0) {
      toast({ title: "Fehler", description: "Füge mindestens eine Zutat hinzu.", variant: "destructive" });
      return;
    }

    const servingsNum = Math.max(1, parseInt(servings) || 1);
    const userSteps = stepsText.trim()
      ? stepsText.trim().split("\n").filter((s) => s.trim())
      : [];

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("recipe-recalculate", {
        body: {
          ingredients: finalIngredients,
          servings: servingsNum,
          recipeName: name.trim(),
          oldSteps: userSteps.length > 0 && !aiGenerateSteps ? userSteps : [],
          generateSteps: aiGenerateSteps || userSteps.length === 0,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
        setSaving(false);
        return;
      }

      const totalMacros = data.totalMacros || { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
      const perServing = data.perServing || { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
      const steps = data.steps || userSteps;
      const updatedIngredients = data.ingredients || finalIngredients;

      // Add new foods to database
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
        name: name.trim(),
        servings: servingsNum,
        prepTime: prepTime.trim() || "–",
        ingredients: updatedIngredients,
        steps,
        totalMacros,
        perServing,
      };

      onSave(recipe);
      toast({ title: "Gespeichert!", description: `${recipe.name} wurde angelegt.` });
    } catch (e) {
      console.error("Manual recipe save error:", e);
      toast({ title: "Fehler", description: "Rezept konnte nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-background border border-border/50 p-3 space-y-3">
      {/* Header with close */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Neues Rezept</h3>
        <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Name */}
      <Input
        ref={recipeNameInputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name des Rezepts"
        className="h-8 text-[12px] px-2"
      />

      {/* Servings + Time */}
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[11px] text-muted-foreground shrink-0">👥</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="Portionen"
            className="h-7 text-[11px] px-2"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[11px] text-muted-foreground shrink-0">⏱️</span>
          <Input
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="z.B. 30 Min."
            className="h-7 text-[11px] px-2"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zutaten</p>
        {ingredients.length > 0 && (
          <ul className="space-y-0.5 mb-1.5">
            {ingredients.map((ing, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-center gap-1.5">
                <button
                  onClick={() => handleDeleteIngredient(i)}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
                <span>•</span>
                {ing.amount && <span className="font-medium">{ing.amount}</span>}
                {ing.amount ? " " : ""}{ing.name}
              </li>
            ))}
          </ul>
        )}

        {/* Add ingredient row */}
        <div className="relative flex items-center gap-1">
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
                    <span className="ml-1.5 text-muted-foreground">{food.calories} kcal</span>
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
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zubereitung</p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={aiGenerateSteps}
              onCheckedChange={(v) => setAiGenerateSteps(!!v)}
              className="h-3 w-3"
            />
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              KI generieren
            </span>
          </label>
        </div>
        <Textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={aiGenerateSteps ? "Wird von der KI generiert…" : "Zubereitungsschritte eingeben…"}
          disabled={aiGenerateSteps}
          className="text-[11px] min-h-[60px] px-2 py-1.5 resize-none"
          rows={3}
          style={{ height: "auto", minHeight: "60px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
        />
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-9 text-xs gap-1.5"
      >
        {saving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Berechne…
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Rezept speichern
          </>
        )}
      </Button>
    </div>
  );
};

export default ManualRecipeForm;
