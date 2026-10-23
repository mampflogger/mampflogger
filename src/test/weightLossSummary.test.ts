import { describe, expect, it } from "vitest";
import { calculateWeightLossSummary, formatWeightLossKg } from "@/lib/weightLossSummary";
import { calculateBMR, UserProfile } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";

const profile: UserProfile = { name: "Test", birthYear: 1990, heightCm: 180, weightKg: 80, gender: "male" };
const entry = (date: string, deficit = 770): NutritionEntry => ({
  id: date, date, time: "12:00", food: "Test", amount: 100,
  calories: calculateBMR(profile) - deficit, protein: 0, carbs: 0, fat: 0, fiber: 0,
});
describe("weight-loss overview", () => {
  it("displays 13700 grams as 13,7 kilograms with exactly one decimal place", () => {
    expect(formatWeightLossKg(13700)).toBe("13,7");
    expect(formatWeightLossKg(13000)).toBe("13,0");
    expect(formatWeightLossKg(13760)).toBe("13,8");
  });
  it("averages the daily losses of the last seven days in grams", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-10-20", 770), entry("2026-10-21", 1540)], [], [], "2026-10-21");
    expect(result.avgSevenDays).toBe(150);
  });
  it("includes the selected day and the six days before it, not the day before that", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-10-14", 0), entry("2026-10-15", 770), entry("2026-10-21", 770)], [], [], "2026-10-21");
    expect(result.avgSevenDays).toBe(100);
  });
  it("averages the thirty days ending with the selected day, ignoring older entries", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-09-21", 0), entry("2026-09-22", 770), entry("2026-10-21", 770)], [], [], "2026-10-21");
    expect(result.avgThirtyDays).toBe(100);
  });
  it("does not let unlogged days dilute the average", () => {
    expect(calculateWeightLossSummary(profile, [entry("2026-10-20", 770)], [], [], "2026-10-21").avgSevenDays).toBe(100);
  });
  it("keeps weight gain negative and includes booked activity calories", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-10-20", -1540)], [{ id: "a", date: "2026-10-20", activityTypeId: "a", activityName: "Test", value: 1, calories: 770, unit: "min" }], [], "2026-10-21");
    expect(result.avgSevenDays).toBe(-100);
  });
  it("uses starting weight minus latest measured weight for loss since start", () => {
    const result = calculateWeightLossSummary(profile, [], [], [{ date: "2026-10-20", kg: 77.5 }, { date: "2026-10-22", kg: 75 }], "2026-10-21");
    expect(result.sinceStart).toBe(2500);
  });
  it("returns unavailable values rather than inventing measured loss", () => {
    expect(calculateWeightLossSummary(profile, [], [], [], "2026-10-21")).toEqual({ avgSevenDays: null, avgThirtyDays: null, sinceStart: null });
  });
});
