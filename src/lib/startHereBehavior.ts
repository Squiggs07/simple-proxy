import type { Exercise, Meal } from "@/lib/startHereCatalog";
import { ALL_EXERCISES as EXERCISES } from "@/lib/startHereExerciseLibrary";
import { ALL_MEALS } from "@/lib/startHereMealLibrary";
import type { AppState, ExerciseSwapLog, MealSwapLog } from "@/lib/startHereModels";

export interface BehaviorScore {
  score: number;
  reasons: string[];
}

function parseDate(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function daysBetween(later: string, earlier: string) {
  return Math.max(0, Math.round((parseDate(later) - parseDate(earlier)) / 86_400_000));
}

function referenceDay(state: AppState) {
  if (state.currentDay) return state.currentDay;
  const dates = [
    ...state.mealSwapLogs.map((item) => item.date),
    ...state.exerciseSwapLogs.map((item) => item.date),
  ].sort();
  return dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10);
}

function recentMealSwaps(state: AppState, days = 60) {
  const today = referenceDay(state);
  return state.mealSwapLogs.filter((item) => item.date <= today && daysBetween(today, item.date) <= days);
}

function recentExerciseSwaps(state: AppState, days = 90) {
  const today = referenceDay(state);
  return state.exerciseSwapLogs.filter((item) => item.date <= today && daysBetween(today, item.date) <= days);
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function mealBehaviorScore(state: AppState, meal: Meal): BehaviorScore {
  const logs = recentMealSwaps(state);
  if (!logs.length) return { score: 0, reasons: [] };

  const chosenDirect = logs.filter((item) => item.chosenMealId === meal.id).length;
  const swappedAway = logs.filter((item) => item.sourceMealId === meal.id).length;
  let related = 0;

  for (const log of logs) {
    const chosen = ALL_MEALS.find((item) => item.id === log.chosenMealId);
    if (!chosen || chosen.id === meal.id) continue;
    if (chosen.type === meal.type && chosen.cuisine === meal.cuisine) related += 0.45;
    if (chosen.type === meal.type && chosen.format === meal.format) related += 0.65;
  }

  const directBoost = Math.min(12, chosenDirect * 6);
  const awayPenalty = Math.min(9, swappedAway * 3);
  const relatedBoost = Math.min(4, related);
  const score = directBoost + relatedBoost - awayPenalty;
  const reasons: string[] = [];
  if (chosenDirect >= 2) reasons.push("you have chosen this repeatedly");
  else if (chosenDirect === 1) reasons.push("you chose this before");
  if (!chosenDirect && relatedBoost >= 2) reasons.push("it resembles meals you keep choosing");
  if (swappedAway >= 2) reasons.push("you often swap away from this meal");
  return { score, reasons };
}

export function exerciseBehaviorScore(state: AppState, exercise: Exercise): BehaviorScore {
  const logs = recentExerciseSwaps(state);
  if (!logs.length) return { score: 0, reasons: [] };
  const chosenDirect = logs.filter((item) => item.chosenExerciseId === exercise.id).length;
  const swappedAway = logs.filter((item) => item.sourceExerciseId === exercise.id).length;
  const score = Math.min(15, chosenDirect * 5) - Math.min(12, swappedAway * 4);
  const reasons: string[] = [];
  if (chosenDirect >= 2) reasons.push("you have picked this replacement more than once");
  else if (chosenDirect === 1) reasons.push("you picked this replacement before");
  if (swappedAway >= 2) reasons.push("you repeatedly swap away from this exercise");
  return { score, reasons };
}

function mealName(id: string) {
  return ALL_MEALS.find((item) => item.id === id)?.name ?? id;
}

function exerciseName(id: string) {
  return EXERCISES.find((item) => item.id === id)?.name ?? id;
}

function topPairs<T>(logs: T[], source: (item: T) => string, chosen: (item: T) => string) {
  const counts = countBy(logs, (item) => `${source(item)}|||${chosen(item)}`);
  return [...counts.entries()]
    .map(([pair, count]) => {
      const [from, to] = pair.split("|||");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count);
}

export function learnedBehaviorSignals(state: AppState): string[] {
  const signals: string[] = [];
  const mealLogs = recentMealSwaps(state);
  const exerciseLogs = recentExerciseSwaps(state);

  for (const pair of topPairs<MealSwapLog>(mealLogs, (item) => item.sourceMealId, (item) => item.chosenMealId).slice(0, 2)) {
    if (pair.count >= 2) signals.push(`Often swaps ${mealName(pair.from)} for ${mealName(pair.to)} (${pair.count} times).`);
  }

  const mealChoices = countBy(mealLogs, (item) => item.chosenMealId);
  for (const [id, count] of [...mealChoices.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)) {
    if (count >= 2 && !signals.some((signal) => signal.includes(mealName(id)))) {
      signals.push(`Has actively chosen ${mealName(id)} ${count} times.`);
    }
  }

  for (const pair of topPairs<ExerciseSwapLog>(exerciseLogs, (item) => item.sourceExerciseId, (item) => item.chosenExerciseId).slice(0, 2)) {
    if (pair.count >= 2) signals.push(`Often replaces ${exerciseName(pair.from)} with ${exerciseName(pair.to)} (${pair.count} times).`);
  }

  if (state.rejectedMealIds.length) {
    const names = state.rejectedMealIds.slice(-3).map(mealName).join(", ");
    signals.push(`Has marked these meals as not for them: ${names}.`);
  }

  return signals.slice(0, 6);
}
