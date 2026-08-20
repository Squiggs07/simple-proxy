import { describe, expect, it } from "vitest";
import { learnedBehaviorSignals } from "@/lib/startHereBehavior";
import { rememberCustomMeal } from "@/lib/startHereCustomMeals";
import { INITIAL_STATE } from "@/lib/startHereModels";
import { buildDayMeals, buildEffectiveDayMeals, optimizeRemainingMealProtein, plannedMealCalorieBudget, rankMeals } from "@/lib/startHerePlan";

const oikosEstimate = {
  name: "3 Oikos Triple Zero yogurts",
  calories: 270,
  protein: 45,
  source: "estimated" as const,
  sourceLabel: "Coach estimate — adjust or remove anytime",
  catalogId: null,
  calorieRange: { min: 240, max: 330 },
  proteinRange: { min: 42, max: 48 },
};

describe("custom meal memory", () => {
  it("turns an open-ended meal description into a reusable plan meal", () => {
    const remembered = rememberCustomMeal(
      INITIAL_STATE,
      oikosEstimate,
      "3 Triple Zero Oikos yogurts",
      "Breakfast",
      true,
      "2026-08-20T12:00:00.000Z",
    );
    const state = { ...INITIAL_STATE, currentDay: "2026-08-21", customMeals: remembered.customMeals };
    const ranked = rankMeals(state);

    expect(ranked.find((item) => item.meal.id === remembered.meal.id)?.reasons.join(" ")).toContain("asked Start Here to remember");
    expect(buildDayMeals(state, 2200, 160).some((item) => item.meal.id === remembered.meal.id)).toBe(true);
  });

  it("applies a custom meal swap through the deterministic day plan", () => {
    const remembered = rememberCustomMeal(
      INITIAL_STATE,
      oikosEstimate,
      "3 Triple Zero Oikos yogurts",
      "Breakfast",
      true,
      "2026-08-20T12:00:00.000Z",
    );
    const breakfast = buildDayMeals(INITIAL_STATE, 2200, 160).find((item) => item.meal.type === "Breakfast")!;
    const state = {
      ...INITIAL_STATE,
      currentDay: "2026-08-20",
      customMeals: remembered.customMeals,
      swappedMealIds: { [breakfast.sourceMealId]: remembered.meal.id },
    };
    const effective = buildEffectiveDayMeals(state, 2200, 160).find((item) => item.sourceMealId === breakfast.sourceMealId);

    expect(effective?.meal.name).toBe("3 Oikos Triple Zero yogurts");
    expect(effective?.calories).toBe(270);
    expect(effective?.protein).toBe(45);
  });

  it("rebalances the other meals toward protein while preserving snack space", () => {
    const lowProteinEstimate = { ...oikosEstimate, name: "My custom breakfast", calories: 420, protein: 12 };
    const remembered = rememberCustomMeal(
      INITIAL_STATE,
      lowProteinEstimate,
      "my custom breakfast",
      "Breakfast",
      true,
      "2026-08-20T12:00:00.000Z",
    );
    const breakfast = buildDayMeals(INITIAL_STATE, 2200, 160).find((item) => item.meal.type === "Breakfast")!;
    const state = {
      ...INITIAL_STATE,
      currentDay: "2026-08-20",
      customMeals: remembered.customMeals,
      swappedMealIds: { [breakfast.sourceMealId]: remembered.meal.id },
    };
    const before = buildEffectiveDayMeals(state, 2200, 160);
    const optimized = optimizeRemainingMealProtein(state, 2200, 160);
    const after = buildEffectiveDayMeals({ ...state, mealPortionOverrides: optimized.portionOverrides }, 2200, 160);
    const beforeGap = Math.abs(160 - before.reduce((sum, item) => sum + item.protein, 0));
    const afterGap = Math.abs(160 - after.reduce((sum, item) => sum + item.protein, 0));

    expect(afterGap).toBeLessThanOrEqual(beforeGap);
    expect(after.reduce((sum, item) => sum + item.calories, 0)).toBeLessThanOrEqual(plannedMealCalorieBudget(state, 2200));
    expect(after.find((item) => item.meal.id === remembered.meal.id)?.protein).toBe(12);
  });

  it("updates durable memory when the same personal meal is chosen again", () => {
    const first = rememberCustomMeal(
      INITIAL_STATE,
      oikosEstimate,
      "3 Triple Zero Oikos yogurts",
      "Breakfast",
      true,
      "2026-08-19T12:00:00.000Z",
    );
    const second = rememberCustomMeal(
      { ...INITIAL_STATE, customMeals: first.customMeals },
      oikosEstimate,
      "3 Triple Zero Oikos yogurts",
      "Breakfast",
      true,
      "2026-08-20T12:00:00.000Z",
    );
    const state = { ...INITIAL_STATE, customMeals: second.customMeals };

    expect(second.customMeals).toHaveLength(1);
    expect(second.customMeals[0].timesChosen).toBe(2);
    expect(learnedBehaviorSignals(state).join(" ")).toContain("3 Oikos Triple Zero yogurts");
  });

  it("keeps a one-day custom meal out of future automatic ranking", () => {
    const oneOff = rememberCustomMeal(
      INITIAL_STATE,
      oikosEstimate,
      "3 Triple Zero Oikos yogurts",
      "Breakfast",
      false,
      "2026-08-20T12:00:00.000Z",
    );
    const state = { ...INITIAL_STATE, customMeals: oneOff.customMeals };

    expect(rankMeals(state).some((item) => item.meal.id === oneOff.meal.id)).toBe(false);
  });
});
