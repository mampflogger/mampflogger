export interface UserProfile {
  name: string;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  steps: number;
  intensity: "low" | "high";
}

const PROFILE_KEY = "nutrition-log-profile";
const ACTIVITY_KEY = "nutrition-log-activities";

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

/**
 * BMR using Mifflin-St Jeor equation + NEAT factor (1.2)
 * NEAT = Non-Exercise Activity Thermogenesis
 * Male:   (10 × weight + 6.25 × height − 5 × age + 5) × 1.2
 * Female: (10 × weight + 6.25 × height − 5 × age − 161) × 1.2
 */
export function calculateBMR(profile: UserProfile): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  const bmr = profile.gender === "male" ? base + 5 : base - 161;
  return Math.round(bmr * 1.2);
}

/**
 * Activity bonus calories:
 * Low intensity (spazieren): ~0.03 kcal per step
 * High intensity (powerwalking): ~0.06 kcal per step
 */
export function calculateActivityBonus(activity: DailyActivity): number {
  const caloriesPerStep = activity.intensity === "high" ? 0.06 : 0.03;
  return Math.round(activity.steps * caloriesPerStep);
}

export function calculateTDEE(profile: UserProfile, activity: DailyActivity): number {
  return calculateBMR(profile) + calculateActivityBonus(activity);
}
