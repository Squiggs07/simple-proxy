import type { Meal } from "@prisma/client";

import type { VerifiedIngredient } from "./types";

/** Shape of a meal as sent to the client. */
export interface MealDto {
  id: string;
  slot: string;
  title: string;
  description: string;
  whyThisFits: string;
  steps: string[];
  ingredients: VerifiedIngredient[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  portionFactor: number;
  source: string;
}

export function serializeMeal(meal: Meal): MealDto {
  return {
    id: meal.id,
    slot: meal.slot,
    title: meal.title,
    description: meal.description,
    whyThisFits: meal.whyThisFits,
    steps: JSON.parse(meal.steps),
    ingredients: JSON.parse(meal.ingredients),
    kcal: meal.kcal,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
    portionFactor: meal.portionFactor,
    source: meal.source,
  };
}
