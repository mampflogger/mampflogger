import { useState, useRef, useMemo, useEffect, useCallback, type MutableRefObject } from "react";
import { generateId } from "@/types/nutrition";
import { X, Plus, Loader2, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { foodDatabase, saveFoodDatabase, guessCategory, type FoodItem } from "@/data/foodDatabase";
import { parseGermanSpokenNumber } from "@/lib/spokenNumbers";

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
  voiceInputRef?: MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  isVoiceActive?: boolean;
}

type FocusedField = "recipeName" | "servings" | "prepTime" | "ingredientAmount" | "ingredientName" | "steps" | "aiCheckbox" | "save" | null;

const FIELD_ORDER: FocusedField[] = [
  "recipeName", "servings", "prepTime",
  "ingredientAmount", "ingredientName",
  "aiCheckbox", "steps", "save",
];

const ManualRecipeForm = ({ onSave, onCancel, voiceInputRef, isVoiceActive = false }: ManualRecipeFormProps) => {
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
  const [focusedField, setFocusedField] = useState<FocusedField>("recipeName");

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const recipeNameInputRef = useRef<HTMLInputElement>(null);
  const servingsInputRef = useRef<HTMLInputElement>(null);
  const prepTimeInputRef = useRef<HTMLInputElement>(null);
  const ingredientAmountRef = useRef<HTMLInputElement>(null);
  const ingredientNameRef = useRef<HTMLInputElement>(null);
  const stepsRef = useRef<HTMLTextAreaElement>(null);
  const aiCheckboxRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const focusedFieldRef = useRef<FocusedField>("recipeName");
  const voiceBufferRef = useRef("");
  const voiceTimerRef = useRef<number | null>(null);
  const lastAmountRef = useRef<{ value: number; at: number } | null>(null);
  const amountJumpTimerRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    focusedFieldRef.current = focusedField;
  }, [focusedField]);

  // Auto-focus recipe name field on mount
  useEffect(() => {
    setTimeout(() => {
      recipeNameInputRef.current?.focus();
      setFocusedField("recipeName");
    }, 100);
  }, []);

  const focusField = useCallback((field: FocusedField) => {
    setFocusedField(field);
    setTimeout(() => {
      switch (field) {
        case "recipeName": recipeNameInputRef.current?.focus(); break;
        case "servings": servingsInputRef.current?.focus(); break;
        case "prepTime": prepTimeInputRef.current?.focus(); break;
        case "ingredientAmount": ingredientAmountRef.current?.focus(); break;
        case "ingredientName": ingredientNameRef.current?.focus(); break;
        case "steps": stepsRef.current?.focus(); break;
        case "aiCheckbox": aiCheckboxRef.current?.focus(); break;
        case "save": saveButtonRef.current?.focus(); break;
      }
    }, 0);
  }, []);

  const clearVoiceBuffer = useCallback(() => {
    voiceBufferRef.current = "";
    if (voiceTimerRef.current !== null) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  const handleAddIngredientInternal = useCallback(() => {
    const n = newIngredientName.trim();
    if (!n) return false;
    const a = newIngredientAmount.trim();
    setIngredients((prev) => [...prev, { name: n, amount: a, isMain: false }]);
    setNewIngredientAmount("");
    setNewIngredientName("");
    setShowSuggestions(false);
    return true;
  }, [newIngredientAmount, newIngredientName]);

  const isPlusCommand = useCallback((text: string) => /\b(?:plus|hinzufügen|hinzufuegen|dazu)\b/i.test(text), []);
  const isBookingCommand = useCallback((text: string) => /\b(?:okay|ja|buchen|ok)\b/i.test(text), []);
  const isAdvanceCommand = useCallback((text: string) => /\b(?:okay|ok|weiter)\b/i.test(text), []);
  const isStornoCommand = useCallback((text: string) => /\b(?:storno|abbrechen|reset|schließen|schliessen|zumachen|zuklappen|verwerfen|kreuz)\b/i.test(text) || /^\s*(?:x|iks|ix|ex)\s*$/i.test(text), []);

  const flushVoiceBuffer = useCallback((field: FocusedField) => {
    const text = voiceBufferRef.current.trim();
    voiceBufferRef.current = "";
    if (!text) return;

    switch (field) {
      case "recipeName":
        setName(text);
        break;
      case "servings": {
        const num = parseGermanSpokenNumber(text);
        if (num !== null && num > 0) setServings(String(Math.round(num)));
        break;
      }
      case "prepTime": {
        // Parse spoken time like "zehn Minuten", "zwanzig Minuten", "30 Minuten"
        const minuteMatch = text.match(/^(.+?)\s*(?:minuten?|min)\s*$/i);
        if (minuteMatch) {
          const num = parseGermanSpokenNumber(minuteMatch[1]);
          if (num !== null && num > 0) {
            setPrepTime(`${Math.round(num)} Min.`);
            break;
          }
        }
        // Try bare number → treat as minutes
        const bareNum = parseGermanSpokenNumber(text);
        if (bareNum !== null && bareNum > 0 && bareNum <= 600) {
          setPrepTime(`${Math.round(bareNum)} Min.`);
          break;
        }
        setPrepTime(text);
        break;
      }
      case "ingredientAmount": {
        const num = parseGermanSpokenNumber(text);
        if (num !== null && num > 0) {
          setNewIngredientAmount(String(num));
          // Auto-jump to ingredient name field after valid number
          setTimeout(() => focusField("ingredientName"), 50);
        } else {
          setNewIngredientAmount(text);
        }
        break;
      }
      case "ingredientName":
        setNewIngredientName(text);
        break;
      case "steps":
        setStepsText((prev) => prev ? prev + "\n" + text : text);
        break;
      default:
        break;
    }
  }, []);

  const handleVoiceInput = useCallback((transcript: string, isInterim: boolean) => {
    const current = focusedFieldRef.current;

    // Storno resets the form
    if (!isInterim && isStornoCommand(transcript)) {
      clearVoiceBuffer();
      onCancel();
      return;
    }

    // "Plus" command adds ingredient and loops back
    if (!isInterim && isPlusCommand(transcript)) {
      clearVoiceBuffer();
      // First flush any pending ingredient name
      if (current === "ingredientName") {
        const pendingName = voiceBufferRef.current.trim() || newIngredientName.trim();
        if (pendingName && !newIngredientName.trim()) {
          setNewIngredientName(pendingName);
        }
      }
      // Use setTimeout to ensure state is updated
      setTimeout(() => {
        const n = (document.querySelector<HTMLInputElement>('[data-voice-field="ingredientName"]')?.value || "").trim();
        if (n) {
          handleAddIngredientInternal();
          focusField("ingredientAmount");
        }
      }, 50);
      return;
    }

    // "Okay"/"Weiter" advances from recipeName → servings → prepTime → ingredientAmount
    if (!isInterim && isAdvanceCommand(transcript) && (current === "recipeName" || current === "servings" || current === "prepTime")) {
      // Flush current buffer before advancing
      flushVoiceBuffer(current);
      clearVoiceBuffer();
      const idx = FIELD_ORDER.indexOf(current);
      const next = FIELD_ORDER[Math.min(idx + 1, FIELD_ORDER.length - 1)];
      if (next) focusField(next);
      return;
    }

    // "Okay" on save button triggers save
    if (!isInterim && current === "save" && isBookingCommand(transcript)) {
      clearVoiceBuffer();
      saveButtonRef.current?.click();
      return;
    }

    // "Okay" when in ingredient fields → move to aiCheckbox
    if (!isInterim && isBookingCommand(transcript) && (current === "ingredientAmount" || current === "ingredientName")) {
      clearVoiceBuffer();
      // Add pending ingredient first if any
      if (newIngredientName.trim()) {
        handleAddIngredientInternal();
      }
      focusField("aiCheckbox");
      return;
    }

    // "Okay" on aiCheckbox → toggle it and advance to steps
    if (!isInterim && current === "aiCheckbox" && isBookingCommand(transcript)) {
      clearVoiceBuffer();
      setAiGenerateSteps((prev) => !prev);
      // After toggling, advance to steps
      setTimeout(() => focusField("steps"), 100);
      return;
    }

    // Text input fields
    const isTextField = current === "recipeName" || current === "servings" || current === "prepTime" ||
                        current === "ingredientAmount" || current === "ingredientName" || current === "steps";

    if (isTextField) {
      const chunk = transcript.trim();
      if (!chunk) return;

      // For servings field, try to parse number immediately on final results
      // Small numbers are often lost in the buffer timeout
      if (!isInterim && (current === "servings" || current === "ingredientAmount")) {
        const num = parseGermanSpokenNumber(chunk);
        if (num !== null && num > 0) {
          if (voiceTimerRef.current !== null) {
            window.clearTimeout(voiceTimerRef.current);
            voiceTimerRef.current = null;
          }
          voiceBufferRef.current = "";
          if (current === "servings") {
            setServings(String(Math.round(num)));
          } else {
            setNewIngredientAmount(String(num));
            setTimeout(() => focusField("ingredientName"), 50);
          }
          return;
        }
      }

      if (isInterim) {
        // For interim results, show live feedback for numeric fields
        if (current === "servings") {
          const num = parseGermanSpokenNumber(chunk);
          if (num !== null && num > 0) setServings(String(Math.round(num)));
        }
        voiceBufferRef.current = chunk;
        return;
      }

      // Final result
      voiceBufferRef.current = chunk;
      
      if (voiceTimerRef.current !== null) {
        window.clearTimeout(voiceTimerRef.current);
      }
      voiceTimerRef.current = window.setTimeout(() => {
        voiceTimerRef.current = null;
        flushVoiceBuffer(focusedFieldRef.current);
        voiceBufferRef.current = "";
      }, 800);
    }
  }, [clearVoiceBuffer, flushVoiceBuffer, focusField, handleAddIngredientInternal, isAdvanceCommand, isBookingCommand, isPlusCommand, isStornoCommand, newIngredientName, onCancel]);

  // Register voice input handler
  useEffect(() => {
    if (!voiceInputRef) return;
    voiceInputRef.current = handleVoiceInput;
    return () => {
      if (voiceInputRef) voiceInputRef.current = undefined;
    };
  }, [voiceInputRef, handleVoiceInput]);

  // Field navigation commands (Zurück / Weiter / Löschen)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | { action: string; scope?: string };
      const cmd = typeof detail === "string" ? detail : detail?.action;
      const scope = typeof detail === "string" ? undefined : detail?.scope;
      if (!cmd || (scope && scope !== "manual-recipe")) return;
      const current = focusedFieldRef.current;
      const idx = current ? FIELD_ORDER.indexOf(current) : -1;

      if (cmd === "field:next") {
        const next = FIELD_ORDER[Math.min(idx + 1, FIELD_ORDER.length - 1)];
        if (next) {
          clearVoiceBuffer();
          // Flush current field before moving
          if (current) flushVoiceBuffer(current);
          focusField(next);
        }
      } else if (cmd === "field:prev") {
        const prev = FIELD_ORDER[Math.max(idx - 1, 0)];
        if (prev) {
          clearVoiceBuffer();
          if (current) flushVoiceBuffer(current);
          focusField(prev);
        }
      } else if (cmd === "field:close-dropdown") {
        clearVoiceBuffer();
        onCancel();
      } else if (cmd === "field:clear") {
        clearVoiceBuffer();
        switch (current) {
          case "recipeName": setName(""); recipeNameInputRef.current?.focus(); break;
          case "servings": setServings(""); servingsInputRef.current?.focus(); break;
          case "prepTime": setPrepTime(""); prepTimeInputRef.current?.focus(); break;
          case "ingredientAmount": setNewIngredientAmount(""); ingredientAmountRef.current?.focus(); break;
          case "ingredientName": setNewIngredientName(""); setShowSuggestions(false); ingredientNameRef.current?.focus(); break;
          case "steps": setStepsText(""); stepsRef.current?.focus(); break;
        }
      }
    };
    window.addEventListener("mampflogger:field-command", handler);
    return () => window.removeEventListener("mampflogger:field-command", handler);
  }, [clearVoiceBuffer, flushVoiceBuffer, focusField]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current !== null) {
        window.clearTimeout(voiceTimerRef.current);
      }
    };
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
    handleAddIngredientInternal();
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

  const ringClass = (field: FocusedField) =>
    isVoiceActive && focusedField === field ? "ring-2 ring-primary" : "";

  return (
    <div data-voice-scope="manual-recipe" className="rounded-lg bg-background border border-border/50 p-3 space-y-3">
      {/* Header with close */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Neues Rezept</h3>
        <button type="button" data-voice-close="current" onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Name */}
      <Input
        ref={recipeNameInputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={() => setFocusedField("recipeName")}
        placeholder="Name des Rezepts"
        className={`h-8 text-[12px] px-2 ${ringClass("recipeName")}`}
      />

      {/* Servings + Time */}
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[11px] text-muted-foreground shrink-0">👥</span>
          <Input
            ref={servingsInputRef}
            type="number"
            inputMode="numeric"
            min={1}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            onFocus={() => setFocusedField("servings")}
            placeholder="Portionen"
            className={`h-7 text-[11px] px-2 ${ringClass("servings")}`}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[11px] text-muted-foreground shrink-0">⏱️</span>
          <Input
            ref={prepTimeInputRef}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            onFocus={() => setFocusedField("prepTime")}
            placeholder="z.B. 30 Min."
            className={`h-7 text-[11px] px-2 ${ringClass("prepTime")}`}
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
            ref={ingredientAmountRef}
            type="text"
            inputMode="decimal"
            value={newIngredientAmount}
            onChange={(e) => {
              setNewIngredientAmount(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                ingredientNameRef.current?.focus();
                setFocusedField("ingredientName");
              }
            }}
            onFocus={() => setFocusedField("ingredientAmount")}
            placeholder="Menge"
            className={`h-6 text-[11px] px-2 w-16 shrink-0 ${ringClass("ingredientAmount")}`}
          />
          <div className="relative flex-1">
            <Input
              ref={(el) => {
                ingredientNameRef.current = el;
                (nameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }}
              type="text"
              value={newIngredientName}
              onChange={(e) => {
                setNewIngredientName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setFocusedField("ingredientName");
                if (newIngredientName.trim().length >= 1) setShowSuggestions(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
              placeholder="Zutat hinzufügen…"
              data-voice-field="ingredientName"
              className={`h-6 text-[11px] px-2 w-full ${ringClass("ingredientName")}`}
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
              ref={aiCheckboxRef}
              checked={aiGenerateSteps}
              onCheckedChange={(v) => setAiGenerateSteps(!!v)}
              onFocus={() => setFocusedField("aiCheckbox")}
              className={`h-3 w-3 ${ringClass("aiCheckbox")}`}
            />
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              KI generieren
            </span>
          </label>
        </div>
        <Textarea
          ref={stepsRef}
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          onFocus={() => setFocusedField("steps")}
          placeholder={aiGenerateSteps ? "Wird von der KI generiert…" : "Zubereitungsschritte eingeben…"}
          disabled={aiGenerateSteps}
          className={`text-[11px] min-h-[60px] px-2 py-1.5 resize-none ${ringClass("steps")}`}
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
        ref={saveButtonRef}
        onClick={handleSave}
        onFocus={() => setFocusedField("save")}
        disabled={saving}
        data-voice-action="save"
        className={`w-full h-9 text-xs gap-1.5 ${ringClass("save")}`}
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
