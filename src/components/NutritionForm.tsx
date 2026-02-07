import { useState, useRef, useEffect, useCallback } from "react";
import { NutritionEntry, generateId } from "@/types/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close suggestions on outside click
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

    // Set default amount to baseAmount and fill values
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

  // Scroll highlighted item into view
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
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      {/* Time & Food */}
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <div>
          <Label htmlFor="time" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Uhrzeit
          </Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
        <div ref={wrapperRef} className="relative">
          <Label htmlFor="food" className="text-xs font-medium text-muted-foreground mb-1.5 block">
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
            className="h-11 bg-muted/50"
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
                  className={`flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors ${
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
                  <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                    {item.calories} kcal / {item.baseUnit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Amount & Calories */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Menge {selectedFood ? `(${selectedFood.baseUnit === "1 Stk" ? "Stk" : "g/ml"})` : "(g/ml)"}
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
        <div>
          <Label htmlFor="calories" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Kalorien (kcal)
          </Label>
          <Input
            id="calories"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
      </div>

      {/* Macros: 4-column grid */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label htmlFor="protein" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Eiweiß (g)
          </Label>
          <Input
            id="protein"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
        <div>
          <Label htmlFor="carbs" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            KH (g)
          </Label>
          <Input
            id="carbs"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
        <div>
          <Label htmlFor="fat" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Fett (g)
          </Label>
          <Input
            id="fat"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
        <div>
          <Label htmlFor="fiber" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Ballast (g)
          </Label>
          <Input
            id="fiber"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            className="h-11 bg-muted/50"
          />
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-base font-semibold gap-2">
        <Plus className="w-5 h-5" />
        Eintrag hinzufügen
      </Button>
    </form>
  );
};

export default NutritionForm;
