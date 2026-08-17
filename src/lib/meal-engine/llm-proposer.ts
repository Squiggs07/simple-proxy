/**
 * The LLM proposal layer. Server-side only — the API key never reaches the
 * client. Uses structured outputs so the model can only return valid JSON
 * matching the ProposedMeal schema; macros are still computed by the app
 * from the food database, never taken from the model.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { MealRequest, ProposedMeal } from "./types";

const proposedMealSchema = z.object({
  title: z.string(),
  description: z.string(),
  whyThisFits: z.string(),
  steps: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
    }),
  ),
});

export function llmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Ask the model for a meal proposal. Returns null on any failure (no key,
 * network, refusal, invalid output) so callers fall through to templates.
 */
export async function proposeMealWithLlm(
  request: MealRequest,
): Promise<ProposedMeal | null> {
  if (!llmAvailable()) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: process.env.MEAL_MODEL ?? "claude-opus-4-8",
      max_tokens: 2048,
      system: buildSystemPrompt(),
      output_config: { format: zodOutputFormat(proposedMealSchema) },
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return null;
    }

    const meal = response.parsed_output;
    if (meal.ingredients.length === 0) return null;
    if (meal.ingredients.some((i) => !Number.isFinite(i.grams) || i.grams <= 0)) {
      return null;
    }
    return {
      ...meal,
      steps: meal.steps.slice(0, 6),
      ingredients: meal.ingredients.slice(0, 12),
    };
  } catch {
    return null;
  }
}
