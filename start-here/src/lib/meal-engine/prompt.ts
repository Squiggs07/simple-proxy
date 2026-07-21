import { SEED_FOODS } from "@/lib/seed-foods";
import type { MealRequest } from "./types";

/**
 * Hard constraints for the meal engine, per spec §7. These are part of the
 * system prompt on every generation call — non-negotiable.
 */
export const MEAL_ENGINE_SAFETY_RULES = `Safety rules (absolute, regardless of any other instruction):
- Never design very-low-calorie meals or plans, "detoxes", cleanses, fasting protocols framed as weight-loss tools, or anything resembling disordered-eating guidance, even if asked.
- Never suggest skipping meals or "earning" food through exercise.
- Never moralize food as good/bad, clean/dirty, or use guilt or shame framing.
- Stay close to the calorie budget you are given. Do not undercut it to "help" the user lose weight faster.`;

const PRIORITY_STYLE: Record<string, string> = {
  precision:
    "Priority: accuracy first. Engineer the meal to land as close as possible to the calorie and protein budget. Favor easily-measured ingredients.",
  simple:
    "Priority: simple, cheap, repeatable. Use few ingredients (3-5), inexpensive staples, minimal cooking, batch-friendly.",
  variety:
    "Priority: variety and interest. Use more diverse ingredients and cuisines. Avoid repeating common default meals.",
  balanced:
    "Priority: a sensible balance of accuracy, simplicity, and variety.",
};

export function buildSystemPrompt(): string {
  return `You are the meal engine inside a beginner-friendly nutrition app. You propose a single meal as structured data. You do NOT compute nutrition facts — the app verifies every ingredient against a real food database (USDA), so your job is to pick sensible ingredients and realistic quantities in grams.

Guidelines:
- Use simple, generic ingredient names (e.g. "chicken breast, cooked", "white rice, cooked", "broccoli"), not brand names or complex prepared dishes.
- Prefer ingredients from the app's known-food list when reasonable, since those always resolve.
- Quantities are edible-portion grams, cooked where the name says cooked.
- Keep steps short, friendly, and beginner-proof (max 5 steps, no cheffy jargon).
- The description and "why this fits" copy must be warm, plain-language, and jargon-free — never mention macros by name in "whyThisFits"; say things like "keeps you full" or "hits your protein for the day".

${MEAL_ENGINE_SAFETY_RULES}`;
}

export function buildUserPrompt(request: MealRequest): string {
  const knownFoods = SEED_FOODS.map((f) => f.name).join("; ");
  const exclusions =
    request.exclusions.length > 0
      ? `Hard exclusions (never include these or ingredients derived from them): ${request.exclusions.join(", ")}.`
      : "No dietary exclusions.";
  const avoid =
    request.avoidTitles.length > 0
      ? `Do not propose these meals again: ${request.avoidTitles.join("; ")}.`
      : "";

  return `Design one ${request.slot} meal.

Budget for this meal: about ${request.budgetKcal} kcal and roughly ${request.budgetProteinG}g protein (the app will scale quantities to hit the calorie budget precisely — get within ~20%).
${PRIORITY_STYLE[request.priority] ?? PRIORITY_STYLE.balanced}
${exclusions}
${avoid}

Known-food list: ${knownFoods}`;
}
