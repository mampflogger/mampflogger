export interface UserProfile {
  name: string;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
  goalFluidMl?: number;
  goalDeficit?: number;
  goalActivityBonus?: number;
  goalWeightKg?: number;
}

export interface ActivityType {
  id: string;
  name: string;
  caloriesPerUnit: number;
  unit: string; // e.g. "km", "min", "Schritte"
}

export interface BookedActivity {
  id: string;
  date: string; // YYYY-MM-DD
  activityTypeId: string;
  activityName: string;
  value: number;
  calories: number;
  unit: string;
}

// Keep for backward compat — will be replaced
export interface DailyActivity {
  date: string;
  steps: number;
  intensity: "low" | "high";
}

const PROFILE_KEY = "nutrition-log-profile";
const ACTIVITY_KEY = "nutrition-log-activities";
const ACTIVITY_TYPES_KEY = "mampflogger-activity-types";
const BOOKED_ACTIVITIES_KEY = "mampflogger-booked-activities";

// Default activity types
const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  { id: "schwimmen", name: "Schwimmen", caloriesPerUnit: 15, unit: "min" },
  { id: "joggen", name: "Joggen", caloriesPerUnit: 15, unit: "min" },
  { id: "spazieren-gassi", name: "Spazieren Gassi", caloriesPerUnit: 0.05, unit: "Schritte" },
  { id: "wandern", name: "Wandern", caloriesPerUnit: 0.06, unit: "Schritte" },
  { id: "nordik-walking", name: "Nordik Walking", caloriesPerUnit: 0.08, unit: "Schritte" },
  { id: "bergwandern", name: "Bergwandern", caloriesPerUnit: 0.1, unit: "Schritte" },
  { id: "radfahren", name: "Radfahren", caloriesPerUnit: 10, unit: "min" },
  { id: "rennradfahren", name: "Rennradfahren", caloriesPerUnit: 18, unit: "min" },
  { id: "mountainbiken", name: "Mountainbiken", caloriesPerUnit: 15, unit: "min" },
  { id: "krafttraining-leicht", name: "Krafttraining leicht", caloriesPerUnit: 6, unit: "min" },
  { id: "krafttraining-intensiv", name: "Krafttraining intensiv", caloriesPerUnit: 11, unit: "min" },
  { id: "crossfit-zirkeltraining", name: "Crossfit Zirkeltraining", caloriesPerUnit: 14, unit: "min" },
  { id: "reiten", name: "Reiten", caloriesPerUnit: 9, unit: "min" },
  { id: "tanzen-club-party", name: "Tanzen Club Party", caloriesPerUnit: 9, unit: "min" },
  { id: "tanzen-zumba-hiphop", name: "Tanzen Zumba HipHop", caloriesPerUnit: 14, unit: "min" },
];

export function loadProfile(): UserProfile | null {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadActivities(): DailyActivity[] {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveActivities(activities: DailyActivity[]): void {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

export function getActivityForDate(activities: DailyActivity[], date: string): DailyActivity {
  return activities.find((a) => a.date === date) || { date, steps: 0, intensity: "low" as const };
}

export function setActivityForDate(
  activities: DailyActivity[],
  activity: DailyActivity
): DailyActivity[] {
  const existing = activities.findIndex((a) => a.date === activity.date);
  if (existing >= 0) {
    const updated = [...activities];
    updated[existing] = activity;
    return updated;
  }
  return [...activities, activity];
}

// Activity Types CRUD
export function loadActivityTypes(): ActivityType[] {
  try {
    const data = localStorage.getItem(ACTIVITY_TYPES_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  // Initialize with defaults
  saveActivityTypes(DEFAULT_ACTIVITY_TYPES);
  return [...DEFAULT_ACTIVITY_TYPES];
}

export function saveActivityTypes(types: ActivityType[]): void {
  localStorage.setItem(ACTIVITY_TYPES_KEY, JSON.stringify(types));
}

// Booked Activities CRUD
export function loadBookedActivities(): BookedActivity[] {
  try {
    const data = localStorage.getItem(BOOKED_ACTIVITIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBookedActivities(activities: BookedActivity[]): void {
  localStorage.setItem(BOOKED_ACTIVITIES_KEY, JSON.stringify(activities));
}

export function getBookedActivitiesForDate(activities: BookedActivity[], date: string): BookedActivity[] {
  return activities.filter((a) => a.date === date);
}

export function calculateBookedActivityBonus(activities: BookedActivity[], date: string): number {
  return activities
    .filter((a) => a.date === date)
    .reduce((sum, a) => sum + a.calories, 0);
}

/**
 * BMR using Mifflin-St Jeor equation + NEAT factor (1.2)
 */
export function calculateBMR(profile: UserProfile): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  const bmr = profile.gender === "male" ? base + 5 : base - 161;
  return Math.round(bmr * 1.2);
}

/**
 * Legacy - kept for backward compat with WeeklyOverview
 */
export function calculateActivityBonus(activity: DailyActivity): number {
  const caloriesPerStep = activity.intensity === "high" ? 0.06 : 0.03;
  return Math.round(activity.steps * caloriesPerStep);
}

export function calculateTDEE(profile: UserProfile, activity: DailyActivity): number {
  return calculateBMR(profile) + calculateActivityBonus(activity);
}

export function calculateTDEEWithBooked(profile: UserProfile, bookedBonus: number): number {
  return calculateBMR(profile) + bookedBonus;
}
