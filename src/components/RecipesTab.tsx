import { useState, useEffect, useRef, useMemo } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Trash2, ChevronDown, ChevronUp, Sparkles, Pencil, Check, Plus, Loader2, Share2, PlusCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { foodDatabase, saveFoodDatabase, type FoodItem } from "@/data/foodDatabase";
import ManualRecipeForm from "@/components/ManualRecipeForm";

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

  const handleDelete = (id: string) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
    toast({ title: "Gelöscht", description: "Rezept wurde entfernt." });
  };

  const buildShareText = (recipe: SavedRecipe) => {
    const ingredientsList = recipe.ingredients
      .map((ing) => `${ing.amount ? ing.amount + " " : ""}${ing.name}`)
      .join("\n");
    const stepsList = recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const ps = recipe.perServing;
    return `🍽️ ${recipe.name}\n\n👥 ${recipe.servings} Portionen · ⏱️ ${recipe.prepTime}\n\n📋 Zutaten:\n${ingredientsList}\n\n👨‍🍳 Zubereitung:\n${stepsList}\n\n📊 Pro Portion: ${ps.calories} kcal | Protein: ${ps.protein}g | Fett: ${ps.fat}g | Kohlenhydrate: ${ps.carbs}g | Ballaststoffe: ${ps.fiber}g\n\n━━━━━━━━━━━━━━━━━━━━\n📊 MampfLogger · mampflogger.de\nHol dir die kostenlose App!\n\n▸ Keine Anmeldung · Keine Werbung · Keine Kosten`;
  };

  const handleShare = async (recipe: SavedRecipe) => {
    const text = buildShareText(recipe);

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        // User cancelled share
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

  const handleAddToLog = (recipe: SavedRecipe) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const ps = recipe.perServing;
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
    };
    onAddEntry(entry);
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

    // Check if anything actually changed
    const origStr = JSON.stringify(recipe.ingredients);
    const newStr = JSON.stringify(finalIngredients);
    if (origStr === newStr) {
      stopEditing();
      return;
    }

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
          <button
            onClick={() => setShowManualForm(true)}
            className="text-primary hover:text-primary/80 transition-colors"
            title="Neues Rezept anlegen"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Noch keine gespeicherten Rezepte.</p>
          <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-background p-2 mt-3 mx-auto max-w-[280px]">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed text-left">
              Gehe zu Lebensmittel, klicke bis zu fünf Kochmützen an und lass dir von der KI ein Rezept erstellen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Gespeicherte Rezepte ({savedRecipes.length})
        </h2>
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-primary hover:text-primary/80 transition-colors"
          title="Neues Rezept anlegen"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
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
              {expandedId === sr.id && (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/30 pt-2">
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>👥 {sr.servings} Portionen</span>
                    <span>⏱️ {sr.prepTime}</span>
                  </div>

                  {/* Ingredients */}
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
                        <td className="text-right py-0.5">{sr.totalMacros.calories}</td>
                        <td className="text-right py-0.5">{sr.totalMacros.protein}</td>
                        <td className="text-right py-0.5">{sr.totalMacros.fat}</td>
                        <td className="text-right py-0.5">{sr.totalMacros.carbs}</td>
                        <td className="text-right py-0.5">{sr.totalMacros.fiber}</td>
                      </tr>
                      <tr className="text-foreground">
                        <td className="font-semibold pr-2 py-0.5">Pro Portion</td>
                        <td className="text-right py-0.5">{sr.perServing.calories}</td>
                        <td className="text-right py-0.5">{sr.perServing.protein}</td>
                        <td className="text-right py-0.5">{sr.perServing.fat}</td>
                        <td className="text-right py-0.5">{sr.perServing.carbs}</td>
                        <td className="text-right py-0.5">{sr.perServing.fiber}</td>
                      </tr>
                    </tbody>
                  </table>

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
                        variant="outline"
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecipesTab;
