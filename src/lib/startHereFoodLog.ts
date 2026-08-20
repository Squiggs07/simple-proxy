import type { AppState, ExternalFoodLog } from "@/lib/startHereModels";

export interface VerifiedFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  aliases: string[];
  sourceLabel: string;
  sourceUrl: string;
  checkedOn: string;
}

export interface CoachFoodLogAction {
  name: string;
  calories: number;
  protein: number;
  source: ExternalFoodLog["source"];
  sourceLabel: string;
  catalogId: string | null;
  calorieRange: { min: number; max: number } | null;
  proteinRange: { min: number; max: number } | null;
}

export const VERIFIED_FOODS: VerifiedFoodItem[] = [
  {
    id: "chick-fil-a-large-waffle-fries",
    name: "Large Chick-fil-A Waffle Potato Fries",
    calories: 600,
    protein: 7,
    aliases: [
      "large chick fil a waffle potato fries",
      "large chick fil a waffle fries",
      "large chick fil a fries",
      "large chick fil a fry",
      "large waffle fries from chick fil a",
      "large waffle fry from chick fil a",
      "large fries from chick fil a",
      "large fry from chick fil a",
      "chick fil a large fries",
      "chick fil a large fry",
    ],
    sourceLabel: "Chick-fil-A nutrition guide",
    sourceUrl: "https://www.chick-fil-a.com/nutrition-allergens",
    checkedOn: "2026-08-20",
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/chick[\s-]*fil[\s-]*a/g, "chick fil a")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function verifiedFoodById(id: string) {
  return VERIFIED_FOODS.find((item) => item.id === id) ?? null;
}

export function verifiedFoodFromText(value: string) {
  const normalized = normalize(value);
  return VERIFIED_FOODS.find((item) => item.aliases.some((alias) => normalized.includes(normalize(alias)))) ?? null;
}

export function externalFoodTotals(state: AppState, date: string) {
  return state.externalFoodLogs
    .filter((item) => item.date === date)
    .reduce(
      (totals, item) => ({ calories: totals.calories + item.calories, protein: totals.protein + item.protein }),
      { calories: 0, protein: 0 },
    );
}

export function buildVerifiedFoodLog(state: AppState, item: VerifiedFoodItem, date: string): ExternalFoodLog {
  const occurrence = state.externalFoodLogs.filter((log) => log.date === date && log.catalogId === item.id).length + 1;
  return {
    id: `external-${date}-${item.id}-${occurrence}`,
    date,
    name: item.name,
    calories: item.calories,
    protein: item.protein,
    source: "verified",
    sourceLabel: item.sourceLabel,
    catalogId: item.id,
    calorieRange: null,
    proteinRange: null,
  };
}

export function buildCoachFoodLog(state: AppState, action: CoachFoodLogAction, date: string): ExternalFoodLog {
  const occurrence = state.externalFoodLogs.filter((log) => log.date === date).length + 1;
  return {
    id: `external-${date}-coach-${occurrence}`,
    date,
    ...action,
  };
}
