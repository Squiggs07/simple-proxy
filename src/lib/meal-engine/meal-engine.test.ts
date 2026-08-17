import { describe, expect, it } from "vitest";

import { SEED_FOODS } from "@/lib/seed-foods";
import { computeMealMacros } from "@/lib/food";
import { splitDayBudget, SLOT_FRACTIONS } from "./budget";
import { bannedRulesFor, isBanned } from "./exclusion-rules";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { MIN_SCALE, MAX_SCALE, roundGrams, scaleMealToBudget } from "./scale";
import { MEAL_TEMPLATES, pickTemplate, templateProteinDensity } from "./templates";
import type { MealRequest, MealSlot } from "./types";

const seedByName = new Map(SEED_FOODS.map((f) => [f.name, f]));

const baseRequest = (overrides: Partial<MealRequest> = {}): MealRequest => ({
  slot: "lunch",
  budgetKcal: 700,
  budgetProteinG: 45,
  priority: "balanced",
  exclusions: [],
  avoidTitles: [],
  ...overrides,
});

describe("splitDayBudget", () => {
  it("slot budgets sum exactly to the day totals", () => {
    for (const [kcal, protein] of [
      [2139, 170],
      [1500, 96],
      [2801, 133],
    ]) {
      const budgets = splitDayBudget(kcal, protein);
      expect(budgets.reduce((s, b) => s + b.kcal, 0)).toBe(kcal);
      expect(budgets.reduce((s, b) => s + b.proteinG, 0)).toBe(protein);
    }
  });

  it("fractions sum to 1", () => {
    const total = Object.values(SLOT_FRACTIONS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });
});

describe("scaleMealToBudget", () => {
  const chicken = seedByName.get("chicken breast, cooked")!;
  const rice = seedByName.get("white rice, cooked")!;

  it("scales a meal onto its calorie budget within tolerance", () => {
    const items = [
      { food: chicken, grams: 150 },
      { food: rice, grams: 200 },
    ]; // ~508 kcal
    const scaled = scaleMealToBudget(items, 650);
    const kcal = computeMealMacros(scaled).kcal;
    expect(Math.abs(kcal - 650) / 650).toBeLessThan(0.05);
  });

  it("clamps extreme scale factors", () => {
    const items = [{ food: rice, grams: 100 }]; // 130 kcal
    const scaledUp = scaleMealToBudget(items, 10_000);
    expect(scaledUp[0].grams).toBeLessThanOrEqual(100 * MAX_SCALE);
    const scaledDown = scaleMealToBudget(items, 1);
    expect(scaledDown[0].grams).toBeGreaterThanOrEqual(Math.floor(100 * MIN_SCALE / 5) * 5);
  });

  it("rounds grams to friendly amounts", () => {
    expect(roundGrams(173)).toBe(175);
    expect(roundGrams(12.4)).toBe(12);
    expect(roundGrams(0)).toBe(0);
  });
});

describe("meal templates", () => {
  it("every template ingredient resolves against the seed food table", () => {
    for (const slot of Object.keys(MEAL_TEMPLATES) as MealSlot[]) {
      for (const template of MEAL_TEMPLATES[slot]) {
        for (const ingredient of template.ingredients) {
          expect(
            seedByName.has(ingredient.name),
            `${slot} / ${template.title}: unknown ingredient "${ingredient.name}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("every slot has a vegan-compatible template", () => {
    for (const slot of Object.keys(MEAL_TEMPLATES) as MealSlot[]) {
      const picked = pickTemplate(baseRequest({ slot, exclusions: ["Vegan"] }));
      expect(picked, `no vegan option for ${slot}`).not.toBeNull();
    }
  });

  it("respects exclusions", () => {
    const rules = bannedRulesFor(["Vegetarian", "No dairy", "No nuts"]);
    for (let variant = 0; variant < 10; variant++) {
      const picked = pickTemplate(
        baseRequest({ exclusions: ["Vegetarian", "No dairy", "No nuts"] }),
        variant,
      );
      expect(picked).not.toBeNull();
      for (const ingredient of picked!.ingredients) {
        expect(isBanned(ingredient.name, rules), ingredient.name).toBe(false);
      }
    }
  });

  it("respects free-text exclusions", () => {
    const picked = pickTemplate(baseRequest({ exclusions: ["tomato"] }));
    expect(picked).not.toBeNull();
    expect(picked!.ingredients.some((i) => i.name.includes("tomato"))).toBe(false);
  });

  it("avoids repeating titles when alternatives exist", () => {
    const first = pickTemplate(baseRequest());
    const second = pickTemplate(baseRequest({ avoidTitles: [first!.title] }));
    expect(second!.title).not.toBe(first!.title);
  });

  it("prefers protein-dense meals when the budget demands them", () => {
    // Vegetarian user with a high protein target relative to calories:
    // the picker should reach for the highest-protein-density snack.
    const request = baseRequest({
      slot: "snack",
      budgetKcal: 220,
      budgetProteinG: 20, // very protein-dense ask
      priority: "precision",
      exclusions: ["Vegetarian"],
    });
    const picked = pickTemplate(request)!;
    const density = templateProteinDensity(
      MEAL_TEMPLATES.snack.find((t) => t.title === picked.title)!,
    );
    // All allowed snacks sorted — the picked one must be at least as dense
    // as the median option.
    const densities = MEAL_TEMPLATES.snack
      .map(templateProteinDensity)
      .sort((a, b) => b - a);
    expect(density).toBeGreaterThanOrEqual(densities[Math.floor(densities.length / 2)]);
  });
});

describe("exclusion rules", () => {
  it("does not treat peanut butter as dairy", () => {
    const rules = bannedRulesFor(["No dairy"]);
    expect(isBanned("peanut butter", rules)).toBe(false);
    expect(isBanned("butter", rules)).toBe(true);
    expect(isBanned("cheddar cheese", rules)).toBe(true);
  });

  it("vegan bans eggs, dairy, meat, and honey", () => {
    const rules = bannedRulesFor(["Vegan"]);
    for (const name of ["egg, whole", "honey", "milk, 2%", "salmon, cooked", "whey protein powder"]) {
      expect(isBanned(name, rules), name).toBe(true);
    }
    expect(isBanned("tofu, firm", rules)).toBe(false);
  });
});

describe("prompt building", () => {
  it("bakes the safety rules into the system prompt", () => {
    const system = buildSystemPrompt();
    expect(system).toContain("detox");
    expect(system).toContain("disordered-eating");
    expect(system).toContain("Never suggest skipping meals");
  });

  it("includes budget, priority, and exclusions in the user prompt", () => {
    const prompt = buildUserPrompt(
      baseRequest({ exclusions: ["Vegan", "cilantro"], priority: "simple" }),
    );
    expect(prompt).toContain("700 kcal");
    expect(prompt).toContain("45g protein");
    expect(prompt).toContain("Vegan, cilantro");
    expect(prompt).toContain("batch-friendly");
  });
});
