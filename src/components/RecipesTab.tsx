import { useState, useEffect } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface RecipesTabProps {
  entries: NutritionEntry[];
  selectedDate: string;
  onAddEntry: (entry: NutritionEntry) => void;
}

const RecipesTab = ({ entries, selectedDate, onAddEntry }: RecipesTabProps) => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(loadSavedRecipes);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    saveSavedRecipes(savedRecipes);
  }, [savedRecipes]);

  const handleDelete = (id: string) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
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
        {savedRecipes.map((sr) => (
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
                  onClick={() => handleAddToLog(sr)}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="1 Portion ins Protokoll"
                >
                  <Plus className="w-3 h-3" />
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zutaten</p>
                  <ul className="space-y-0.5">
                    {sr.ingredients.map((ing, i) => (
                      <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                        <span className="shrink-0 mt-0.5">{ing.isMain ? "⭐" : "•"}</span>
                        <span><span className="font-medium">{ing.amount}</span> {ing.name}</span>
                      </li>
                    ))}
                  </ul>
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
                <Button
                  onClick={() => handleAddToLog(sr)}
                  className="w-full h-9 text-xs gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  1 Portion übernehmen
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecipesTab;
