import { useState, useRef, useEffect, useCallback } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FoodItem, searchFood } from "@/data/foodDatabase";

interface NutritionFormProps {
  onAdd: (entry: NutritionEntry) => void;
  selectedDate: string;
}

const NutritionForm = ({ onAdd, selectedDate }: NutritionFormProps) => {
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
    setCalories(String(Math.round(item.calories * factor * 100) / 100));
    setProtein(String(Math.round(item.protein * factor * 100) / 100));
    setCarbs(String(Math.round(item.carbs * factor * 100) / 100));
    setFat(String(Math.round(item.fat * factor * 100) / 100));
    setFiber(String(Math.round(item.fiber * factor * 100) / 100));
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
    const defaultAmount = item.baseAmount;
    setAmount(String(defaultAmount));
    applyFoodValues(item, defaultAmount);
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

    const entry: NutritionEntry = {
      id: generateId(),
      date: selectedDate,
      time,
      food: food.trim(),
      amount: parseFloat(amount) || 0,
      calories: Math.round(parseFloat(calories) || 0),
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
    };

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

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      {/* Row 1: Time, Amount, Food (5 equal columns: time=1, amount=1, food=3) */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <div>
          <Label htmlFor="time" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Uhrzeit
          </Label>
          <Input
            id="time"
            type="text"
            pattern="[0-9]{2}:[0-9]{2}"
            placeholder="08:00"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div>
          <Label htmlFor="amount" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {selectedFood ? (selectedFood.baseUnit === "1 Stk" ? "Stk" : "g/ml") : "g/ml"}
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div ref={wrapperRef} className="relative col-span-3">
          <Label htmlFor="food" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Lebensmittel
          </Label>
          <Input
            id="food"
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
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
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
      </div>

      {/* Row 2: Calories + Macros */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <div>
          <Label htmlFor="calories" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            kcal
          </Label>
          <Input
            id="calories"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div>
          <Label htmlFor="protein" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            PRO
          </Label>
          <Input
            id="protein"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div>
          <Label htmlFor="fat" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            FAT
          </Label>
          <Input
            id="fat"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div>
          <Label htmlFor="carbs" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            KH
          </Label>
          <Input
            id="carbs"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div>
          <Label htmlFor="fiber" className="text-[10px] font-medium text-muted-foreground mb-1 block">
            FIB
          </Label>
          <Input
            id="fiber"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="w-full h-9 rounded-md text-sm font-semibold transition-colors text-primary-foreground"
        style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
      >
        Hinzufügen
      </button>
    </form>
  );
};

export default NutritionForm;
