export interface NutritionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  food: string;
  amount: number; // g or ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  fiberPercent: number;
}

export function calculateDailySummary(entries: NutritionEntry[]): DailySummary {
  const totalCalories = entries.reduce((sum, e) => sum + Math.round(e.calories), 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = entries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFat = entries.reduce((sum, e) => sum + e.fat, 0);
  const totalFiber = entries.reduce((sum, e) => sum + e.fiber, 0);

  const totalMacroWeight = totalProtein + totalCarbs + totalFat + totalFiber;

  return {
    totalCalories,
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    totalFiber: Math.round(totalFiber),
    proteinPercent: totalMacroWeight > 0 ? Math.round((totalProtein / totalMacroWeight) * 100) : 0,
    carbsPercent: totalMacroWeight > 0 ? Math.round((totalCarbs / totalMacroWeight) * 100) : 0,
    fatPercent: totalMacroWeight > 0 ? Math.round((totalFat / totalMacroWeight) * 100) : 0,
    fiberPercent: totalMacroWeight > 0 ? Math.round((totalFiber / totalMacroWeight) * 100) : 0,
  };
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
