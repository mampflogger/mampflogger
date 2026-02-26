import { useState } from "react";
import { FoodItem } from "@/data/foodDatabase";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChefHat, Loader2, X, Plus, Check } from "lucide-react";
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

interface RecipeGeneratorProps {
  selectedFoods: FoodItem[];
  onRemoveFood: (name: string) => void;
  onClearAll: () => void;
  entries: NutritionEntry[];
  selectedDate: string;
  onAddEntry: (entry: NutritionEntry) => void;
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
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (selectedFoods.length === 0) return;
    setLoading(true);
    setRecipe(null);
    setAdded(false);
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

  const handleAddToLog = () => {
    if (!recipe) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const ps = recipe.perServing;

    const entry: NutritionEntry = {
      id: generateId(),
      date: selectedDate,
      time,
      food: `🍳 ${recipe.name} (1 Portion)`,
      amount: Math.round(ps.calories), // Use calories as "amount" placeholder
      calories: ps.calories,
      protein: ps.protein,
      carbs: ps.carbs,
      fat: ps.fat,
      fiber: ps.fiber,
    };

    onAddEntry(entry);
    setAdded(true);
    toast({ title: "Übernommen!", description: `${recipe.name} wurde ins Tagesprotokoll eingetragen.` });
  };

  if (selectedFoods.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ChefHat className="w-3.5 h-3.5" />
          KI-Rezeptgenerator
        </h2>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-[10px] px-2">
          Alle entfernen
        </Button>
      </div>

      {/* Selected ingredients chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {selectedFoods.map((f) => (
          <span
            key={f.name}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-medium"
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
          <ChefHat className="w-3.5 h-3.5" />
        )}
        {loading ? "Rezept wird erstellt…" : `🍳 Rezept generieren (${selectedFoods.length} Zutaten)`}
      </Button>

      {/* Recipe result */}
      {recipe && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Title & meta */}
          <div className="rounded-lg bg-accent/40 border border-border/50 p-3">
            <h3 className="text-sm font-bold text-foreground">{recipe.name}</h3>
            <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
              <span>👥 {recipe.servings} Portionen</span>
              <span>⏱️ {recipe.prepTime}</span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="rounded-lg bg-accent/40 border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Zutaten</p>
            <ul className="space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">{ing.isMain ? "⭐" : "•"}</span>
                  <span>
                    <span className="font-medium">{ing.amount}</span> {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="rounded-lg bg-accent/40 border border-border/50 p-3">
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
          <div className="rounded-lg bg-accent/40 border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nährwerte</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="font-semibold text-foreground mb-0.5">Gesamt ({recipe.servings} Portionen)</p>
                <div className="space-y-0.5 text-muted-foreground">
                  <p>{recipe.totalMacros.calories} kcal</p>
                  <p style={{ color: "hsl(var(--macro-pro))" }}>P: {recipe.totalMacros.protein}g</p>
                  <p style={{ color: "hsl(var(--macro-fat))" }}>F: {recipe.totalMacros.fat}g</p>
                  <p style={{ color: "hsl(var(--macro-kh))" }}>KH: {recipe.totalMacros.carbs}g</p>
                  <p style={{ color: "hsl(var(--macro-fib))" }}>Bal: {recipe.totalMacros.fiber}g</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-0.5">Pro Portion</p>
                <div className="space-y-0.5 text-muted-foreground">
                  <p>{recipe.perServing.calories} kcal</p>
                  <p style={{ color: "hsl(var(--macro-pro))" }}>P: {recipe.perServing.protein}g</p>
                  <p style={{ color: "hsl(var(--macro-fat))" }}>F: {recipe.perServing.fat}g</p>
                  <p style={{ color: "hsl(var(--macro-kh))" }}>KH: {recipe.perServing.carbs}g</p>
                  <p style={{ color: "hsl(var(--macro-fib))" }}>Bal: {recipe.perServing.fiber}g</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add to log button */}
          <Button
            onClick={handleAddToLog}
            disabled={added}
            className="w-full h-9 text-xs gap-2"
            variant={added ? "secondary" : "default"}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Im Protokoll eingetragen
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                1 Portion ins Tagesprotokoll übernehmen
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecipeGenerator;
