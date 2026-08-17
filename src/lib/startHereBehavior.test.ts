import { describe, expect, it } from "vitest";
import { EXERCISES } from "@/lib/startHereCatalog";
import { ALL_MEALS } from "@/lib/startHereMealLibrary";
import { exerciseBehaviorScore, learnedBehaviorSignals, mealBehaviorScore } from "@/lib/startHereBehavior";
import { INITIAL_STATE, type AppState } from "@/lib/startHereModels";

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...INITIAL_STATE,
    currentDay: "2026-08-17",
    ...overrides,
  };
}

describe("behavioral preference learning", () => {
  it("boosts meals the user repeatedly chooses in swaps", () => {
    const meal = ALL_MEALS.find((item) => item.id === "chicken-marinara-pasta")!;
    const current = state({
      mealSwapLogs: [
        { date: "2026-08-10", sourceMealId: "turkey-pesto-pasta", chosenMealId: meal.id },
        { date: "2026-08-15", sourceMealId: "salmon-potato-plate", chosenMealId: meal.id },
      ],
    });
    const result = mealBehaviorScore(current, meal);
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.reasons.join(" ")).toContain("repeatedly");
  });

  it("penalizes exercises the user repeatedly swaps away from", () => {
    const exercise = EXERCISES.find((item) => item.id === "reverse-lunge")!;
    const current = state({
      exerciseSwapLogs: [
        { date: "2026-08-09", sourceExerciseId: exercise.id, chosenExerciseId: "step-up" },
        { date: "2026-08-13", sourceExerciseId: exercise.id, chosenExerciseId: "step-up" },
      ],
    });
    expect(exerciseBehaviorScore(current, exercise).score).toBeLessThan(0);
    expect(exerciseBehaviorScore(current, exercise).reasons.join(" ")).toContain("repeatedly");
  });

  it("turns repeated choices into compact Coach memory signals", () => {
    const current = state({
      mealSwapLogs: [
        { date: "2026-08-10", sourceMealId: "turkey-pesto-pasta", chosenMealId: "chicken-marinara-pasta" },
        { date: "2026-08-15", sourceMealId: "turkey-pesto-pasta", chosenMealId: "chicken-marinara-pasta" },
      ],
      exerciseSwapLogs: [
        { date: "2026-08-10", sourceExerciseId: "reverse-lunge", chosenExerciseId: "step-up" },
        { date: "2026-08-15", sourceExerciseId: "reverse-lunge", chosenExerciseId: "step-up" },
      ],
    });
    const signals = learnedBehaviorSignals(current).join(" ");
    expect(signals).toContain("Chicken marinara pasta");
    expect(signals).toContain("Supported step-up");
  });
});
