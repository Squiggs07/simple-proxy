import { describe, expect, it } from "vitest";
import { INITIAL_STATE } from "@/lib/startHereModels";
import { buildDayMeals, buildWorkout, mealFamilyKey, rankMeals } from "@/lib/startHerePlan";

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

  it("gives explicit food requests stronger priority than broad defaults", () => {
    const state = {
      ...INITIAL_STATE,
      likedFoods: ["Chicken"],
      foodRequests: ["salmon"],
      cuisines: [],
      mealFormats: [],
    };
    const top = rankMeals(state).slice(0, 3).map((item) => item.meal.name.toLowerCase());
    expect(top.some((name) => name.includes("salmon"))).toBe(true);
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

  it("avoids duplicate meal families in a varied day when alternatives exist", () => {
    const state = { ...INITIAL_STATE, mealsPerDay: 4, variety: "lots" as const };
    const meals = buildDayMeals(state, 2400, 170);
    const families = meals.map((item) => mealFamilyKey(item.meal));
    expect(new Set(families).size).toBe(families.length);
  });

  it("rotates the generated day instead of trapping the user in the first options", () => {
    const first = buildDayMeals({ ...INITIAL_STATE, mealRotation: 0 }, 2400, 170).map((item) => item.meal.id);
    const second = buildDayMeals({ ...INITIAL_STATE, mealRotation: 1 }, 2400, 170).map((item) => item.meal.id);
    expect(second).not.toEqual(first);
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

  it("raises meals the user repeatedly chooses through swaps", () => {
    const learnedState = {
      ...INITIAL_STATE,
      currentDay: "2026-08-17",
      likedFoods: [],
      cuisines: [],
      mealFormats: [],
      mealSwapLogs: [
        { date: "2026-08-10", sourceMealId: "turkey-pesto-pasta", chosenMealId: "salmon-potato-plate" },
        { date: "2026-08-15", sourceMealId: "steak-taco-bowl", chosenMealId: "salmon-potato-plate" },
      ],
    };
    const learned = rankMeals(learnedState).find((item) => item.meal.id === "salmon-potato-plate")!;
    const baseline = rankMeals({ ...learnedState, mealSwapLogs: [] }).find((item) => item.meal.id === "salmon-potato-plate")!;
    expect(learned.score).toBeGreaterThan(baseline.score);
    expect(learned.reasons.join(" ")).toContain("repeatedly");
  });

  it("learns repeated exercise replacements when building future workouts", () => {
    const state = {
      ...INITIAL_STATE,
      currentDay: "2026-08-17",
      experience: "experienced" as const,
      liftingHistory: "consistent" as const,
      confidence: "comfortable" as const,
      exerciseSwapLogs: [
        { date: "2026-08-10", sourceExerciseId: "reverse-lunge", chosenExerciseId: "step-up" },
        { date: "2026-08-15", sourceExerciseId: "reverse-lunge", chosenExerciseId: "step-up" },
      ],
    };
    const workout = buildWorkout(state);
    expect(workout.exercises.some((item) => item.exercise.id === "step-up")).toBe(true);
    expect(workout.exercises.some((item) => item.exercise.id === "reverse-lunge")).toBe(false);
  });

  it("builds a shorter workout from a today-only time override", () => {
    const state = { ...INITIAL_STATE, todayOverride: { minutes: 20, equipment: null, note: "test" } };
    const workout = buildWorkout(state);
    expect(workout.minutes).toBe(20);
    expect(workout.exercises.length).toBeLessThanOrEqual(3);
  });

  it("uses lifting history to give experienced users a real training baseline", () => {
    const newLifter = buildWorkout({ ...INITIAL_STATE, liftingHistory: "none" as const });
    const experienced = buildWorkout({
      ...INITIAL_STATE,
      liftingHistory: "consistent" as const,
      experience: "experienced" as const,
      sessionMinutes: 60,
      liftingBaseline: { ...INITIAL_STATE.liftingBaseline, benchKg: 90, squatKg: 130 },
    });
    const newVolume = newLifter.exercises.reduce((sum, item) => sum + item.sets, 0);
    const experiencedVolume = experienced.exercises.reduce((sum, item) => sum + item.sets, 0);
    expect(experiencedVolume).toBeGreaterThan(newVolume);
    expect(experienced.note.toLowerCase()).toContain("baseline");
    expect(experienced.exercises.some((item) => item.reps === "6–10 reps")).toBe(true);
  });

  it("uses stable beginner-friendly exercise choices for an older nervous beginner", () => {
    const state = { ...INITIAL_STATE, age: 68, experience: "new" as const, liftingHistory: "none" as const, confidence: "nervous" as const };
    const workout = buildWorkout(state);
    expect(workout.exercises.length).toBeGreaterThan(0);
    expect(workout.exercises.every((item) => item.exercise.stable && item.exercise.beginnerFriendly)).toBe(true);
  });

  it("surfaces the latest completed set as previous performance in the selected unit system", () => {
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
    const imperialWorkout = buildWorkout(state);
    expect(imperialWorkout.exercises.find((item) => item.exercise.id === exerciseId)?.previous).toBe("160 lb × 8");

    const metricWorkout = buildWorkout({ ...state, unitSystem: "metric" as const });
    expect(metricWorkout.exercises.find((item) => item.exercise.id === exerciseId)?.previous).toBe("72.5 kg × 8");
  });
});
