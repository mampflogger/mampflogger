import { describe, expect, it } from "vitest";
import { calculateWeightLossSummary } from "@/lib/weightLossSummary";
import { calculateBMR, UserProfile } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";

const profile: UserProfile = { name: "Test", birthYear: 1990, heightCm: 180, weightKg: 80, gender: "male" };
const entry = (date: string, deficit = 770): NutritionEntry => ({
  id: date, date, time: "12:00", food: "Test", amount: 100,
  calories: calculateBMR(profile) - deficit, protein: 0, carbs: 0, fat: 0, fiber: 0,
});
describe("weight-loss overview", () => {
  it("sums only the last seven completed calendar days in grams", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-10-14"), entry("2026-10-20"), entry("2026-10-13"), entry("2026-10-21")], [], [], "2026-10-21");
    expect(result.sevenDays).toBe(200);
  });
  it("uses the last 30 days for monthly loss, not older entries", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-09-21"), entry("2026-10-20"), entry("2026-09-20")], [], [], "2026-10-21");
    expect(result.thirtyDays).toBe(200);
  });
  it("uses starting weight minus latest measured weight for loss since start", () => {
    const result = calculateWeightLossSummary(profile, [], [], [{ date: "2026-10-20", kg: 77.5 }, { date: "2026-10-22", kg: 75 }], "2026-10-21");
    expect(result.sinceStart).toBe(2500);
  });
  it("does not assume weight loss on days without entries", () => {
    expect(calculateWeightLossSummary(profile, [entry("2026-10-20")], [], [], "2026-10-21").sevenDays).toBe(100);
  });
  it("keeps weight gain negative and includes booked activity calories", () => {
    const result = calculateWeightLossSummary(profile, [entry("2026-10-20", -1540)], [{ id: "a", date: "2026-10-20", activityTypeId: "a", activityName: "Test", value: 1, calories: 770, unit: "min" }], [], "2026-10-21");
    expect(result.sevenDays).toBe(-100);
  });
  it("returns unavailable values rather than inventing measured loss", () => {
    expect(calculateWeightLossSummary(profile, [], [], [], "2026-10-21")).toEqual({ sevenDays: null, thirtyDays: null, sinceStart: null });
  });
});