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
  joggingKm: number;
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
  return activities.find((a) => a.date === date) || { date, steps: 0, joggingKm: 0 };
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
 * BMR using Mifflin-St Jeor equation
 * Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161 + 166 = 10w + 6.25h - 5a + 5
 * Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 */
export function calculateBMR(profile: UserProfile): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return Math.round(profile.gender === "male" ? base + 5 : base - 161);
}

/**
 * Activity bonus calories:
 * Steps: ~0.04 kcal per step (conservative)
 * Jogging: ~70 kcal per km (average)
 */
export function calculateActivityBonus(activity: DailyActivity): number {
  const stepsBonus = activity.steps * 0.04;
  const joggingBonus = activity.joggingKm * 70;
  return Math.round(stepsBonus + joggingBonus);
}

export function calculateTDEE(profile: UserProfile, activity: DailyActivity): number {
  return calculateBMR(profile) + calculateActivityBonus(activity);
}
