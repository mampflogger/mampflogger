import { useState, useRef, useEffect, useCallback } from "react";
import { parseGermanSpokenNumber } from "@/lib/spokenNumbers";
import { createPortal } from "react-dom";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodItem, searchFood, addFoodItem, trackFoodUsage, getFoodUsageCount, guessCategory } from "@/data/foodDatabase";
import { buildMicronutrientsFromFood } from "@/lib/micronutrients";
import { X } from "lucide-react";
import { toast } from "sonner";
import { parseSpokenSelectionIndex } from "@/lib/voiceSelection";

type FocusedField = "time" | "food" | "amount" | "submit" | null;

interface NutritionFormProps {
  onAdd: (entry: NutritionEntry) => void;
  selectedDate: string;
  editingEntry?: NutritionEntry | null;
  onCancelEdit?: () => void;
  onNewFood?: () => void;
  voiceInputRef?: React.MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  isVoiceActive?: boolean;
}

const NutritionForm = ({ onAdd, selectedDate, editingEntry, onCancelEdit, onNewFood, voiceInputRef, isVoiceActive = false }: NutritionFormProps) => {
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
  const [gi, setGi] = useState("");
  const justBookedRef = useRef(false);

  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const suggestionsRef = useRef<FoodItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
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

  const parseVoicePickCommand = useCallback((text: string): number | null => {
    return parseSpokenSelectionIndex(text, {
      allowBareNumber: suggestionsRef.current.length > 0,
      max: suggestionsRef.current.length || undefined,
      keywords: ["nummer", "position", "number", "pos", "nimm", "nehme", "zeige", "das", "die", "der", "eintrag", "liste", "dropdown"],
    });
  }, []);

  // Helper: booking command is intentionally limited to: okay, ja, buchen
  const isBuchenCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    return /\b(okay|ok|ja|buchen)\b/.test(lower);
  }, []);

  // Helper: fuzzy match for "storno" command (clear current field)
  const isStornoCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    return /\b(storno|leer|leerfeld|clear)\b/.test(lower);
  }, []);

  // Voice input handler – receives transcripts from global voice command system
  const handleVoiceInput = useCallback((transcript: string, isInterim: boolean) => {
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
        setGi("");
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
        justBookedRef.current = true;
        setTimeout(() => { justBookedRef.current = false; }, 1500);
        submitButtonRef.current?.click();
        return;
      }
      // If we're on submit, ignore non-buchen speech
      if (currentField === "submit") return;
    }

    // For food/amount/time fields: only act on final results
    if (isInterim) return;

    if (currentField === "time") {
      // Parse spoken time like "sechzehn Uhr", "16 Uhr", "acht Uhr dreißig", "14:30"
      const lower = transcript.toLowerCase().trim();

      // Try direct HH:MM pattern first (e.g. "16:30", "8:15")
      const directTimeMatch = lower.match(/(\d{1,2})\s*[:\.]\s*(\d{2})/);
      if (directTimeMatch) {
        const h = directTimeMatch[1].padStart(2, "0");
        const m = directTimeMatch[2];
        if (parseInt(h) < 24 && parseInt(m) < 60) {
          setTime(`${h}:${m}`);
          setTimeout(() => foodInputRef.current?.focus(), 0);
          setFocusedField("food");
          return;
        }
      }

      // Try "X Uhr Y" pattern with spoken numbers
      const uhrMatch = lower.match(/^(.+?)\s*uhr\s*(.+)?$/);
      if (uhrMatch) {
        const hourPart = parseGermanSpokenNumber(uhrMatch[1]);
        const minutePart = uhrMatch[2] ? parseGermanSpokenNumber(uhrMatch[2]) : 0;
        if (hourPart !== null && hourPart >= 0 && hourPart < 24) {
          const mins = minutePart !== null ? minutePart : 0;
          if (mins >= 0 && mins < 60) {
            const h = String(hourPart).padStart(2, "0");
            const m = String(mins).padStart(2, "0");
            setTime(`${h}:${m}`);
            setTimeout(() => foodInputRef.current?.focus(), 0);
            setFocusedField("food");
            return;
          }
        }
      }

      // Try bare number (e.g. "16" → 16:00, "1630" → 16:30)
      const bareNum = parseGermanSpokenNumber(lower);
      if (bareNum !== null) {
        if (bareNum >= 0 && bareNum < 24) {
          setTime(`${String(bareNum).padStart(2, "0")}:00`);
          setTimeout(() => foodInputRef.current?.focus(), 0);
          setFocusedField("food");
          return;
        }
        if (bareNum >= 100 && bareNum <= 2359) {
          const h = Math.floor(bareNum / 100);
          const m = bareNum % 100;
          if (h < 24 && m < 60) {
            setTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            setTimeout(() => foodInputRef.current?.focus(), 0);
            setFocusedField("food");
            return;
          }
        }
      }

      // Try raw digits from transcript
      const digits = transcript.replace(/\D/g, "");
      if (digits.length >= 1 && digits.length <= 4) {
        handleTimeChange(digits);
        if (digits.length >= 3) {
          setTimeout(() => foodInputRef.current?.focus(), 0);
          setFocusedField("food");
        }
      }
      return;
    }

    if (currentField === "food") {
      // Ignore speech that arrives right after booking or is itself a booking command
      if (justBookedRef.current || isBuchenCommand(transcript)) return;

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
  }, []);

  // Expose voice handler to parent via ref
  useEffect(() => {
    if (voiceInputRef) {
      voiceInputRef.current = handleVoiceInput;
    }
    return () => {
      if (voiceInputRef) {
        voiceInputRef.current = undefined;
      }
    };
  }, [voiceInputRef, handleVoiceInput]);

  // Field navigation commands (Zurück / Weiter / Löschen / Dropdown open/close)
  useEffect(() => {
    const FIELD_ORDER: FocusedField[] = ["time", "food", "amount", "submit"];
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | { action: string; scope?: string };
      const cmd = typeof detail === "string" ? detail : detail?.action;
      const scope = typeof detail === "string" ? undefined : detail?.scope;
      if (!cmd || (scope && scope !== "nutrition")) return;
      const current = focusedFieldRef.current;
      const idx = current ? FIELD_ORDER.indexOf(current) : -1;

      if (cmd === "field:open-dropdown") {
        // Open food suggestions if in food field
        if (current === "food") {
          const results = searchFood(foodInputRef.current?.value || "");
          if (results.length > 0) {
            setSuggestions(results);
            setShowSuggestions(true);
            setHighlightIndex(-1);
          }
        }
      } else if (cmd === "field:close-dropdown") {
        if (showSuggestions) {
          setShowSuggestions(false);
        }
      } else if (cmd === "field:next") {
        const next = FIELD_ORDER[Math.min(idx + 1, FIELD_ORDER.length - 1)];
        if (next) {
          setFocusedField(next);
          setTimeout(() => {
            if (next === "time") timeInputRef.current?.focus();
            else if (next === "food") foodInputRef.current?.focus();
            else if (next === "amount") amountInputRef.current?.focus();
            else if (next === "submit") submitButtonRef.current?.focus();
          }, 0);
        }
      } else if (cmd === "field:prev") {
        const prev = FIELD_ORDER[Math.max(idx - 1, 0)];
        if (prev) {
          setFocusedField(prev);
          setTimeout(() => {
            if (prev === "time") timeInputRef.current?.focus();
            else if (prev === "food") foodInputRef.current?.focus();
            else if (prev === "amount") amountInputRef.current?.focus();
            else if (prev === "submit") submitButtonRef.current?.focus();
          }, 0);
        }
      } else if (cmd === "field:clear") {
        if (current === "time") {
          setTime("");
          timeInputRef.current?.focus();
        } else if (current === "food") {
          setFood("");
          setSelectedFood(null);
          setSuggestions([]);
          setShowSuggestions(false);
          foodInputRef.current?.focus();
        } else if (current === "amount") {
          setAmount("");
          setCalories("");
          setProtein("");
          setCarbs("");
          setFat("");
          setFiber("");
          setGi("");
          amountInputRef.current?.focus();
        }
      } else if (cmd === "field:storno") {
        // Clear everything in nutrition form
        setTime("");
        setFood("");
        setSelectedFood(null);
        setSuggestions([]);
        setShowSuggestions(false);
        setAmount("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setFiber("");
        setGi("");
        setFocusedField("time");
        setTimeout(() => timeInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("mampflogger:field-command", handler);
    return () => window.removeEventListener("mampflogger:field-command", handler);
  }, [showSuggestions]);

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
      setGi(editingEntry.gi !== undefined ? String(editingEntry.gi) : "");
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
    const handleForceClose = () => setShowSuggestions(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("mampflogger:close-food-dropdown", handleForceClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("mampflogger:close-food-dropdown", handleForceClose);
    };
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
    setGi(item.gi !== undefined ? String(item.gi) : "");
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
      setGi("");
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
    const parsedGi = gi ? Math.round(parseFloat(gi)) : undefined;

    // Flüssigkeit direkt berechnen wenn das Food einen liquidMl-Wert hat
    let liquidMl: number | undefined = undefined;
    if (selectedFood?.liquidMl && parsedAmount > 0) {
      const factor = parsedAmount / selectedFood.baseAmount;
      liquidMl = Math.round(selectedFood.liquidMl * factor);
    }

    const micronutrients = selectedFood
      ? buildMicronutrientsFromFood(selectedFood, parsedAmount)
      : {
          vitamins: editingEntry?.vitamins,
          minerals: editingEntry?.minerals,
        };

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
      ...(parsedGi !== undefined ? { gi: parsedGi } : {}),
      ...(liquidMl !== undefined ? { liquidMl } : {}),
      ...(micronutrients.vitamins ? { vitamins: micronutrients.vitamins } : {}),
      ...(micronutrients.minerals ? { minerals: micronutrients.minerals } : {}),
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
    setGi("");
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
       {/* Row 1: Time (1), Food (3), Amount (1) → 5 cols total */}
       <div className="grid grid-cols-5 gap-2 mb-1.5">
         <div className="col-span-1">
           <Label htmlFor="time" className="text-[9px] font-medium text-muted-foreground mb-0.5 block">
             Uhrzeit
           </Label>
           <Input
             id="time"
             ref={timeInputRef}
             type="text"
             inputMode="numeric"
             placeholder="08:00"
             value={time}
             onChange={(e) => handleTimeChange(e.target.value)}
             onFocus={() => setFocusedField("time")}
             className="h-8 text-[10px] px-1 min-w-0 text-center"
             autoCorrect="off"
             spellCheck={false}
           />
         </div>
         <div ref={wrapperRef} className="relative col-span-3">
           <Label htmlFor="food" className="text-[9px] font-medium text-muted-foreground mb-0.5 block truncate">
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
                  if (food.trim().length > 0 && suggestions.length > 0) setShowSuggestions(true);
                }}
               onKeyDown={handleKeyDown}
               className={`h-8 text-[10px] font-semibold px-2 pr-7 ${isVoiceActive && focusedField === "food" ? "ring-2 ring-primary" : ""}`}
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
                 <X className="w-3 h-3" />
               </button>
             )}
           </div>
           {showSuggestions && dropdownRect && createPortal(
             <ul
               ref={listRef}
               data-voice-dropdown-active
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
                   className={`flex items-center px-3 py-2 text-[10px] cursor-pointer transition-colors font-semibold text-primary hover:bg-muted/60 ${
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
                     className={`flex items-center justify-between px-3 py-2 text-[10px] cursor-pointer transition-colors ${
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
                       <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[8px] font-bold text-muted-foreground shrink-0">{index + 1}</span>
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
           <Label htmlFor="amount" className="text-[9px] font-medium text-muted-foreground mb-0.5 block truncate">
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
               className={`h-8 text-[10px] font-semibold px-2 ${isVoiceActive && focusedField === "amount" ? "ring-2 ring-primary" : ""}`}
             />
           </div>
         </div>
       </div>

       {/* Row 2: Calories + Macros – compact pill badges */}
       <div className="grid grid-cols-6 gap-1 mb-1.5">
         {[
           { id: "calories", label: "kcal", value: calories, setter: setCalories },
           { id: "protein", label: "PRO", value: protein, setter: setProtein },
           { id: "fat", label: "FAT", value: fat, setter: setFat },
           { id: "carbs", label: "KH", value: carbs, setter: setCarbs },
           { id: "fiber", label: "FIB", value: fiber, setter: setFiber },
           { id: "gi", label: "GI", value: gi, setter: setGi },
         ].map((field) => (
           <div key={field.id} className="flex flex-col items-center">
             <span className="text-[6px] font-medium text-muted-foreground mb-0.5">{field.label}</span>
             <Input
               id={field.id}
               type="number"
               inputMode="decimal"
               step="any"
               placeholder="0"
               value={field.value}
               onChange={(e) => field.setter(e.target.value)}
               className="h-4 text-[6px] px-1 text-center tabular-nums rounded-full"
             />
           </div>
         ))}
       </div>

       {/* Submit button */}
       <div className="flex gap-2">
         <button
           ref={submitButtonRef}
           type="submit"
           onFocus={() => setFocusedField("submit")}
           className={`flex-1 h-7 rounded-full text-[10px] font-semibold transition-colors ${
             isVoiceActive && focusedField === "submit"
               ? "bg-primary text-primary-foreground ring-2 ring-primary"
               : "bg-primary text-primary-foreground hover:bg-primary/90"
           }`}
         >
           {isVoiceActive && (focusedField === "submit" || focusedField === "amount")
             ? <span className="italic text-[9px]">Sag „Okay", „Ja" oder „Buchen"</span>
             : (editingEntry ? "Speichern" : "Hinzufügen")}
         </button>
         {editingEntry && (
           <button
             type="button"
             onClick={handleCancel}
             className="h-7 px-4 rounded-full text-[10px] font-semibold text-muted-foreground bg-accent hover:bg-muted/80"
           >
             Abbrechen
           </button>
         )}
       </div>
    </form>
  );
};

export default NutritionForm;
