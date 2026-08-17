import { describe, expect, it } from "vitest";
import { buildWorkout } from "@/lib/startHerePlan";
import { ALL_EXERCISES } from "@/lib/startHereExerciseLibrary";
import { INITIAL_STATE, type AppState, type Equipment } from "@/lib/startHereModels";

function state(equipment: Equipment): AppState {
  return {
    ...INITIAL_STATE,
    onboarded: true,
    currentDay: "2026-08-17",
    trainingDays: 4,
    sessionMinutes: 45,
    equipment,
    experience: "experienced",
    confidence: "comfortable",
    liftingHistory: "consistent",
    weightLog: [],
  };
}

describe("expanded exercise library", () => {
  it("keeps every alternative reference resolvable", () => {
    const ids = new Set(ALL_EXERCISES.map((exercise) => exercise.id));
    for (const exercise of ALL_EXERCISES) {
      for (const alternative of exercise.alternativeIds) {
        expect(ids.has(alternative), `${exercise.id} -> ${alternative}`).toBe(true);
      }
    }
  });

  it("contains multiple push and pull options for every supported training environment", () => {
    for (const equipment of ["gym", "dumbbells", "home", "unsure"] as Equipment[]) {
      const eligible = ALL_EXERCISES.filter((exercise) => exercise.equipment.includes(equipment));
      expect(eligible.filter((exercise) => exercise.pattern === "push").length, `${equipment} push`).toBeGreaterThanOrEqual(2);
      expect(eligible.filter((exercise) => exercise.pattern === "pull").length, `${equipment} pull`).toBeGreaterThanOrEqual(2);
    }
  });

  it("builds complete 45-minute upper and lower sessions across equipment modes", () => {
    for (const equipment of ["gym", "dumbbells", "home", "unsure"] as Equipment[]) {
      const current = state(equipment);
      const upper = buildWorkout(current, { split: "upper", variant: "A", name: "Upper Body A" });
      const lower = buildWorkout(current, { split: "lower", variant: "A", name: "Lower Body A" });
      expect(upper.exercises.length, `${equipment} upper`).toBe(5);
      expect(lower.exercises.length, `${equipment} lower`).toBe(5);
      expect(new Set(upper.exercises.map((item) => item.exercise.id)).size).toBe(upper.exercises.length);
      expect(new Set(lower.exercises.map((item) => item.exercise.id)).size).toBe(lower.exercises.length);
    }
  });

  it("creates meaningfully different A and B sessions without changing the split", () => {
    for (const equipment of ["gym", "dumbbells", "home", "unsure"] as Equipment[]) {
      const current = state(equipment);
      const a = buildWorkout(current, { split: "upper", variant: "A", name: "Upper Body A" });
      const b = buildWorkout(current, { split: "upper", variant: "B", name: "Upper Body B" });
      const aIds = a.exercises.map((item) => item.exercise.id);
      const bIds = b.exercises.map((item) => item.exercise.id);
      expect(bIds, `${equipment} A/B`).not.toEqual(aIds);
    }
  });
});
