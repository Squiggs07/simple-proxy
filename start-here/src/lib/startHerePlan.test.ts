import { describe, expect, it } from "vitest";
import { INITIAL_STATE } from "@/lib/startHereModels";
import { buildWorkout, rankMeals } from "@/lib/startHerePlan";

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
});
