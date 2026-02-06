import { useState } from "react";
import { NutritionEntry, generateId, formatDate } from "@/types/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

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
        <div>
          <Label htmlFor="food" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Lebensmittel
          </Label>
          <Input
            id="food"
            type="text"
            placeholder="z.B. Haferflocken"
            value={food}
            onChange={(e) => setFood(e.target.value)}
            className="h-11 bg-muted/50"
            required
          />
        </div>
      </div>

      {/* Amount & Calories */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Menge (g/ml)
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
