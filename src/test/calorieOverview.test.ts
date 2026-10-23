import { describe, expect, it } from "vitest";
import { calculateAverageCalorieIntake } from "@/lib/calorieOverview";
import { NutritionEntry } from "@/types/nutrition";

const entry = (date: string, calories: number): NutritionEntry => ({
  id: `${date}-${calories}`, date, time: "12:00", food: "Test", amount: 100,
  calories, protein: 0, carbs: 0, fat: 0, fiber: 0,
});

describe("calorie overview daily averages", () => {
  it("averages intake over seven days, including selected day and excluding older/future days", () => {
    const entries = [entry("2026-10-16", 9000), entry("2026-10-17", 1000), entry("2026-10-23", 3000), entry("2026-10-24", 9000)];
    expect(calculateAverageCalorieIntake(entries, "2026-10-23", 7)).toBe(2000);
  });
  it("averages daily calories in the last thirty days instead of showing their sum", () => {
    const entries = [entry("2026-09-23", 9000), entry("2026-09-24", 1200), entry("2026-10-23", 1800)];
    expect(calculateAverageCalorieIntake(entries, "2026-10-23", 30)).toBe(1500);
  });
  it("groups multiple meals by day, skips unlogged days and counts logged zero-calorie days", () => {
    const entries = [entry("2026-10-22", 1200), entry("2026-10-22", 800), entry("2026-10-23", 0)];
    expect(calculateAverageCalorieIntake(entries, "2026-10-23", 7)).toBe(1000);
  });
  it("returns zero without logged days", () => {
    expect(calculateAverageCalorieIntake([], "2026-10-23", 30)).toBe(0);
  });
});