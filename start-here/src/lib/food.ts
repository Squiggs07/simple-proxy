/**
 * Food lookup and meal-macro computation — the tested core of Phase 2.
 *
 * Resolution order for an ingredient name:
 *   1. local `foods` table (seed data + previously cached USDA results)
 *   2. USDA FoodData Central search (when reachable), cached on success
 *
 * The macros themselves always come from these records — never from an LLM.
 */

import type { Food } from "@prisma/client";

import { prisma } from "@/lib/db";
import { searchFdcFoods } from "@/lib/fdc";

export interface MacroSource {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface MealItem {
  food: MacroSource;
  grams: number;
}

export interface MealMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Sum real macros for a list of (food, grams) items. Pure function — this is
 * the number the app trusts, regardless of what any model proposed.
 */
export function computeMealMacros(items: MealItem[]): MealMacros {
  let kcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  for (const { food, grams } of items) {
    if (!Number.isFinite(grams) || grams < 0) {
      throw new Error(`Invalid quantity: ${grams}`);
    }
    const factor = grams / 100;
    kcal += food.kcalPer100g * factor;
    proteinG += food.proteinPer100g * factor;
    carbsG += food.carbsPer100g * factor;
    fatG += food.fatPer100g * factor;
  }
  return {
    kcal: Math.round(kcal),
    proteinG: round1(proteinG),
    carbsG: round1(carbsG),
    fatG: round1(fatG),
  };
}

/**
 * Rank candidate foods for a query: exact match first, then prefix, then
 * substring; shorter names win ties (more generic record).
 */
export function rankFoodMatches<T extends { name: string }>(
  query: string,
  candidates: T[],
): T[] {
  const q = query.trim().toLowerCase();
  const score = (name: string): number => {
    const n = name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.includes(q)) return 2;
    return 3;
  };
  return [...candidates].sort(
    (a, b) => score(a.name) - score(b.name) || a.name.length - b.name.length,
  );
}

/**
 * Find a food by (approximate) name. Checks the local table first, then FDC;
 * FDC hits are cached so subsequent lookups are local and offline-friendly.
 */
export async function findFood(name: string): Promise<Food | null> {
  const query = name.trim().toLowerCase();
  if (!query) return null;

  const local = await prisma.food.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    take: 25,
  });
  if (local.length > 0) return rankFoodMatches(query, local)[0];

  const remote = await searchFdcFoods(query, { pageSize: 10 });
  const best = rankFoodMatches(query, remote)[0];
  if (!best) return null;

  return prisma.food.upsert({
    where: { fdcId: best.fdcId },
    update: {},
    create: {
      fdcId: best.fdcId,
      name: best.name,
      kcalPer100g: best.kcalPer100g,
      proteinPer100g: best.proteinPer100g,
      carbsPer100g: best.carbsPer100g,
      fatPer100g: best.fatPer100g,
      source: "usda",
    },
  });
}
