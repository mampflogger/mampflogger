import { useState, useEffect, useRef, useMemo } from "react";
import { FoodItem, foodDatabase, saveFoodDatabase } from "@/data/foodDatabase";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Plus, Check, Trash2, Save, Sparkles, Pencil } from "lucide-react";
import CookIcon from "@/components/CookIcon";
import { useToast } from "@/hooks/use-toast";

interface RecipeIngredient {
  name: string;
  amount: string;
  isMain: boolean;
}

interface RecipeMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface Recipe {
  name: string;
  servings: number;
  prepTime: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  totalMacros: RecipeMacros;
  perServing: RecipeMacros;
}

interface SavedRecipe extends Recipe {
  id: string;
  savedAt: string;
}

interface RecipeGeneratorProps {
  selectedFoods: FoodItem[];
  onRemoveFood: (name: string) => void;
  onClearAll: () => void;
  entries: NutritionEntry[];
  selectedDate: string;
  onAddEntry: (entry: NutritionEntry) => void;
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
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
}

function getFrequentFoods(entries: NutritionEntry[]): { name: string }[] {
  const counts: Record<string, number> = {};
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const cutoff = last30.toISOString().slice(0, 10);

  entries
    .filter((e) => e.date >= cutoff)
    .forEach((e) => {
      counts[e.food] = (counts[e.food] || 0) + 1;
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => ({ name }));
}

function extractNumber(amount: string): { num: string; rest: string } | null {
  const m = amount.match(/^(\d+[\d.,]*)\s*(.*)/);
  if (m) return { num: m[1], rest: m[2] };
  return null;
}

const RecipeGenerator = ({
  selectedFoods,
  onRemoveFood,
  onClearAll,
  entries,
  selectedDate,
  onAddEntry,
}: RecipeGeneratorProps) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(loadSavedRecipes);
  const [showSaved, setShowSaved] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editIngredients, setEditIngredients] = useState<RecipeIngredient[]>([]);
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  // Reset recipe when all foods are manually removed
  useEffect(() => {
    if (selectedFoods.length === 0) {
      setRecipe(null);
      setAdded(false);
      setSaved(false);
      stopEditing();
    }
  }, [selectedFoods.length]);

  const startEditing = () => {
    if (!recipe) return;
    setIsEditing(true);
    setEditIngredients([...recipe.ingredients]);
    setNewIngredientAmount("");
    setNewIngredientName("");
  };

  const stopEditing = () => {
    setIsEditing(false);
    setEditIngredients([]);
    setNewIngredientAmount("");
    setNewIngredientName("");
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
    setShowSuggestions(false);
  };

  const handleAddIngredient = () => {
    const name = newIngredientName.trim();
    if (!name) return;
    const amount = newIngredientAmount.trim();
    setEditIngredients((prev) => [...prev, { name, amount: amount || "", isMain: false }]);
    setNewIngredientAmount("");
    setNewIngredientName("");
    setShowSuggestions(false);
  };

  const handleSaveEdits = async () => {
    if (!recipe) return;

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

    const origStr = JSON.stringify(recipe.ingredients);
    const newStr = JSON.stringify(finalIngredients);
    if (origStr === newStr) {
      stopEditing();
      return;
    }

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
              category: "Eigene",
              isUserCreated: true,
            });
          }
        }

        if (newFoods.length > 0) {
          foodDatabase.push(...newFoods);
          saveFoodDatabase(foodDatabase);
          toast({ title: `${newFoods.length} neue Zutat(en)`, description: "In Lebensmittelliste unter 'Eigene' gespeichert." });
        }
      }

      setRecipe({ ...recipe, ingredients: updatedIngredients, totalMacros, perServing, steps: updatedSteps });
      setSaved(false);
      stopEditing();
      toast({ title: "Aktualisiert", description: "Rezept, Nährwerte und Zubereitung wurden neu berechnet." });
    } catch (e) {
      console.error("Recalculate error:", e);
      toast({ title: "Fehler", description: "Nährwerte konnten nicht neu berechnet werden.", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedFoods.length === 0) return;
    setLoading(true);
    setRecipe(null);
    setAdded(false);
    setSaved(false);
    stopEditing();
    try {
      const frequentFoods = getFrequentFoods(entries);
      const { data, error } = await supabase.functions.invoke("recipe-generator", {
        body: { selectedFoods, frequentFoods },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
        return;
      }

      setRecipe(data);
    } catch (e) {
      console.error("Recipe error:", e);
      toast({ title: "Fehler", description: "Rezept konnte nicht generiert werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = () => {
    if (!recipe) return;
    const savedEntry: SavedRecipe = {
      ...recipe,
      id: generateId(),
      savedAt: new Date().toISOString(),
    };
    setSavedRecipes((prev) => [savedEntry, ...prev]);
    setSaved(true);
    toast({ title: "Gespeichert!", description: `${recipe.name} wurde zu deinen Rezepten hinzugefügt.` });
  };

  const handleDeleteSaved = (id: string) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Gelöscht", description: "Rezept wurde entfernt." });
  };

  const handleLoadSaved = (saved: SavedRecipe) => {
    const { id, savedAt, ...recipeData } = saved;
    setRecipe(recipeData);
    setAdded(false);
    setSaved(false);
    setShowSaved(false);
    stopEditing();
  };

  const handleClearAll = () => {
    onClearAll();
    setRecipe(null);
    setAdded(false);
    setSaved(false);
    setShowSaved(false);
    stopEditing();
  };

  const handleAddToLog = (r?: Recipe) => {
    const target = r || recipe;
    if (!target) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const ps = target.perServing;

    const entry: NutritionEntry = {
      id: generateId(),
      date: selectedDate,
      time,
      food: `${target.name} (1 Portion)`,
      amount: Math.round(ps.calories),
      calories: ps.calories,
      protein: ps.protein,
      carbs: ps.carbs,
      fat: ps.fat,
      fiber: ps.fiber,
    };

    onAddEntry(entry);
    if (!r) setAdded(true);
    toast({ title: "Übernommen!", description: `${target.name} wurde ins Tagesprotokoll eingetragen.` });
  };

  const hasContent = selectedFoods.length > 0 || savedRecipes.length > 0;
  if (!hasContent) return null;

  const displayIngredients = isEditing ? editIngredients : (recipe?.ingredients || []);

  return (
    <div className="glass-card rounded-xl p-3 mt-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CookIcon className="w-3.5 h-3.5" />
          KI-Rezeptgenerator
        </h2>
        <div className="flex items-center gap-1">
          {selectedFoods.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 text-[10px] px-2">
              Alle entfernen
            </Button>
          )}
        </div>
      </div>

      {/* Hint text */}
      {!recipe && selectedFoods.length === 0 && (
        <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-background p-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Klicke bis zu fünf Kochmützen <CookIcon className="w-3.5 h-3.5 inline-block text-primary align-text-bottom" /> in der Zutatenliste an und lass dir von der KI ein Rezept erstellen.
          </p>
        </div>
      )}

      {/* Selected ingredients chips */}
      {selectedFoods.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedFoods.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted border border-border text-foreground text-[11px] font-medium"
              >
                {f.name}
                <button onClick={() => onRemoveFood(f.name)} className="hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || selectedFoods.length === 0}
            className="w-full h-9 text-xs gap-2"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CookIcon className="w-3.5 h-3.5" />
            )}
            {loading ? "Rezept wird erstellt…" : "Rezept generieren"}
          </Button>
        </>
      )}

      {/* Recipe result */}
      {recipe && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Title & meta */}
           <div className="rounded-lg bg-background border border-border/50 p-3">
            <h3 className="text-sm font-bold text-foreground">{recipe.name}</h3>
            <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
              <span>👥 {recipe.servings} Portionen</span>
              <span>⏱️ {recipe.prepTime}</span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zutaten</p>
              {!isEditing ? (
                <button
                  onClick={startEditing}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Zutaten bearbeiten"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleSaveEdits}
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

                return (
                  <li key={i} className="text-[11px] text-foreground flex items-center gap-1.5">
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteIngredient(i)}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <span className="shrink-0">{ing.isMain ? "⭐" : "•"}</span>
                    {isEditing && hasNumber ? (
                      <span className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={parsed!.num}
                          onChange={(e) => handleAmountChange(i, e.target.value)}
                          className="h-6 w-14 px-1 text-[11px] text-center font-medium"
                        />
                        <span>{parsed!.rest} {ing.name}</span>
                      </span>
                    ) : (
                      <span>
                        {ing.amount && <span className="font-medium">{ing.amount}</span>}
                        {ing.amount ? " " : ""}{ing.name}
                      </span>
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
            )}
          </div>

          {/* Steps */}
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Zubereitung</p>
            <ol className="space-y-1">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-[11px] text-foreground leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Macros */}
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nährwerte</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium pb-1"></th>
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
                  <td className="text-right py-0.5">{recipe.totalMacros.calories}</td>
                  <td className="text-right py-0.5">{recipe.totalMacros.protein}</td>
                  <td className="text-right py-0.5">{recipe.totalMacros.fat}</td>
                  <td className="text-right py-0.5">{recipe.totalMacros.carbs}</td>
                  <td className="text-right py-0.5">{recipe.totalMacros.fiber}</td>
                </tr>
                <tr className="text-foreground">
                  <td className="font-semibold pr-2 py-0.5">Pro Portion</td>
                  <td className="text-right py-0.5">{recipe.perServing.calories}</td>
                  <td className="text-right py-0.5">{recipe.perServing.protein}</td>
                  <td className="text-right py-0.5">{recipe.perServing.fat}</td>
                  <td className="text-right py-0.5">{recipe.perServing.carbs}</td>
                  <td className="text-right py-0.5">{recipe.perServing.fiber}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleAddToLog()}
              disabled={added || recalculating}
              className="flex-1 h-9 text-xs gap-2"
              variant={added ? "outline" : "default"}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Eingetragen
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  1 Portion übernehmen
                </>
              )}
            </Button>
            {isEditing ? (
              <Button
                onClick={handleSaveEdits}
                disabled={recalculating}
                variant="outline"
                className="flex-1 h-9 text-xs gap-1.5"
              >
                {recalculating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Berechne…
                  </>
                ) : (
                  "Änderungen übernehmen"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSaveRecipe}
                disabled={saved}
                variant={saved ? "outline" : "default"}
                className="flex-1 h-9 text-xs gap-1.5"
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Gespeichert
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Speichern
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Saved recipes list - below current recipe */}
      {showSaved && savedRecipes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gespeicherte Rezepte</p>
          {savedRecipes.map((sr) => (
            <div
              key={sr.id}
              className="flex items-center justify-between rounded-lg bg-background border border-border/50 px-2.5 py-1.5"
            >
              <button
                onClick={() => handleLoadSaved(sr)}
                className="flex-1 text-left hover:text-primary transition-colors"
              >
                <span className="block text-[11px] font-medium text-foreground">{sr.name}</span>
                <span className="block text-[10px] text-muted-foreground font-normal">
                  {sr.perServing.calories} kcal/Portion
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleAddToLog(sr)}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="1 Portion ins Protokoll"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteSaved(sr.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Rezept löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeGenerator;
