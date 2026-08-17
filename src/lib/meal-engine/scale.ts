import { computeMealMacros, type MacroSource } from "@/lib/food";

export interface ScalableItem {
  food: MacroSource;
  grams: number;
}

/**
 * Portions never scale beyond these bounds in one adjustment — a meal scaled
 * to a third of its size stops being the meal that was proposed.
 */
export const MIN_SCALE = 0.55;
export const MAX_SCALE = 1.8;

/**
 * Uniformly scale ingredient quantities so the meal's real calories land on
 * the target, within clamp bounds. Grams are rounded to whole numbers
 * (nearest 5g above 20g — nobody weighs 173g of rice).
 */
export function scaleMealToBudget<T extends ScalableItem>(
  items: T[],
  targetKcal: number,
): T[] {
  const current = computeMealMacros(items).kcal;
  if (current <= 0 || targetKcal <= 0) return items;

  const factor = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetKcal / current));
  return items.map((item) => ({ ...item, grams: roundGrams(item.grams * factor) }));
}

export function roundGrams(grams: number): number {
  if (grams <= 0) return 0;
  if (grams < 20) return Math.max(1, Math.round(grams));
  return Math.round(grams / 5) * 5;
}
