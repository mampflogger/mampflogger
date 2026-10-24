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

describe("previous day calorie intake", () => {
  it("shows yesterday's intake instead of a seven day average", () => {
    const entries = [entry("2026-10-22", 1500), entry("2026-10-23", 2400), entry("2026-10-24", 900)];
    expect(calculatePreviousDayCalorieIntake(entries, "2026-10-24")).toBe(2400);
  });
  it("sums all meals of that one day and ignores other days", () => {
    const entries = [entry("2026-10-22", 1200), entry("2026-10-23", 800), entry("2026-10-23", 700), entry("2026-10-24", 500)];
    expect(calculatePreviousDayCalorieIntake(entries, "2026-10-24")).toBe(1500);
  });
  it("crosses month and year boundaries", () => {
    expect(calculatePreviousDayCalorieIntake([entry("2026-10-31", 1800)], "2026-11-01")).toBe(1800);
    expect(calculatePreviousDayCalorieIntake([entry("2025-12-31", 2100)], "2026-01-01")).toBe(2100);
  });
  it("returns null when yesterday has no entries", () => {
    expect(calculatePreviousDayCalorieIntake([entry("2026-10-24", 900)], "2026-10-24")).toBeNull();
    expect(calculatePreviousDayCalorieIntake([entry("2026-10-21", 900)], "2026-10-24")).toBeNull();
  });
  it("counts a logged zero-calorie day as a real day", () => {
    expect(calculatePreviousDayCalorieIntake([entry("2026-10-23", 0)], "2026-10-24")).toBe(0);
  });
});

});