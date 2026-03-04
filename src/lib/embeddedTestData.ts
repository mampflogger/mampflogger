import { saveEntries } from "@/lib/storage";
import { BookedActivity, saveBookedActivities, saveProfile, UserProfile } from "@/types/profile";
import { formatDate, generateId, NutritionEntry } from "@/types/nutrition";

export type TestDataGender = "male" | "female";

export interface EmbeddedTestDataset {
  profile: UserProfile;
  entries: NutritionEntry[];
  bookedActivities: BookedActivity[];
}

type MealTemplate = Omit<NutritionEntry, "id" | "date">;
type ActivityTemplate = Omit<BookedActivity, "id" | "date">;

const DAYS_OF_HISTORY = 14;

const TEST_PROFILES: Record<TestDataGender, UserProfile> = {
  male: {
    name: "Max Test",
    birthYear: 1988,
    heightCm: 182,
    weightKg: 86.4,
    gender: "male",
    goalFluidMl: 2800,
    goalDeficit: 450,
    goalActivityBonus: 350,
    goalWeightKg: 79,
  },
  female: {
    name: "Mia Test",
    birthYear: 1992,
    heightCm: 168,
    weightKg: 67.8,
    gender: "female",
    goalFluidMl: 2400,
    goalDeficit: 350,
    goalActivityBonus: 250,
    goalWeightKg: 62,
  },
};

const MEAL_ROTATIONS: Record<TestDataGender, MealTemplate[][]> = {
  male: [
    [
      { time: "07:30", food: "Haferflocken mit Skyr", amount: 350, calories: 520, protein: 34, carbs: 55, fat: 14, fiber: 9 },
      { time: "12:30", food: "Hähnchen mit Reis", amount: 520, calories: 760, protein: 58, carbs: 74, fat: 22, fiber: 6 },
      { time: "16:00", food: "Apfel und Mandeln", amount: 180, calories: 260, protein: 7, carbs: 24, fat: 15, fiber: 6 },
      { time: "19:00", food: "Lachs mit Gemüse", amount: 430, calories: 690, protein: 47, carbs: 29, fat: 38, fiber: 8 },
    ],
    [
      { time: "07:45", food: "Rührei mit Vollkornbrot", amount: 280, calories: 480, protein: 29, carbs: 32, fat: 25, fiber: 6 },
      { time: "12:45", food: "Chili con Carne", amount: 480, calories: 710, protein: 48, carbs: 52, fat: 31, fiber: 12 },
      { time: "15:45", food: "Proteinshake", amount: 350, calories: 240, protein: 32, carbs: 11, fat: 6, fiber: 2 },
      { time: "19:30", food: "Ofenkartoffeln mit Quark", amount: 460, calories: 610, protein: 33, carbs: 68, fat: 19, fiber: 7 },
    ],
    [
      { time: "08:00", food: "Joghurt mit Beeren", amount: 320, calories: 390, protein: 27, carbs: 38, fat: 12, fiber: 7 },
      { time: "12:15", food: "Pasta Bolognese", amount: 500, calories: 780, protein: 39, carbs: 82, fat: 29, fiber: 8 },
      { time: "16:30", food: "Banane mit Erdnussbutter", amount: 170, calories: 290, protein: 6, carbs: 28, fat: 17, fiber: 4 },
      { time: "19:15", food: "Bunter Salat mit Feta", amount: 380, calories: 520, protein: 24, carbs: 21, fat: 34, fiber: 9 },
    ],
  ],
  female: [
    [
      { time: "07:30", food: "Porridge mit Beeren", amount: 280, calories: 390, protein: 20, carbs: 49, fat: 11, fiber: 8 },
      { time: "12:30", food: "Hähnchen-Bowl", amount: 420, calories: 560, protein: 40, carbs: 48, fat: 19, fiber: 7 },
      { time: "16:00", food: "Skyr mit Kiwi", amount: 200, calories: 180, protein: 18, carbs: 16, fat: 2, fiber: 3 },
      { time: "19:00", food: "Lachs mit Brokkoli", amount: 340, calories: 470, protein: 32, carbs: 16, fat: 27, fiber: 7 },
    ],
    [
      { time: "07:45", food: "Rührei mit Spinat", amount: 230, calories: 310, protein: 22, carbs: 8, fat: 20, fiber: 3 },
      { time: "12:45", food: "Linsencurry", amount: 390, calories: 520, protein: 24, carbs: 55, fat: 18, fiber: 13 },
      { time: "15:45", food: "Cappuccino und Nüsse", amount: 140, calories: 210, protein: 6, carbs: 8, fat: 16, fiber: 3 },
      { time: "19:30", food: "Ofengemüse mit Hüttenkäse", amount: 360, calories: 430, protein: 27, carbs: 31, fat: 19, fiber: 8 },
    ],
    [
      { time: "08:00", food: "Joghurt mit Granola", amount: 260, calories: 340, protein: 17, carbs: 36, fat: 12, fiber: 5 },
      { time: "12:15", food: "Pasta mit Pesto", amount: 410, calories: 610, protein: 18, carbs: 61, fat: 21, fiber: 6 },
      { time: "16:30", food: "Apfel und Käsewürfel", amount: 150, calories: 190, protein: 8, carbs: 17, fat: 10, fiber: 3 },
      { time: "19:15", food: "Salat mit Feta", amount: 320, calories: 390, protein: 19, carbs: 14, fat: 25, fiber: 7 },
    ],
  ],
};

const ACTIVITY_ROTATIONS: Record<TestDataGender, ActivityTemplate[]> = {
  male: [
    { activityTypeId: "radfahren", activityName: "Radfahren", value: 45, calories: 450, unit: "min" },
    { activityTypeId: "krafttraining-intensiv", activityName: "Krafttraining intensiv", value: 50, calories: 550, unit: "min" },
    { activityTypeId: "wandern", activityName: "Wandern", value: 9000, calories: 540, unit: "Schritte" },
    { activityTypeId: "schwimmen", activityName: "Schwimmen", value: 35, calories: 525, unit: "min" },
  ],
  female: [
    { activityTypeId: "radfahren", activityName: "Radfahren", value: 35, calories: 350, unit: "min" },
    { activityTypeId: "krafttraining-leicht", activityName: "Krafttraining leicht", value: 40, calories: 240, unit: "min" },
    { activityTypeId: "spazieren-gassi", activityName: "Spazieren Gassi", value: 8000, calories: 400, unit: "Schritte" },
    { activityTypeId: "tanzen-zumba-hiphop", activityName: "Tanzen Zumba HipHop", value: 30, calories: 420, unit: "min" },
  ],
};

function shiftDate(baseDate: Date, offsetDays: number): Date {
  const shifted = new Date(baseDate);
  shifted.setDate(shifted.getDate() + offsetDays);
  return shifted;
}

export function hasConfiguredPersonalProfile(profile: UserProfile | null): boolean {
  if (!profile) return false;

  const hasFilledFields =
    profile.name.trim().length > 0 ||
    profile.birthYear > 0 ||
    profile.heightCm > 0 ||
    profile.weightKg > 0;

  return hasFilledFields || profile.gender !== "male";
}

export function buildEmbeddedTestDataset(gender: TestDataGender): EmbeddedTestDataset {
  const today = new Date();
  const mealRotation = MEAL_ROTATIONS[gender];
  const activityRotation = ACTIVITY_ROTATIONS[gender];
  const entries: NutritionEntry[] = [];
  const bookedActivities: BookedActivity[] = [];

  for (let dayOffset = DAYS_OF_HISTORY - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = formatDate(shiftDate(today, -dayOffset));
    const mealPlan = mealRotation[dayOffset % mealRotation.length];

    mealPlan.forEach((meal) => {
      entries.push({
        id: generateId(),
        date,
        ...meal,
      });
    });

    if (dayOffset % 2 === 0) {
      bookedActivities.push({
        id: generateId(),
        date,
        ...activityRotation[dayOffset % activityRotation.length],
      });
    }
  }

  return {
    profile: { ...TEST_PROFILES[gender] },
    entries,
    bookedActivities,
  };
}

export function applyEmbeddedTestDataset(gender: TestDataGender): EmbeddedTestDataset {
  const dataset = buildEmbeddedTestDataset(gender);

  saveProfile(dataset.profile);
  saveEntries(dataset.entries);
  saveBookedActivities(dataset.bookedActivities);
  localStorage.removeItem("nutrition-log-activities");

  return dataset;
}
