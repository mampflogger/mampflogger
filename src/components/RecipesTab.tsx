import { useState, useEffect } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Trash2, ChevronDown, ChevronUp, Sparkles, Pencil, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  const [newIngredientText, setNewIngredientText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    saveSavedRecipes(savedRecipes);
  }, [savedRecipes]);

  const handleDelete = (id: string) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
    toast({ title: "Gelöscht", description: "Rezept wurde entfernt." });
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
    setNewIngredientText("");
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditIngredients([]);
    setNewIngredientText("");
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

  const handleAddIngredient = () => {
    const text = newIngredientText.trim();
    if (!text) return;
    setEditIngredients((prev) => [...prev, { name: text, amount: "", isMain: false }]);
    setNewIngredientText("");
  };

  const handleSaveEdits = (recipeId: string) => {
    // Add pending new ingredient if text is present
    let finalIngredients = [...editIngredients];
    const pendingText = newIngredientText.trim();
    if (pendingText) {
      finalIngredients.push({ name: pendingText, amount: "", isMain: false });
    }

    setSavedRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, ingredients: finalIngredients } : r
      )
    );
    stopEditing();
    toast({ title: "Gespeichert", description: "Rezept wurde aktualisiert." });
  };

  if (savedRecipes.length === 0) {
    return (
      <div className="glass-card rounded-xl p-3">
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
      <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Gespeicherte Rezepte ({savedRecipes.length})
      </h2>
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
                          className="p-0.5 rounded text-primary hover:bg-primary/10 transition-colors"
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
                            {isEditing && !hasNumber && (
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

                    {/* Add ingredient field in edit mode */}
                    {isEditing && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Input
                          type="text"
                          value={newIngredientText}
                          onChange={(e) => setNewIngredientText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                          placeholder="Zutat hinzufügen…"
                          className="h-6 text-[11px] px-2 flex-1"
                        />
                        <button
                          onClick={handleAddIngredient}
                          disabled={!newIngredientText.trim()}
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
                      className="flex-1 h-9 text-xs gap-1.5"
                    >
                      +1 Portion buchen
                    </Button>
                    {isEditing && (
                      <Button
                        onClick={() => handleSaveEdits(sr.id)}
                        variant="outline"
                        className="flex-1 h-9 text-xs gap-1.5"
                      >
                        Rezept speichern
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
