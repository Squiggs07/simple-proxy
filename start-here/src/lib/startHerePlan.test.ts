import { describe, expect, it } from "vitest";
import { INITIAL_STATE } from "@/lib/startHereModels";
import { buildDayMeals, buildWorkout, rankMeals } from "@/lib/startHerePlan";

describe("Start Here planning", () => {
  it("mechanically removes allergy matches", () => {
    const state = { ...INITIAL_STATE, allergies: ["salmon"] };
    const meals = rankMeals(state).map((item) => item.meal.name.toLowerCase());
    expect(meals.some((name) => name.includes("salmon"))).toBe(false);
  });

  it("ranks positive food preferences higher", () => {
    const state = { ...INITIAL_STATE, likedFoods: ["Pasta"], cuisines: ["Italian"] };
    const meals = rankMeals(state);
    expect(meals[0]?.meal.name.toLowerCase()).toContain("pasta");
  });

  it("removes an exact meal after Not for me feedback without hard-excluding its ingredients", () => {
    const base = rankMeals(INITIAL_STATE);
    const rejectedId = base[0].meal.id;
    const state = { ...INITIAL_STATE, rejectedMealIds: [rejectedId] };
    expect(rankMeals(state).some((item) => item.meal.id === rejectedId)).toBe(false);
  });

  it("persists a manual meal portion override into deterministic meal totals", () => {
    const first = buildDayMeals(INITIAL_STATE, 2200, 160)[0];
    const largerState = {
      ...INITIAL_STATE,
      mealPortionOverrides: { [first.sourceMealId]: "larger" as const },
    };
    const larger = buildDayMeals(largerState, 2200, 160).find((item) => item.sourceMealId === first.sourceMealId);
    expect(larger?.portion).toBe("larger");
    expect(larger?.calories ?? 0).toBeGreaterThan(first.portion === "larger" ? 0 : first.calories);
  });

  it("can build a full vegan starter day instead of dead-ending", () => {
    const state = {
      ...INITIAL_STATE,
      dietType: "vegan" as const,
      likedFoods: ["Pasta", "Rice bowls", "Smoothies"],
      mealsPerDay: 4,
    };
    const meals = buildDayMeals(state, 2200, 140);
    expect(meals.length).toBe(4);
    expect(meals.some((item) => item.meal.type === "Breakfast")).toBe(true);
    expect(meals.some((item) => item.meal.type === "Lunch")).toBe(true);
    expect(meals.some((item) => item.meal.type === "Dinner")).toBe(true);
    expect(meals.some((item) => item.meal.type === "Snack")).toBe(true);
  });

  it("builds a shorter workout from a today-only time override", () => {
    const state = { ...INITIAL_STATE, todayOverride: { minutes: 20, equipment: null, note: "test" } };
    const workout = buildWorkout(state);
    expect(workout.minutes).toBe(20);
    expect(workout.exercises.length).toBeLessThanOrEqual(3);
  });

  it("uses stable beginner-friendly exercise choices for an older nervous beginner", () => {
    const state = { ...INITIAL_STATE, age: 68, experience: "new" as const, confidence: "nervous" as const };
    const workout = buildWorkout(state);
    expect(workout.exercises.length).toBeGreaterThan(0);
    expect(workout.exercises.every((item) => item.exercise.stable && item.exercise.beginnerFriendly)).toBe(true);
  });

  it("surfaces the latest completed set as previous performance", () => {
    const baseWorkout = buildWorkout(INITIAL_STATE);
    const exerciseId = baseWorkout.exercises[0].exercise.id;
    const state = {
      ...INITIAL_STATE,
      workoutLogs: [
        {
          id: "session-1",
          date: "2026-08-16",
          workoutName: "Full Body A",
          minutes: 45,
          completed: true,
          exercises: [
            {
              exerciseId,
              sets: [
                { weight: 70, reps: 10, complete: true },
                { weight: 72.5, reps: 8, complete: true },
              ],
            },
          ],
        },
      ],
    };
    const workout = buildWorkout(state);
    expect(workout.exercises.find((item) => item.exercise.id === exerciseId)?.previous).toBe("72.5 × 8");
  });
});
