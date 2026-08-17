import type { MealMacros } from "@/lib/food";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

/** What a proposer (LLM or template) suggests — unverified. */
export interface ProposedMeal {
  title: string;
  description: string;
  whyThisFits: string;
  steps: string[];
  ingredients: Array<{ name: string; grams: number }>;
}

/**
 * A resolved, verified ingredient. Per-100g macros are snapshotted from the
 * food record so per-ingredient detail survives portion changes without
 * another lookup.
 */
export interface VerifiedIngredient {
  foodId: string;
  name: string;
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

/** A meal whose numbers came from the food database, not the model. */
export interface VerifiedMeal {
  title: string;
  description: string;
  whyThisFits: string;
  steps: string[];
  ingredients: VerifiedIngredient[];
  macros: MealMacros;
  source: "llm" | "template";
}

export interface MealRequest {
  slot: MealSlot;
  budgetKcal: number;
  budgetProteinG: number;
  priority: string;
  exclusions: string[];
  /** Titles to avoid proposing again (used by swap). */
  avoidTitles: string[];
}
