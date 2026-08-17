import type { Activity, Goal, SexEquation, WeightPoint } from "@/lib/startHereEngine";

export type Equipment = "gym" | "dumbbells" | "home" | "mixed" | "unsure";
export type Experience = "new" | "some" | "experienced";
export type Confidence = "nervous" | "unsure" | "comfortable";
export type DetailLevel = "simple" | "standard" | "detailed";
export type Budget = "low" | "medium" | "flexible";
export type Variety = "repeat" | "some" | "lots";
export type DietType = "none" | "vegetarian" | "vegan";
export type MealPortion = "smaller" | "standard" | "larger";
export type UnitSystem = "imperial" | "metric";
export type AppTab = "today" | "eat" | "train" | "progress" | "coach";

export interface TodayOverride {
  minutes: number | null;
  equipment: Equipment | null;
  note: string | null;
}

export interface WorkoutSetLog {
  reps: number | null;
  weight: number | null;
  complete: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: WorkoutSetLog[];
}

export interface WorkoutSessionLog {
  id: string;
  date: string;
  workoutName: string;
  minutes: number;
  exercises: ExerciseLog[];
  completed: boolean;
}

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  changeSummary?: string;
  createdAt: string;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  unitSystem: UnitSystem;
  goal: Goal;
  age: number;
  sexEquation: SexEquation;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  trainingDays: number;
  sessionMinutes: number;
  equipment: Equipment;
  experience: Experience;
  confidence: Confidence;
  preferredDays: string[];
  likedFoods: string[];
  cuisines: string[];
  mealFormats: string[];
  breakfastStyle: string;
  cookingMinutes: number;
  budget: Budget;
  variety: Variety;
  mealsPerDay: number;
  dislikes: string[];
  neverFoods: string[];
  allergies: string[];
  dietType: DietType;
  healthFlags: string[];
  calorieOverride: number | null;
  proteinOverride: number | null;
  hideCalories: boolean;
  detailLevel: DetailLevel;
  showPrep: boolean;
  preferredExercises: string[];
  dislikedExercises: string[];
  focusAreas: string[];
  todayOverride: TodayOverride;
  eatenMealIds: string[];
  swappedMealIds: Record<string, string>;
  mealPortionOverrides: Record<string, MealPortion>;
  rejectedMealIds: string[];
  workoutLogs: WorkoutSessionLog[];
  weightLog: WeightPoint[];
  coachHistory: CoachMessage[];
  onboardingCompletedAt: string | null;
}

export const INITIAL_STATE: AppState = {
  version: 5,
  onboarded: false,
  unitSystem: "imperial",
  goal: "unsure",
  age: 25,
  sexEquation: "male",
  heightCm: 178,
  weightKg: 82,
  activity: "light",
  trainingDays: 3,
  sessionMinutes: 45,
  equipment: "gym",
  experience: "new",
  confidence: "unsure",
  preferredDays: ["Mon", "Wed", "Fri"],
  likedFoods: ["Chicken", "Pasta", "Eggs"],
  cuisines: ["Italian", "American"],
  mealFormats: ["Bowls", "Plates"],
  breakfastStyle: "savory",
  cookingMinutes: 25,
  budget: "medium",
  variety: "some",
  mealsPerDay: 3,
  dislikes: [],
  neverFoods: [],
  allergies: [],
  dietType: "none",
  healthFlags: [],
  calorieOverride: null,
  proteinOverride: null,
  hideCalories: false,
  detailLevel: "simple",
  showPrep: false,
  preferredExercises: [],
  dislikedExercises: [],
  focusAreas: [],
  todayOverride: { minutes: null, equipment: null, note: null },
  eatenMealIds: [],
  swappedMealIds: {},
  mealPortionOverrides: {},
  rejectedMealIds: [],
  workoutLogs: [],
  weightLog: [
    { date: "2026-08-03", weight: 82.5 },
    { date: "2026-08-05", weight: 82.3 },
    { date: "2026-08-07", weight: 82.2 },
    { date: "2026-08-09", weight: 82.0 },
    { date: "2026-08-11", weight: 81.9 },
    { date: "2026-08-13", weight: 81.8 },
    { date: "2026-08-15", weight: 81.7 },
  ],
  coachHistory: [
    {
      id: "coach-welcome",
      role: "coach",
      text: "Tell me what does not fit in normal words. I can change the actual plan, not just give you advice.",
      createdAt: "2026-08-16T12:00:00.000Z",
    },
  ],
  onboardingCompletedAt: null,
};

export function mergeStoredState(value: unknown): AppState {
  if (!value || typeof value !== "object") return INITIAL_STATE;
  const stored = value as Partial<AppState>;
  return {
    ...INITIAL_STATE,
    ...stored,
    todayOverride: { ...INITIAL_STATE.todayOverride, ...(stored.todayOverride ?? {}) },
    swappedMealIds: stored.swappedMealIds ?? {},
    mealPortionOverrides: stored.mealPortionOverrides ?? {},
    rejectedMealIds: Array.isArray(stored.rejectedMealIds) ? stored.rejectedMealIds : [],
    weightLog: Array.isArray(stored.weightLog) ? stored.weightLog : INITIAL_STATE.weightLog,
    workoutLogs: Array.isArray(stored.workoutLogs) ? stored.workoutLogs : [],
    coachHistory: Array.isArray(stored.coachHistory) && stored.coachHistory.length
      ? stored.coachHistory
      : INITIAL_STATE.coachHistory,
    version: 5,
  };
}
