import { calculateTargets, smoothedWeightTrend } from "@/lib/startHereEngine";
import { progressionCue } from "@/lib/startHereAdaptation";
import { exerciseBehaviorScore, mealBehaviorScore } from "@/lib/startHereBehavior";
import type { TrainingSplit, WorkoutVariant } from "@/lib/startHereWeek";
import { mealMacros, type Exercise, type Meal } from "@/lib/startHereCatalog";
import { ALL_EXERCISES as EXERCISES } from "@/lib/startHereExerciseLibrary";
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
  sourceExerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  previous: string;
  progression: string | null;
}

export interface WorkoutPlan {
  name: string;
  minutes: number;
  equipment: Equipment;
  focus: string;
  exercises: WorkoutExercise[];
  note: string;
}

export interface WorkoutBuildOptions {
  split?: TrainingSplit;
  variant?: WorkoutVariant;
  name?: string;
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
      const learned = mealBehaviorScore(state, meal);
      score += learned.score;
      reasons.push(...learned.reasons);
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

export function exercisePreviousPerformance(state: AppState, exerciseId: string) {
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

function patternsForWorkout(split: TrainingSplit, olderBeginner: boolean): Exercise["pattern"][] {
  if (split === "upper") return ["push", "pull", "push", "pull", "core", "carry"];
  if (split === "lower") return ["squat", "hinge", olderBeginner ? "balance" : "single-leg", "squat", "hinge", "core"];
  return ["squat", "push", "pull", "hinge", olderBeginner ? "balance" : "single-leg", "core"];
}

function patternFitsSplit(pattern: Exercise["pattern"], split: TrainingSplit) {
  if (split === "upper") return ["push", "pull", "core", "carry", "balance"].includes(pattern);
  if (split === "lower") return ["squat", "hinge", "single-leg", "balance", "core", "carry"].includes(pattern);
  return true;
}

function exercisePlanScore(exercise: Exercise, state: AppState, variant: WorkoutVariant) {
  const explicit = includesLoose(state.preferredExercises, exercise.name) ? 20 : 0;
  const focus = exercise.focus.filter((item) => includesLoose(state.focusAreas, item)).length * 3;
  const learned = exerciseBehaviorScore(state, exercise).score;
  const catalogIndex = EXERCISES.findIndex((item) => item.id === exercise.id);
  const rotation = variant === "B" ? (catalogIndex % 2 === 1 ? 2 : 0) : (catalogIndex % 2 === 0 ? 2 : 0);
  return explicit + focus + learned + rotation;
}

export function buildWorkout(state: AppState, options: WorkoutBuildOptions = {}): WorkoutPlan {
  const minutes = state.todayOverride.minutes ?? state.sessionMinutes;
  const equipment = state.todayOverride.equipment ?? state.equipment;
  const split = options.split ?? "full-body";
  const variant = options.variant ?? "A";
  const olderBeginner = state.age >= 60 && state.experience === "new";
  const nervousBeginner = state.confidence === "nervous" || state.liftingHistory === "none";
  const consistentlyTrained = state.liftingHistory === "consistent" || state.experience === "experienced";
  const returning = state.liftingHistory === "returning";
  const hasBaseline = Object.entries(state.liftingBaseline).some(([key, value]) => key !== "note" && value !== null);
  const maxExercises = minutes <= 20 ? 3 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;
  const desiredPatterns = patternsForWorkout(split, olderBeginner);
  const chosen: Exercise[] = [];

  for (const pattern of desiredPatterns) {
    const candidates = EXERCISES.filter((exercise) =>
      exercise.pattern === pattern &&
      equipmentMatches(exercise, equipment) &&
      !exerciseBlocked(exercise, state) &&
      (!nervousBeginner || exercise.beginnerFriendly) &&
      (!olderBeginner || exercise.stable) &&
      !chosen.some((item) => item.id === exercise.id),
    ).sort((a, b) => exercisePlanScore(b, state, variant) - exercisePlanScore(a, state, variant));
    const exercise = candidates[0];
    if (exercise) chosen.push(exercise);
    if (chosen.length >= maxExercises) break;
  }

  if (chosen.length < maxExercises) {
    const fallbackCandidates = EXERCISES
      .filter((exercise) =>
        equipmentMatches(exercise, equipment) &&
        patternFitsSplit(exercise.pattern, split) &&
        !exerciseBlocked(exercise, state) &&
        (!nervousBeginner || exercise.beginnerFriendly) &&
        (!olderBeginner || exercise.stable) &&
        !chosen.some((item) => item.id === exercise.id),
      )
      .sort((a, b) => exercisePlanScore(b, state, variant) - exercisePlanScore(a, state, variant));
    for (const exercise of fallbackCandidates) {
      chosen.push(exercise);
      if (chosen.length >= maxExercises) break;
    }
  }

  const baseSets = minutes <= 20 ? 2 : consistentlyTrained || returning ? 3 : 2;
  const repTarget = consistentlyTrained ? "6–10 reps" : "8–12 reps";
  const defaultName = split === "full-body"
    ? `Full Body ${variant}`
    : `${split === "upper" ? "Upper Body" : "Lower Body"} ${variant}`;
  const name = options.name ?? defaultName;
  const splitFocus = split === "full-body" ? "Full body" : split === "upper" ? "Upper body" : "Lower body";
  const rotationNote = split === "full-body"
    ? `${name} alternates with the other full-body session so the week stays repeatable without being identical.`
    : `${name} is one part of your rotating upper/lower week.`;

  return {
    name,
    minutes,
    equipment,
    focus: state.focusAreas.length ? `${splitFocus} · ${state.focusAreas.join(" + ")}` : splitFocus,
    exercises: chosen.slice(0, maxExercises).map((exercise, index) => ({
      sourceExerciseId: exercise.id,
      exercise,
      sets: index >= 4 ? 2 : baseSets + (consistentlyTrained && index < 2 && minutes >= 60 ? 1 : 0),
      reps: exercise.pattern === "core" || exercise.pattern === "balance" ? "8–12 controlled reps" : repTarget,
      previous: exercisePreviousPerformance(state, exercise.id),
      progression: progressionCue(state, exercise.id),
    })),
    note: olderBeginner
      ? `${rotationNote} Stable movements, lower starting volume, and a little balance work keep the emphasis on confidence and capability.`
      : state.liftingHistory === "none"
        ? `${rotationNote} The first weeks stay conservative and leave 2–3 good reps in reserve.`
        : returning
          ? `${rotationNote} You have lifted before${hasBaseline ? " and gave us a rough strength baseline" : ""}, so volume starts moderate while consistency comes back.`
          : consistentlyTrained
            ? `${rotationNote} ${hasBaseline ? "Your strength baseline and logged performance drive the progression cues instead of guessing loads." : "Your logged performance drives the progression cues instead of guessing loads."}`
            : `${rotationNote} Keep the main movements repeatable so progression is easy to see.`,
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
  const directIds = new Set(direct.map((item) => item.id));
  return [...direct, ...others]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => equipmentMatches(item, equipment) && !exerciseBlocked(item, state))
    .sort((a, b) => {
      const learned = exerciseBehaviorScore(state, b).score - exerciseBehaviorScore(state, a).score;
      if (learned !== 0) return learned;
      return Number(directIds.has(b.id)) - Number(directIds.has(a.id));
    })
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
