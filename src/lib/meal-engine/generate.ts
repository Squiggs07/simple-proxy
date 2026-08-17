/**
 * Orchestration for the propose → verify → scale loop.
 *
 * A meal is only ever persisted after every ingredient resolved against the
 * real food database and the macros were computed from those records. The
 * LLM (when configured) is the creative layer; templates are the fallback
 * that always works.
 */

import type { Food } from "@prisma/client";

import { prisma } from "@/lib/db";
import { computeMealMacros, findFood } from "@/lib/food";
import { parseExclusions } from "@/lib/exclusions";
import { splitDayBudget } from "./budget";
import { bannedRulesFor, isBanned } from "./exclusion-rules";
import { proposeMealWithLlm } from "./llm-proposer";
import { scaleMealToBudget } from "./scale";
import { pickTemplate, MEAL_TEMPLATES } from "./templates";
import type {
  MealRequest,
  ProposedMeal,
  VerifiedIngredient,
  VerifiedMeal,
} from "./types";

interface ResolvedItem {
  food: Food;
  grams: number;
}

/**
 * Verify a proposal against the food database and the user's exclusions,
 * then scale it onto the calorie budget. Returns null when the proposal
 * can't be trusted (unresolvable or excluded ingredients).
 */
export async function verifyProposal(
  proposed: ProposedMeal,
  request: MealRequest,
  source: VerifiedMeal["source"],
): Promise<VerifiedMeal | null> {
  // Safety: never trust the proposer to have honored exclusions.
  const rules = bannedRulesFor(request.exclusions);
  if (proposed.ingredients.some((i) => isBanned(i.name, rules))) return null;

  const resolved: ResolvedItem[] = [];
  let dropped = 0;
  for (const ingredient of proposed.ingredients) {
    const food = await findFood(ingredient.name);
    if (food && !isBanned(food.name, rules)) {
      resolved.push({ food, grams: ingredient.grams });
    } else {
      dropped++;
    }
  }

  // Tolerate one unknown garnish-level ingredient; more means the meal's
  // numbers wouldn't reflect the plate.
  if (resolved.length < 2 || dropped > 1) return null;

  const scaled = scaleMealToBudget(resolved, request.budgetKcal);
  const macros = computeMealMacros(scaled);
  if (macros.kcal <= 0) return null;

  return {
    title: proposed.title,
    description: proposed.description,
    whyThisFits: proposed.whyThisFits,
    steps: proposed.steps,
    ingredients: scaled.map((item) => ({
      foodId: item.food.id,
      name: item.food.name,
      grams: item.grams,
      kcalPer100g: item.food.kcalPer100g,
      proteinPer100g: item.food.proteinPer100g,
      carbsPer100g: item.food.carbsPer100g,
      fatPer100g: item.food.fatPer100g,
    })),
    macros,
    source,
  };
}

/** Generate one verified meal: LLM first (if configured), templates after. */
export async function generateMeal(
  request: MealRequest,
  variant = 0,
): Promise<VerifiedMeal | null> {
  const llmProposal = await proposeMealWithLlm(request);
  if (llmProposal) {
    const verified = await verifyProposal(llmProposal, request, "llm");
    if (verified) return verified;
  }

  const templateCount = MEAL_TEMPLATES[request.slot].length;
  for (let i = 0; i < templateCount; i++) {
    const template = pickTemplate(request, variant + i);
    if (!template) break;
    const verified = await verifyProposal(template, request, "template");
    if (verified) return verified;
  }
  return null;
}

export class NoTargetError extends Error {}

/**
 * Get the user's plan for a date, generating it on first request.
 */
export async function getOrCreateDayPlan(userId: string, date: string) {
  const existing = await prisma.mealPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
  if (existing && existing.meals.length > 0) return existing;

  const [profile, target] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.macroTarget.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
  ]);
  if (!profile || !target) throw new NoTargetError();

  const exclusions = parseExclusions(profile.exclusions);
  const budgets = splitDayBudget(target.calories, target.proteinG);
  // Deterministic day-to-day variety for the template path.
  const variant = dayNumber(date);

  const usedTitles: string[] = [];
  const meals: Array<{ verified: VerifiedMeal; budgetKcal: number; slot: string }> = [];
  for (const budget of budgets) {
    const request: MealRequest = {
      slot: budget.slot,
      budgetKcal: budget.kcal,
      budgetProteinG: budget.proteinG,
      priority: profile.mealPriority,
      exclusions,
      avoidTitles: [...usedTitles],
    };
    const verified = await generateMeal(request, variant);
    if (verified) {
      usedTitles.push(verified.title);
      meals.push({ verified, budgetKcal: budget.kcal, slot: budget.slot });
    }
  }
  if (meals.length === 0) {
    throw new Error("Could not generate any meals for this profile.");
  }

  const plan = existing ?? (await prisma.mealPlan.create({ data: { userId, date } }));
  await prisma.meal.createMany({
    data: meals.map(({ verified, budgetKcal, slot }) => ({
      planId: plan.id,
      slot,
      title: verified.title,
      description: verified.description,
      whyThisFits: verified.whyThisFits,
      steps: JSON.stringify(verified.steps),
      ingredients: JSON.stringify(verified.ingredients),
      kcal: verified.macros.kcal,
      proteinG: verified.macros.proteinG,
      carbsG: verified.macros.carbsG,
      fatG: verified.macros.fatG,
      budgetKcal,
      source: verified.source,
      priority: profile.mealPriority,
    })),
  });

  return prisma.mealPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
}

/** Replace one meal with a fresh proposal for the same slot and budget. */
export async function swapMeal(userId: string, mealId: string) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, plan: { userId } },
    include: { plan: { include: { meals: true } } },
  });
  if (!meal) return null;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;

  const request: MealRequest = {
    slot: meal.slot as MealRequest["slot"],
    budgetKcal: meal.budgetKcal,
    budgetProteinG: Math.round(meal.proteinG),
    priority: profile.mealPriority,
    exclusions: parseExclusions(profile.exclusions),
    avoidTitles: meal.plan.meals.map((m) => m.title),
  };
  // Nudge the variant so repeated swaps rotate through options.
  const verified = await generateMeal(request, dayNumber(meal.plan.date) + 1);
  if (!verified) return null;

  return prisma.meal.update({
    where: { id: meal.id },
    data: {
      title: verified.title,
      description: verified.description,
      whyThisFits: verified.whyThisFits,
      steps: JSON.stringify(verified.steps),
      ingredients: JSON.stringify(verified.ingredients),
      kcal: verified.macros.kcal,
      proteinG: verified.macros.proteinG,
      carbsG: verified.macros.carbsG,
      fatG: verified.macros.fatG,
      portionFactor: 1,
      source: verified.source,
    },
  });
}

/** "Too much / too little food": step portions by 20% within sane bounds. */
export async function adjustPortion(
  userId: string,
  mealId: string,
  direction: "more" | "less",
) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, plan: { userId } },
  });
  if (!meal) return null;

  const STEP = 1.2;
  const requested = direction === "more" ? meal.portionFactor * STEP : meal.portionFactor / STEP;
  const newFactor = Math.min(1.6, Math.max(0.6, requested));
  const ratio = newFactor / meal.portionFactor;
  if (Math.abs(ratio - 1) < 0.01) return meal; // already at the bound

  const ingredients = JSON.parse(meal.ingredients) as VerifiedIngredient[];
  const scaled = ingredients.map((i) => ({
    ...i,
    grams: Math.max(1, Math.round(i.grams * ratio)),
  }));
  const macros = computeMealMacros(
    scaled.map((i) => ({ food: i, grams: i.grams })),
  );

  return prisma.meal.update({
    where: { id: meal.id },
    data: {
      ingredients: JSON.stringify(scaled),
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      portionFactor: newFactor,
    },
  });
}

function dayNumber(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 86_400_000) : 0;
}
