import { useState, useRef, useEffect, useCallback, createRef } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodItem, searchFood, addFoodItem } from "@/data/foodDatabase";

interface NutritionFormProps {
  onAdd: (entry: NutritionEntry) => void;
  selectedDate: string;
  editingEntry?: NutritionEntry | null;
  onCancelEdit?: () => void;
}

const NutritionForm = ({ onAdd, selectedDate, editingEntry, onCancelEdit }: NutritionFormProps) => {
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const foodInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

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
      setSelectedFood(null);
    }
  }, [editingEntry]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setShowSuggestions(results.length > 0);
    setHighlightIndex(-1);
  };

  const handleSelectFood = (item: FoodItem) => {
    setFood(item.name);
    setSelectedFood(item);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIndex(-1);
    const defaultAmount = item.defaultAmount || item.baseAmount;
    setAmount(String(defaultAmount));
    applyFoodValues(item, defaultAmount);
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

  // Time auto-format: "2240" → "22:40"
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
      });
    }

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
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      {/* Row 1: Time, Food (3 cols), Amount (5 equal columns) */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <div>
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
            className="h-9 bg-muted/50 text-xs px-2"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div ref={wrapperRef} className="relative col-span-3">
          <Label htmlFor="food" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Lebensmittel
          </Label>
          <Input
            id="food"
            ref={foodInputRef}
            type="text"
            placeholder="z.B. Haferflocken"
            value={food}
            onChange={(e) => handleFoodChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            className="h-9 bg-muted/50 text-xs px-2"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
            >
              {suggestions.map((item, index) => (
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
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                    {item.calories} kcal / {item.baseUnit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Label htmlFor="amount" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {selectedFood ? (selectedFood.baseUnit === "1 Stk" ? "pc" : "g/ml") : "g/ml"}
          </Label>
          <Input
            id="amount"
            ref={amountInputRef}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
      </div>

      {/* Row 2: Calories + Macros */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <div>
          <Label htmlFor="calories" className="text-[10px] font-medium text-muted-foreground mb-1 block">kcal</Label>
          <Input id="calories" type="number" inputMode="decimal" step="any" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} className="h-9 bg-muted/50 text-xs px-2" />
        </div>
        <div>
          <Label htmlFor="protein" className="text-[10px] font-medium text-muted-foreground mb-1 block">PRO</Label>
          <Input id="protein" type="number" inputMode="decimal" step="any" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} className="h-9 bg-muted/50 text-xs px-2" />
        </div>
        <div>
          <Label htmlFor="fat" className="text-[10px] font-medium text-muted-foreground mb-1 block">FAT</Label>
          <Input id="fat" type="number" inputMode="decimal" step="any" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} className="h-9 bg-muted/50 text-xs px-2" />
        </div>
        <div>
          <Label htmlFor="carbs" className="text-[10px] font-medium text-muted-foreground mb-1 block">KH</Label>
          <Input id="carbs" type="number" inputMode="decimal" step="any" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="h-9 bg-muted/50 text-xs px-2" />
        </div>
        <div>
          <Label htmlFor="fiber" className="text-[10px] font-medium text-muted-foreground mb-1 block">FIB</Label>
          <Input id="fiber" type="number" inputMode="decimal" step="any" placeholder="0" value={fiber} onChange={(e) => setFiber(e.target.value)} className="h-9 bg-muted/50 text-xs px-2" />
        </div>
      </div>

      {/* Submit button */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 h-9 rounded-md text-sm font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {editingEntry ? "Speichern" : "Hinzufügen"}
        </button>
        {editingEntry && (
          <button
            type="button"
            onClick={handleCancel}
            className="h-9 px-4 rounded-md text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/80"
          >
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
};

export default NutritionForm;
