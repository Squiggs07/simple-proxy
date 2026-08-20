import type { Activity, Goal, SexEquation, WeightPoint } from "@/lib/startHereEngine";

export type Equipment = "gym" | "dumbbells" | "home" | "mixed" | "unsure";
export type Experience = "new" | "some" | "experienced";
export type Confidence = "nervous" | "unsure" | "comfortable";
export type LiftingHistory = "none" | "returning" | "consistent";
export type DetailLevel = "simple" | "standard" | "detailed";
export type Budget = "low" | "medium" | "flexible";
export type Variety = "repeat" | "some" | "lots";
export type DietType = "none" | "vegetarian" | "vegan";
export type MealPortion = "smaller" | "standard" | "larger";
export type UnitSystem = "imperial" | "metric";
export type AppTab = "today" | "eat" | "train" | "progress" | "coach";
export type Readiness = "low" | "normal" | "high";
export type AdaptationKind = "recovery" | "schedule" | "nutrition" | "behavior";
export type WeekTrainingExceptionKind = "move" | "skip";
export type CustomMealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface TodayOverride {
  minutes: number | null;
  equipment: Equipment | null;
  note: string | null;
}

export interface LiftingBaseline {
  benchKg: number | null;
  squatKg: number | null;
  deadliftKg: number | null;
  pushups: number | null;
  note: string;
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

export interface MealLog {
  date: string;
  mealId: string;
}

export interface ExternalFoodLog {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  source: "verified" | "user" | "estimated";
  sourceLabel: string;
  catalogId: string | null;
  calorieRange?: { min: number; max: number } | null;
  proteinRange?: { min: number; max: number } | null;
}

export interface MealSwapLog {
  date: string;
  sourceMealId: string;
  chosenMealId: string;
}

export interface CustomMealMemory {
  id: string;
  name: string;
  description: string;
  type: CustomMealType;
  calories: number;
  protein: number;
  source: ExternalFoodLog["source"];
  sourceLabel: string;
  calorieRange: { min: number; max: number } | null;
  proteinRange: { min: number; max: number } | null;
  remember: boolean;
  firstChosenOn: string;
  lastChosenOn: string;
  firstChosenAt: string;
  lastChosenAt: string;
  timesChosen: number;
}

export interface PreferenceEvidence {
  id: string;
  domain: "meal" | "training" | "schedule";
  kind: "chosen" | "rejected" | "portion" | "constraint";
  subjectId: string;
  label: string;
  context: string;
  source: "explicit" | "observed";
  confidence: "low" | "medium" | "high";
  observedAt: string;
}

export interface ExerciseSwapLog {
  date: string;
  sourceExerciseId: string;
  chosenExerciseId: string;
}

export interface ReadinessCheckIn {
  date: string;
  readiness: Readiness;
}

export interface AdaptationEvent {
  id: string;
  date: string;
  kind: AdaptationKind;
  title: string;
}

export interface WeekTrainingException {
  id: string;
  weekStart: string;
  kind: WeekTrainingExceptionKind;
  fromDate: string;
  toDate: string | null;
  createdAt: string;
  note: string | null;
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
  currentDay: string;
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
  liftingHistory: LiftingHistory;
  liftingBaseline: LiftingBaseline;
  preferredDays: string[];
  likedFoods: string[];
  foodRequests: string[];
  cuisines: string[];
  mealFormats: string[];
  breakfastStyle: string;
  cookingMinutes: number;
  budget: Budget;
  variety: Variety;
  mealsPerDay: number;
  mealRotation: number;
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
  mealLogs: MealLog[];
  externalFoodLogs: ExternalFoodLog[];
  mealSwapLogs: MealSwapLog[];
  customMeals: CustomMealMemory[];
  preferenceEvidence: PreferenceEvidence[];
  exerciseSwapLogs: ExerciseSwapLog[];
  readinessCheckIns: ReadinessCheckIn[];
  adaptationEvents: AdaptationEvent[];
  weekTrainingExceptions: WeekTrainingException[];
  swappedMealIds: Record<string, string>;
  mealPortionOverrides: Record<string, MealPortion>;
  rejectedMealIds: string[];
  workoutLogs: WorkoutSessionLog[];
  weightLog: WeightPoint[];
  coachHistory: CoachMessage[];
  onboardingCompletedAt: string | null;
}

export const INITIAL_STATE: AppState = {
  version: 11,
  onboarded: false,
  currentDay: "",
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
  liftingHistory: "none",
  liftingBaseline: {
    benchKg: null,
    squatKg: null,
    deadliftKg: null,
    pushups: null,
    note: "",
  },
  preferredDays: ["Mon", "Wed", "Fri"],
  likedFoods: ["Chicken", "Pasta", "Eggs"],
  foodRequests: [],
  cuisines: ["Italian", "American"],
  mealFormats: ["Bowls", "Plates"],
  breakfastStyle: "savory",
  cookingMinutes: 25,
  budget: "medium",
  variety: "some",
  mealsPerDay: 3,
  mealRotation: 0,
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
  mealLogs: [],
  externalFoodLogs: [],
  mealSwapLogs: [],
  customMeals: [],
  preferenceEvidence: [],
  exerciseSwapLogs: [],
  readinessCheckIns: [],
  adaptationEvents: [],
  weekTrainingExceptions: [],
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
      text: "Ask me anything about training, food, recovery, sleep, or habits. I can also change the actual plan when you want me to.",
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
    liftingBaseline: { ...INITIAL_STATE.liftingBaseline, ...(stored.liftingBaseline ?? {}) },
    foodRequests: Array.isArray(stored.foodRequests) ? stored.foodRequests : [],
    mealRotation: typeof stored.mealRotation === "number" ? stored.mealRotation : 0,
    mealLogs: Array.isArray(stored.mealLogs) ? stored.mealLogs : [],
    externalFoodLogs: Array.isArray(stored.externalFoodLogs) ? stored.externalFoodLogs : [],
    mealSwapLogs: Array.isArray(stored.mealSwapLogs) ? stored.mealSwapLogs : [],
    customMeals: Array.isArray(stored.customMeals) ? stored.customMeals : [],
    preferenceEvidence: Array.isArray(stored.preferenceEvidence) ? stored.preferenceEvidence : [],
    exerciseSwapLogs: Array.isArray(stored.exerciseSwapLogs) ? stored.exerciseSwapLogs : [],
    readinessCheckIns: Array.isArray(stored.readinessCheckIns) ? stored.readinessCheckIns : [],
    adaptationEvents: Array.isArray(stored.adaptationEvents) ? stored.adaptationEvents : [],
    weekTrainingExceptions: Array.isArray(stored.weekTrainingExceptions) ? stored.weekTrainingExceptions : [],
    swappedMealIds: stored.swappedMealIds ?? {},
    mealPortionOverrides: stored.mealPortionOverrides ?? {},
    rejectedMealIds: Array.isArray(stored.rejectedMealIds) ? stored.rejectedMealIds : [],
    weightLog: Array.isArray(stored.weightLog) ? stored.weightLog : INITIAL_STATE.weightLog,
    workoutLogs: Array.isArray(stored.workoutLogs) ? stored.workoutLogs : [],
    coachHistory: Array.isArray(stored.coachHistory) && stored.coachHistory.length
      ? stored.coachHistory
      : INITIAL_STATE.coachHistory,
    currentDay: typeof stored.currentDay === "string" ? stored.currentDay : "",
    version: 11,
  };
}
