import { calculateTargets, smoothedWeightTrend } from "@/lib/startHereEngine";
import { EXERCISES, mealMacros, type Exercise, type Meal } from "@/lib/startHereCatalog";
import { ALL_MEALS } from "@/lib/startHereMealLibrary";
import type { AppState, Equipment, MealPortion } from "@/lib/startHereModels";
import { displayLoad } from "@/lib/startHereUnits";

export interface RankedMeal {
  meal: Meal;
  score: number;
  reasons: string[];
}

export interface PlannedMeal {
  slot: string;
  sourceMealId: string;
  meal: Meal;
  calories: number;
  protein: number;
  portion: MealPortion;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  previous: string;
}

export interface WorkoutPlan {
  name: string;
  minutes: number;
  equipment: Equipment;
  focus: string;
  exercises: WorkoutExercise[];
  note: string;
}

function includesLoose(items: string[], candidate: string) {
  const normalized = candidate.toLowerCase();
  return items.some((item) => normalized.includes(item.toLowerCase()) || item.toLowerCase().includes(normalized));
}

function mealContains(meal: Meal, terms: string[]) {
  const haystack = [
    meal.name,
    meal.cuisine,
    meal.format,
    ...meal.preferenceTags,
    ...meal.searchTags,
    ...meal.ingredients.flatMap((item) => [item.name, ...item.tags]),
  ].join(" ").toLowerCase();
  return terms.some((term) => term.trim() && haystack.includes(term.toLowerCase()));
}

export function mealFamilyKey(meal: Meal) {
  const text = [meal.name, meal.format, ...meal.searchTags].join(" ").toLowerCase();
  const bases = ["rice", "pasta", "wrap", "sandwich", "smoothie", "oats", "toast", "potato", "taco", "yogurt", "salad"];
  const base = bases.find((item) => text.includes(item)) ?? meal.format.toLowerCase();
  return `${base}:${meal.format.toLowerCase()}`;
}

export function isMealAllowed(meal: Meal, state: AppState) {
  if (state.rejectedMealIds.includes(meal.id)) return false;
  if (mealContains(meal, [...state.allergies, ...state.neverFoods])) return false;
  if (state.dietType === "vegan") {
    const blocked = ["chicken", "turkey", "steak", "beef", "salmon", "fish", "egg", "greek yogurt", "cottage cheese", "skim milk", "cheddar", "parmesan", "whey"];
    if (mealContains(meal, blocked)) return false;
  }
  if (state.dietType === "vegetarian") {
    const blocked = ["chicken", "turkey", "steak", "beef", "salmon", "fish"];
    if (mealContains(meal, blocked)) return false;
  }
  return true;
}

export function rankMeals(state: AppState): RankedMeal[] {
  return ALL_MEALS.filter((meal) => isMealAllowed(meal, state))
    .map((meal) => {
      let score = 0;
      const reasons: string[] = [];
      const directRequests = state.foodRequests.filter((request) => mealContains(meal, [request])).length;
      if (directRequests) {
        score += directRequests * 9;
        reasons.push("matches something you specifically asked to eat");
      }
      const matches = meal.preferenceTags.filter((tag) => includesLoose(state.likedFoods, tag)).length;
      if (matches) {
        score += matches * 5;
        reasons.push("matches foods you like");
      }
      if (includesLoose(state.cuisines, meal.cuisine)) {
        score += 3;
        reasons.push(`fits your ${meal.cuisine.toLowerCase()} preference`);
      }
      if (includesLoose(state.mealFormats, meal.format)) {
        score += 3;
        reasons.push(`fits your ${meal.format.toLowerCase()} preference`);
      }
      if (meal.prepMinutes <= state.cookingMinutes) {
        score += 3;
        reasons.push(`fits your ${state.cookingMinutes}-minute cooking limit`);
      } else {
        score -= Math.min(5, Math.ceil((meal.prepMinutes - state.cookingMinutes) / 5));
      }
      if (state.budget === "low" && meal.cost === "low") score += 3;
      if (state.budget === "low" && meal.cost === "high") score -= 4;
      if (state.budget === "medium" && meal.cost !== "high") score += 1;
      if (mealContains(meal, state.dislikes)) score -= 6;
      return { meal, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.meal.prepMinutes - b.meal.prepMinutes);
}

function chooseFromPool(candidates: RankedMeal[], rotation: number) {
  if (!candidates.length) return null;
  const topPool = candidates.slice(0, Math.min(4, candidates.length));
  return topPool[Math.abs(rotation) % topPool.length]?.meal ?? null;
}

function pickDistinctByType(
  ranked: RankedMeal[],
  type: Meal["type"],
  usedIds: Set<string>,
  usedFamilies: Set<string>,
  allowFamilyRepeat: boolean,
  rotation: number,
) {
  const strict = ranked.filter(({ meal }) =>
    meal.type === type &&
    !usedIds.has(meal.id) &&
    (allowFamilyRepeat || !usedFamilies.has(mealFamilyKey(meal))),
  );
  const fallback = ranked.filter(({ meal }) => meal.type === type && !usedIds.has(meal.id));
  const option = chooseFromPool(strict.length ? strict : fallback, rotation);
  if (!option) return null;
  usedIds.add(option.id);
  usedFamilies.add(mealFamilyKey(option));
  return option;
}

export function buildDayMeals(state: AppState, calorieTarget: number, proteinTarget: number): PlannedMeal[] {
  const ranked = rankMeals(state);
  const usedIds = new Set<string>();
  const usedFamilies = new Set<string>();
  const allowFamilyRepeat = state.variety === "repeat";
  const count = Math.max(2, Math.min(5, state.mealsPerDay));
  const types: Meal["type"][] = count <= 2
    ? ["Lunch", "Dinner"]
    : count === 3
      ? ["Breakfast", "Lunch", "Dinner"]
      : ["Breakfast", "Lunch", "Dinner", "Snack"];

  const selected: Meal[] = [];
  for (let index = 0; index < types.length; index += 1) {
    const meal = pickDistinctByType(ranked, types[index], usedIds, usedFamilies, allowFamilyRepeat, state.mealRotation + index);
    if (meal) selected.push(meal);
  }
  while (selected.length < count) {
    const strict = ranked.filter(({ meal }) => !usedIds.has(meal.id) && (allowFamilyRepeat || !usedFamilies.has(mealFamilyKey(meal))));
    const fallback = ranked.filter(({ meal }) => !usedIds.has(meal.id));
    const next = chooseFromPool(strict.length ? strict : fallback, state.mealRotation + selected.length);
    if (!next) break;
    usedIds.add(next.id);
    usedFamilies.add(mealFamilyKey(next));
    selected.push(next);
  }

  const baseCalories = selected.reduce((sum, meal) => sum + mealMacros(meal).calories, 0);
  const baseProtein = selected.reduce((sum, meal) => sum + mealMacros(meal).protein, 0);
  const calorieRatio = baseCalories ? calorieTarget / baseCalories : 1;
  const proteinRatio = baseProtein ? proteinTarget / baseProtein : 1;
  const ratio = Math.max(0.82, Math.min(1.18, Math.max(calorieRatio, proteinRatio * 0.9)));
  const automaticPortion: MealPortion = ratio < 0.93 ? "smaller" : ratio > 1.07 ? "larger" : "standard";

  return selected.map((meal, index) => {
    const macro = mealMacros(meal);
    const portion = state.mealPortionOverrides[meal.id] ?? automaticPortion;
    const factor = portion === "smaller" ? 0.88 : portion === "larger" ? 1.12 : 1;
    return {
      slot: index === 0 && meal.type !== "Breakfast" ? "Meal 1" : meal.type,
      sourceMealId: meal.id,
      meal,
      calories: Math.round(macro.calories * factor),
      protein: Math.round(macro.protein * factor),
      portion,
    };
  });
}

function equipmentMatches(exercise: Exercise, equipment: Equipment) {
  if (equipment === "unsure") return exercise.equipment.includes("unsure") || exercise.equipment.includes("home");
  return exercise.equipment.includes(equipment) || (equipment === "mixed" && exercise.equipment.length > 0);
}

function exerciseBlocked(exercise: Exercise, state: AppState) {
  const text = `${exercise.name} ${exercise.id}`.toLowerCase();
  return state.dislikedExercises.some((term) => text.includes(term.toLowerCase()));
}

function previousPerformance(state: AppState, exerciseId: string) {
  for (let sessionIndex = state.workoutLogs.length - 1; sessionIndex >= 0; sessionIndex -= 1) {
    const exerciseLog = state.workoutLogs[sessionIndex].exercises.find((item) => item.exerciseId === exerciseId);
    if (!exerciseLog) continue;
    for (let setIndex = exerciseLog.sets.length - 1; setIndex >= 0; setIndex -= 1) {
      const set = exerciseLog.sets[setIndex];
      if (!set.complete || (set.reps === null && set.weight === null)) continue;
      const load = displayLoad(set.weight, state.unitSystem);
      const reps = set.reps === null ? "—" : String(set.reps);
      return `${load} × ${reps}`;
    }
  }
  return "No previous log";
}

export function buildWorkout(state: AppState): WorkoutPlan {
  const minutes = state.todayOverride.minutes ?? state.sessionMinutes;
  const equipment = state.todayOverride.equipment ?? state.equipment;
  const olderBeginner = state.age >= 60 && state.experience === "new";
  const nervousBeginner = state.confidence === "nervous" || state.liftingHistory === "none";
  const consistentlyTrained = state.liftingHistory === "consistent" || state.experience === "experienced";
  const returning = state.liftingHistory === "returning";
  const hasBaseline = Object.entries(state.liftingBaseline).some(([key, value]) => key !== "note" && value !== null);
  const maxExercises = minutes <= 20 ? 3 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;
  const desiredPatterns: Exercise["pattern"][] = ["squat", "push", "pull", "hinge", "core", olderBeginner ? "balance" : "single-leg"];
  const chosen: Exercise[] = [];

  for (const pattern of desiredPatterns) {
    const candidates = EXERCISES.filter((exercise) =>
      exercise.pattern === pattern &&
      equipmentMatches(exercise, equipment) &&
      !exerciseBlocked(exercise, state) &&
      (!nervousBeginner || exercise.beginnerFriendly) &&
      (!olderBeginner || exercise.stable),
    );
    const preferred = candidates.find((exercise) => includesLoose(state.preferredExercises, exercise.name));
    const exercise = preferred ?? candidates[0];
    if (exercise && !chosen.some((item) => item.id === exercise.id)) chosen.push(exercise);
    if (chosen.length >= maxExercises) break;
  }

  if (chosen.length < Math.min(3, maxExercises)) {
    for (const exercise of EXERCISES) {
      if (equipmentMatches(exercise, equipment) && !exerciseBlocked(exercise, state) && !chosen.some((item) => item.id === exercise.id)) {
        chosen.push(exercise);
      }
      if (chosen.length >= maxExercises) break;
    }
  }

  const baseSets = minutes <= 20 ? 2 : consistentlyTrained || returning ? 3 : 2;
  const repTarget = consistentlyTrained ? "6–10 reps" : returning ? "8–12 reps" : "8–12 reps";
  return {
    name: state.trainingDays <= 3 ? "Full Body A" : "Strength A",
    minutes,
    equipment,
    focus: state.focusAreas.length ? state.focusAreas.join(" + ") : "Full body",
    exercises: chosen.slice(0, maxExercises).map((exercise, index) => ({
      exercise,
      sets: index >= 4 ? 2 : baseSets + (consistentlyTrained && index < 2 && minutes >= 60 ? 1 : 0),
      reps: exercise.pattern === "core" || exercise.pattern === "balance" ? "8–12 controlled reps" : repTarget,
      previous: previousPerformance(state, exercise.id),
    })),
    note: olderBeginner
      ? "Stable movements, lower starting volume, and a little balance work. The goal is confidence and capability."
      : state.liftingHistory === "none"
        ? "You marked yourself as new to lifting, so the first week starts conservatively and leaves 2–3 good reps in reserve."
        : returning
          ? `You have lifted before${hasBaseline ? " and gave us a rough strength baseline" : ""}, so the plan starts with moderate volume while you rebuild consistency.`
          : consistentlyTrained
            ? `You already train consistently${hasBaseline ? " and gave us a rough working-set baseline" : ""}, so the plan starts with enough volume to feel like real training without guessing your loads.`
            : "Keep the main movements repeatable so progression is easy to see.",
  };
}

export function alternativeExercises(exerciseId: string, state: AppState) {
  const current = EXERCISES.find((item) => item.id === exerciseId);
  if (!current) return [];
  const equipment = state.todayOverride.equipment ?? state.equipment;
  const direct = current.alternativeIds
    .map((id) => EXERCISES.find((item) => item.id === id))
    .filter((item): item is Exercise => Boolean(item));
  const others = EXERCISES.filter((item) => item.pattern === current.pattern && item.id !== current.id);
  return [...direct, ...others]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => equipmentMatches(item, equipment) && !exerciseBlocked(item, state))
    .slice(0, 4);
}

export interface TrendReview {
  ready: boolean;
  readings: number;
  trendStart: number | null;
  trendNow: number | null;
  change: number | null;
  message: string;
  suggestedCalorieChange: number;
}

export function reviewProgress(state: AppState): TrendReview {
  const trend = smoothedWeightTrend(state.weightLog, 7);
  const readings = trend.length;
  if (!readings) {
    return { ready: false, readings: 0, trendStart: null, trendNow: null, change: null, message: "Log a few normal weigh-ins when convenient. One reading never changes the plan.", suggestedCalorieChange: 0 };
  }
  const start = trend[0].trend;
  const now = trend[trend.length - 1].trend;
  const change = Number((now - start).toFixed(1));
  if (readings < 10) {
    return { ready: false, readings, trendStart: start, trendNow: now, change, message: `You have ${readings} readings. We normally wait for around 10–14 before making a calorie change from weight alone.`, suggestedCalorieChange: 0 };
  }

  let suggestedCalorieChange = 0;
  let message = "Your trend is close enough to plan. Keep going and collect another week of normal data.";
  if (state.goal === "lose" && change > -0.2) {
    suggestedCalorieChange = -100;
    message = "The smoothed trend is flatter than expected. A small 100-calorie reduction is reasonable if adherence has been consistent.";
  } else if (state.goal === "lose" && change < -1.5) {
    suggestedCalorieChange = 100;
    message = "The trend is moving quickly. A small 100-calorie increase may make the plan easier to sustain.";
  } else if (state.goal === "gain" && change < 0.1) {
    suggestedCalorieChange = 100;
    message = "The trend is not moving up yet. A small 100-calorie increase is a reasonable next test.";
  } else if (state.goal === "gain" && change > 1.2) {
    suggestedCalorieChange = -100;
    message = "The trend is rising faster than a cautious gain phase needs. A small 100-calorie reduction is reasonable.";
  }
  return { ready: true, readings, trendStart: start, trendNow: now, change, message, suggestedCalorieChange };
}

export function currentTargets(state: AppState) {
  const base = calculateTargets({
    goal: state.goal,
    age: state.age,
    sexEquation: state.sexEquation,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    activity: state.activity,
    healthFlag: state.healthFlags.length > 0,
  });
  return {
    ...base,
    calories: state.calorieOverride ?? base.calories,
    proteinGrams: state.proteinOverride ?? base.proteinGrams,
  };
}
