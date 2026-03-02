import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodItem, searchFood, addFoodItem, trackFoodUsage, getFoodUsageCount, guessCategory } from "@/data/foodDatabase";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Mic, MicOff, X } from "lucide-react";
import { toast } from "sonner";

// German word-to-number map for voice pick commands (module-level constant)
const WORD_TO_NUM: Record<string, number> = {
  "eins": 1, "ein": 1, "erste": 1, "erster": 1, "erstes": 1, "ersten": 1, "1": 1,
  "zwei": 2, "zweite": 2, "zweiter": 2, "zweites": 2, "zweiten": 2, "2": 2,
  "drei": 3, "dritte": 3, "dritter": 3, "drittes": 3, "dritten": 3, "3": 3,
  "vier": 4, "vierte": 4, "vierter": 4, "viertes": 4, "vierten": 4, "4": 4,
  "fünf": 5, "fünfte": 5, "5": 5,
  "sechs": 6, "sechste": 6, "6": 6,
  "sieben": 7, "siebte": 7, "7": 7,
  "acht": 8, "achte": 8, "8": 8,
  "neun": 9, "neunte": 9, "9": 9,
  "zehn": 10, "zehnte": 10, "10": 10,
};

type FocusedField = "food" | "amount" | "submit" | null;

interface NutritionFormProps {
  onAdd: (entry: NutritionEntry) => void;
  selectedDate: string;
  editingEntry?: NutritionEntry | null;
  onCancelEdit?: () => void;
  onNewFood?: () => void;
  externalMicButton?: boolean; // If true, don't render internal mic button
  onVoiceStateChange?: (isListening: boolean, isSupported: boolean, toggle: () => void) => void;
}

const NutritionForm = ({ onAdd, selectedDate, editingEntry, onCancelEdit, onNewFood, externalMicButton, onVoiceStateChange }: NutritionFormProps) => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [time, setTime] = useState(currentTime);
  const [food, setFood] = useState("");
  const [amount, setAmount] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const suggestionsRef = useRef<FoodItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const foodInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const [focusedField, setFocusedField] = useState<FocusedField>("food");
  const focusedFieldRef = useRef<FocusedField>("food");
  const handleSelectFoodRef = useRef<(item: FoodItem) => void>(() => {});
  const handleAmountChangeRef = useRef<(value: string) => void>(() => {});

  // Keep refs in sync with state
  useEffect(() => {
    focusedFieldRef.current = focusedField;
  }, [focusedField]);
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  // WORD_TO_NUM is defined at module level above

  // Parse voice commands like "Nummer eins", "Position 3", "das Erste", "nimm zwei"
  const parseVoicePickCommand = useCallback((text: string): number | null => {
    const lower = text.toLowerCase().trim();
    // Pattern: keyword + number word/digit
    const match = lower.match(/\b(?:nummer|position|number|pos|nimm|nehme|das|die|der)\s+(\S+)/);
    if (match) {
      const num = WORD_TO_NUM[match[1]];
      if (num !== undefined) return num - 1; // 0-based
    }
    // Fallback: just a number word alone (e.g. user says "eins")
    // Only if suggestions are currently visible
    if (suggestionsRef.current.length > 0) {
      const words = lower.split(/\s+/);
      if (words.length <= 2) {
        for (const w of words) {
          const num = WORD_TO_NUM[w];
          if (num !== undefined) return num - 1;
        }
      }
    }
    return null;
  }, []);

  // Helper: fuzzy match for "buchen" command (and aliases: ja, yes, check, copy)
  const isBuchenCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    // Match "buchen" variants + short confirmation words
    return /\b(buchen|buche|buch|buchem|bucher|buchern|butchen|bu[ck]h?en?|ja|yes|check|copy)\b/.test(lower);
  }, []);

  // Helper: fuzzy match for "storno" command (clear current field)
  const isStornoCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    return /\b(storno|leer|leerfeld|clear)\b/.test(lower);
  }, []);

  // Single voice recognition instance for both fields
  const voice = useSpeechRecognition({
    onResult: useCallback((transcript: string, isInterim: boolean) => {
      const currentField = focusedFieldRef.current;

      // "storno" command: clear current field and reset focus
      if (isStornoCommand(transcript)) {
        if (currentField === "food" || currentField === "amount" || currentField === "submit") {
          setFood("");
          setAmount("");
          setCalories("");
          setProtein("");
          setCarbs("");
          setFat("");
          setFiber("");
          setSelectedFood(null);
          setSuggestions([]);
          setShowSuggestions(false);
          setFocusedField("food");
          setTimeout(() => foodInputRef.current?.focus(), 0);
        }
        return;
      }

      // "buchen" command works from both amount and submit fields
      if (currentField === "submit" || currentField === "amount") {
        if (isBuchenCommand(transcript)) {
          submitButtonRef.current?.click();
          return;
        }
        // If we're on submit, ignore non-buchen speech
        if (currentField === "submit") return;
      }

      // For food/amount fields: only act on final results
      if (isInterim) return;

      if (currentField === "food") {
        // Check for "Nummer X" / "Position X" command to pick from visible suggestions
        const pickIndex = parseVoicePickCommand(transcript);
        if (pickIndex !== null) {
          const currentSuggestions = suggestionsRef.current;
          if (pickIndex >= 0 && pickIndex < currentSuggestions.length) {
            handleSelectFoodRef.current(currentSuggestions[pickIndex]);
          } else if (currentSuggestions.length > 0) {
            toast.error(`Nur ${currentSuggestions.length} Vorschläge verfügbar.`);
          }
          return;
        }

        const results = searchFood(transcript);
        if (results.length === 0) {
          setFood("Nichts gefunden");
          setTimeout(() => {
            setFood("");
            foodInputRef.current?.focus();
          }, 1500);
        } else if (results.length === 1) {
          handleSelectFoodRef.current(results[0]);
        } else {
          setFood("");
          setSuggestions(results);
          setShowSuggestions(true);
          setHighlightIndex(-1);
        }
      } else if (currentField === "amount") {
        const num = transcript.replace(/[^\d.,]/g, "").replace(",", ".");
        if (num) {
          handleAmountChangeRef.current(num);
          setTimeout(() => {
            submitButtonRef.current?.focus();
            setFocusedField("submit");
          }, 0);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
    onError: useCallback((error: string) => {
      if (error === "not-allowed" || error === "service-not-allowed") {
        toast.error("Mikrofon blockiert – bitte Browser-Zugriff für Mikrofon erlauben.");
      } else if (error === "not-supported") {
        toast.error("Spracherkennung wird auf diesem Gerät/Browser nicht unterstützt.");
      } else if (error === "audio-capture") {
        toast.error("Kein Mikrofon erkannt – bitte Mikrofon prüfen und erneut versuchen.");
      } else if (error === "restart-requires-gesture") {
        toast.error("Mikrofon pausiert – bitte erneut auf das Mic tippen.");
      } else if (error === "start-failed") {
        toast.error("Mikrofon konnte nicht gestartet werden – bitte erneut tippen.");
      }
    }, []),
  });

  // Expose voice state to parent – use ref to avoid infinite re-render loop
  const onVoiceStateChangeRef = useRef(onVoiceStateChange);
  onVoiceStateChangeRef.current = onVoiceStateChange;
  const voiceToggle = useCallback(() => {
    voice.isListening ? voice.stop() : voice.start();
  }, [voice.isListening, voice.stop, voice.start]);
  useEffect(() => {
    onVoiceStateChangeRef.current?.(voice.isListening, voice.isSupported, voiceToggle);
  }, [voice.isListening, voice.isSupported, voiceToggle]);

  // Load editing entry into form
  useEffect(() => {
    if (editingEntry) {
      setTime(editingEntry.time);
      setFood(editingEntry.food);
      setAmount(String(editingEntry.amount));
      setCalories(String(editingEntry.calories));
      setProtein(String(editingEntry.protein));
      setCarbs(String(editingEntry.carbs));
      setFat(String(editingEntry.fat));
      setFiber(String(editingEntry.fiber));
      // Try to find the food in the database so amount changes recalculate macros
      const results = searchFood(editingEntry.food);
      const match = results.find((f) => f.name.toLowerCase() === editingEntry.food.toLowerCase());
      setSelectedFood(match || null);
    }
  }, [editingEntry]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dropdown position whenever it opens or window scrolls/resizes
  useEffect(() => {
    if (!showSuggestions) return;
    const update = () => {
      if (wrapperRef.current) {
        setDropdownRect(wrapperRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showSuggestions]);

  const applyFoodValues = useCallback((item: FoodItem, qty: number) => {
    const factor = qty / item.baseAmount;
    setCalories(String(Math.round(item.calories * factor)));
    setProtein(String(Math.round(item.protein * factor)));
    setCarbs(String(Math.round(item.carbs * factor)));
    setFat(String(Math.round(item.fat * factor)));
    setFiber(String(Math.round(item.fiber * factor)));
  }, []);

  const handleFoodChange = (value: string) => {
    setFood(value);
    setSelectedFood(null);
    const results = searchFood(value);
    setSuggestions(results);
    setShowSuggestions(value.trim().length > 0);
    setHighlightIndex(-1);
  };

  const handleSelectFood = (item: FoodItem) => {
    setFood(item.name);
    setSelectedFood(item);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIndex(-1);
    if (item.defaultAmount) {
      setAmount(String(item.defaultAmount));
      applyFoodValues(item, item.defaultAmount);
    } else {
      setAmount("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");
    }
    // Auto-focus to amount field
    setTimeout(() => amountInputRef.current?.focus(), 0);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (selectedFood && value) {
      const qty = parseFloat(value);
      if (!isNaN(qty) && qty > 0) {
        applyFoodValues(selectedFood, qty);
      }
    }
  };

  // Keep function refs current for voice callback
  handleSelectFoodRef.current = handleSelectFood;
  handleAmountChangeRef.current = handleAmountChange;

  const handleTimeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setTime(digits);
    } else {
      const formatted = digits.slice(0, 2) + ":" + digits.slice(2);
      setTime(formatted);
      // Auto-focus to food field when time is complete (4 digits)
      if (digits.length === 4) {
        setTimeout(() => foodInputRef.current?.focus(), 0);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectFood(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!food.trim()) return;

    const parsedAmount = parseFloat(amount) || 0;
    const parsedCalories = Math.round(parseFloat(calories) || 0);
    const parsedProtein = Math.round(parseFloat(protein) || 0);
    const parsedFat = Math.round(parseFloat(fat) || 0);
    const parsedCarbs = Math.round(parseFloat(carbs) || 0);
    const parsedFiber = Math.round(parseFloat(fiber) || 0);

    // Flüssigkeit direkt berechnen wenn das Food einen liquidMl-Wert hat
    let liquidMl: number | undefined = undefined;
    if (selectedFood?.liquidMl && parsedAmount > 0) {
      const factor = parsedAmount / selectedFood.baseAmount;
      liquidMl = Math.round(selectedFood.liquidMl * factor);
    }

    const entry: NutritionEntry = {
      id: editingEntry?.id || generateId(),
      date: editingEntry?.date || selectedDate,
      time,
      food: food.trim(),
      amount: parsedAmount,
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
      fiber: parsedFiber,
      ...(liquidMl !== undefined ? { liquidMl } : {}),
    };

    // Auto-add to food database if new
    if (parsedAmount > 0 && parsedCalories > 0) {
      const guessedBaseUnit = parsedAmount <= 10 ? "1 Stk" : "100g";
      const guessedBaseAmount = guessedBaseUnit === "1 Stk" ? 1 : 100;
      const factor = guessedBaseAmount / parsedAmount;

      addFoodItem({
        name: food.trim(),
        baseUnit: guessedBaseUnit,
        baseAmount: guessedBaseAmount,
        calories: Math.round(parsedCalories * factor),
        protein: Math.round(parsedProtein * factor),
        fat: Math.round(parsedFat * factor),
        carbs: Math.round(parsedCarbs * factor),
        fiber: Math.round(parsedFiber * factor),
        category: guessCategory(food.trim()),
      });
    }

    trackFoodUsage(food.trim());
    onAdd(entry);
    resetForm();
  };

  const resetForm = () => {
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setFood("");
    setAmount("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setSelectedFood(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setFocusedField("food");
    setTimeout(() => foodInputRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in relative">
      {/* Mic button top-right, absolutely positioned (only if not externally rendered) */}
      {!externalMicButton && voice.isSupported && (
        <button
          type="button"
          onClick={() => voice.isListening ? voice.stop() : voice.start()}
          className={`absolute -top-7 right-0 p-1 rounded-full transition-colors ${
            voice.isListening
              ? "bg-destructive/15 text-destructive animate-pulse"
              : "bg-accent text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
          title="Spracheingabe"
        >
          {voice.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
      )}
      {/* Row 1: Time (1), Food (3), Amount (1) → 5 cols total */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <div className="col-span-1">
          <Label htmlFor="time" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Uhrzeit
          </Label>
          <Input
            id="time"
            type="text"
            inputMode="numeric"
            placeholder="08:00"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-9 text-[10px] px-1 min-w-0 text-center"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div ref={wrapperRef} className="relative col-span-3">
          <Label htmlFor="food" className="text-[10px] font-medium text-muted-foreground mb-1 block truncate">
            Lebensmittel
          </Label>
          <div className="relative">
            <Input
              id="food"
              ref={foodInputRef}
              type="text"
              placeholder="z.B. Haferflocken"
              value={food}
              onChange={(e) => handleFoodChange(e.target.value)}
              onFocus={() => {
                setFocusedField("food");
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              className={`h-9 text-xs px-2 pr-7 ${voice.isListening && focusedField === "food" ? "ring-2 ring-primary" : ""}`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {food && (
              <button
                type="button"
                onClick={() => { setFood(""); setSelectedFood(null); setSuggestions([]); setShowSuggestions(false); foodInputRef.current?.focus(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                tabIndex={-1}
                title="Feld leeren"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showSuggestions && dropdownRect && createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                top: dropdownRect.bottom + 4,
                left: dropdownRect.left,
                width: dropdownRect.width,
                zIndex: 99999,
              }}
              className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-popover shadow-xl"
            >
              {onNewFood && (
                <li
                  className={`flex items-center px-3 py-2 text-xs cursor-pointer transition-colors font-semibold text-primary hover:bg-muted/60 ${
                    highlightIndex === -2 ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowSuggestions(false);
                    onNewFood();
                  }}
                >
                  + New Food
                </li>
              )}
              {suggestions.map((item, index) => {
                const usageCount = getFoodUsageCount(item.name);
                const isFavorite = usageCount >= 3;
                return (
                  <li
                    key={item.name}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      index === highlightIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/60"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectFood(item);
                    }}
                    onMouseEnter={() => setHighlightIndex(index)}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0">{index + 1}</span>
                      <span className="font-medium">{item.name}</span>
                    </span>
                    {isFavorite && (
                      <span className="text-yellow-500 ml-2 shrink-0" title={`${usageCount}× gebucht`}>★</span>
                    )}
                  </li>
                );
              })}
            </ul>,
            document.body
          )}
        </div>
        <div className="col-span-1">
          <Label htmlFor="amount" className="text-[10px] font-medium text-muted-foreground mb-1 block truncate">
            {selectedFood ? (selectedFood.baseUnit.startsWith("1 ") ? selectedFood.baseUnit.substring(2) : "g/ml") : "g/ml"}
          </Label>
          <div className="relative">
            <Input
              id="amount"
              ref={amountInputRef}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={() => setFocusedField("amount")}
              className={`h-9 text-xs px-2 ${voice.isListening && focusedField === "amount" ? "ring-2 ring-primary" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Calories + Macros */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        <div>
          <Label htmlFor="calories" className="text-[10px] font-medium text-muted-foreground mb-1 block">kcal</Label>
          <Input id="calories" type="number" inputMode="decimal" step="any" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} className="h-9 text-[10px] px-1 text-center tabular-nums" />
        </div>
        <div>
          <Label htmlFor="protein" className="text-[10px] font-medium text-muted-foreground mb-1 block">PRO</Label>
          <Input id="protein" type="number" inputMode="decimal" step="any" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} className="h-9 text-[10px] px-1 text-center tabular-nums" />
        </div>
        <div>
          <Label htmlFor="fat" className="text-[10px] font-medium text-muted-foreground mb-1 block">FAT</Label>
          <Input id="fat" type="number" inputMode="decimal" step="any" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} className="h-9 text-[10px] px-1 text-center tabular-nums" />
        </div>
        <div>
          <Label htmlFor="carbs" className="text-[10px] font-medium text-muted-foreground mb-1 block">KH</Label>
          <Input id="carbs" type="number" inputMode="decimal" step="any" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="h-9 text-[10px] px-1 text-center tabular-nums" />
        </div>
        <div>
          <Label htmlFor="fiber" className="text-[10px] font-medium text-muted-foreground mb-1 block">FIB</Label>
          <Input id="fiber" type="number" inputMode="decimal" step="any" placeholder="0" value={fiber} onChange={(e) => setFiber(e.target.value)} className="h-9 text-[10px] px-1 text-center tabular-nums" />
        </div>
      </div>

      {/* Submit button */}
      <div className="flex gap-2">
        <button
          ref={submitButtonRef}
          type="submit"
          onFocus={() => setFocusedField("submit")}
          className={`flex-1 h-9 rounded-full text-sm font-semibold transition-colors ${
            voice.isListening && focusedField === "submit"
              ? "bg-primary text-primary-foreground ring-2 ring-primary"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {voice.isListening && (focusedField === "submit" || focusedField === "amount")
            ? <span className="italic">Sag „ja" oder „copy"</span>
            : (editingEntry ? "Speichern" : "Hinzufügen")}
        </button>
        {editingEntry && (
          <button
            type="button"
            onClick={handleCancel}
            className="h-9 px-4 rounded-full text-sm font-semibold text-muted-foreground bg-accent hover:bg-muted/80"
          >
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
};

export default NutritionForm;
