import type { MealSlot } from "./types";

export interface SlotBudget {
  slot: MealSlot;
  kcal: number;
  proteinG: number;
}

/** Fraction of the day's calories assigned to each meal slot. */
export const SLOT_FRACTIONS: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

/**
 * Split the day's targets across meal slots. The last slot absorbs rounding
 * so the slot budgets always sum exactly to the day's totals.
 */
export function splitDayBudget(dayKcal: number, dayProteinG: number): SlotBudget[] {
  const slots = Object.keys(SLOT_FRACTIONS) as MealSlot[];
  const budgets: SlotBudget[] = [];
  let kcalLeft = dayKcal;
  let proteinLeft = dayProteinG;

  slots.forEach((slot, i) => {
    const isLast = i === slots.length - 1;
    const kcal = isLast ? kcalLeft : Math.round(dayKcal * SLOT_FRACTIONS[slot]);
    const proteinG = isLast
      ? proteinLeft
      : Math.round(dayProteinG * SLOT_FRACTIONS[slot]);
    kcalLeft -= kcal;
    proteinLeft -= proteinG;
    budgets.push({ slot, kcal, proteinG });
  });

  return budgets;
}
