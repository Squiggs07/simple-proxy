import type { CoachFoodLogAction } from "@/lib/startHereFoodLog";
import type { Meal } from "@/lib/startHereCatalog";
import type { AppState, CustomMealMemory, CustomMealType, PreferenceEvidence } from "@/lib/startHereModels";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function customMealId(description: string, type: CustomMealType) {
  return `custom-meal-${stableHash(`${type}:${normalize(description)}`)}`;
}

export function customMealToMeal(memory: CustomMealMemory): Meal {
  const searchTags = normalize(`${memory.name} ${memory.description}`).split(" ").filter(Boolean);
  return {
    id: memory.id,
    name: memory.name,
    type: memory.type,
    cuisine: "Personal",
    format: "Your meals",
    prepMinutes: 5,
    cost: "medium",
    ingredients: [{
      name: memory.description,
      amount: "Your usual amount",
      calories: memory.calories,
      protein: memory.protein,
      tags: searchTags,
    }],
    preferenceTags: [memory.name, memory.description, "Your meals"],
    searchTags,
    why: memory.remember
      ? `One of your meals. You have chosen it ${memory.timesChosen === 1 ? "once" : `${memory.timesChosen} times`}, so Start Here can work around what you actually eat.`
      : "Your custom replacement for today.",
  };
}

export function reusableCustomMeals(state: AppState) {
  const currentDay = state.currentDay;
  return state.customMeals
    .filter((item) => item.remember && Boolean(currentDay) && item.firstChosenOn < currentDay)
    .map(customMealToMeal);
}

export function customMealById(state: AppState, id: string) {
  const memory = state.customMeals.find((item) => item.id === id);
  return memory ? customMealToMeal(memory) : null;
}

export function rememberCustomMeal(
  state: AppState,
  estimate: CoachFoodLogAction,
  description: string,
  type: CustomMealType,
  remember: boolean,
  observedAt: string,
  observedOn = observedAt.slice(0, 10),
) {
  const id = customMealId(description, type);
  const existing = state.customMeals.find((item) => item.id === id);
  const next: CustomMealMemory = {
    id,
    name: estimate.name,
    description: description.trim(),
    type,
    calories: Math.max(0, Math.round(estimate.calories)),
    protein: Math.max(0, Math.round(estimate.protein)),
    source: estimate.source,
    sourceLabel: estimate.sourceLabel,
    calorieRange: estimate.calorieRange,
    proteinRange: estimate.proteinRange,
    remember: remember || existing?.remember === true,
    firstChosenOn: existing?.firstChosenOn ?? observedOn,
    lastChosenOn: observedOn,
    firstChosenAt: existing?.firstChosenAt ?? observedAt,
    lastChosenAt: observedAt,
    timesChosen: (existing?.timesChosen ?? 0) + 1,
  };
  const customMeals = [...state.customMeals.filter((item) => item.id !== id), next];
  return { customMeals, meal: customMealToMeal(next) };
}

export function mealChoiceEvidence(
  sourceMealId: string,
  chosenMeal: Meal,
  context: string,
  observedAt: string,
): PreferenceEvidence {
  return {
    id: `preference-meal-${stableHash(`${sourceMealId}:${chosenMeal.id}:${observedAt}`)}`,
    domain: "meal",
    kind: "chosen",
    subjectId: chosenMeal.id,
    label: chosenMeal.name,
    context,
    source: "explicit",
    confidence: "high",
    observedAt,
  };
}
