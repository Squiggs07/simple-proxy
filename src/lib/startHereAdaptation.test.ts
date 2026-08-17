import { describe, expect, it } from "vitest";
import { buildAdaptationReview, mealAdherence, progressionCue, workoutAdherence } from "@/lib/startHereAdaptation";
import { INITIAL_STATE, type AppState } from "@/lib/startHereModels";

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...INITIAL_STATE,
    onboarded: true,
    onboardingCompletedAt: "2026-08-01T12:00:00.000Z",
    currentDay: "2026-08-17",
    ...overrides,
  };
}

describe("adaptive planning", () => {
  it("reduces today's session when readiness is low without changing the permanent schedule", () => {
    const current = state({
      sessionMinutes: 60,
      readinessCheckIns: [{ date: "2026-08-17", readiness: "low" }],
    });
    const review = buildAdaptationReview(current, "2026-08-17");
    const recovery = review.recommendations.find((item) => item.kind === "recovery");
    expect(recovery?.scope).toBe("today");
    expect(recovery?.patch.todayOverride?.minutes).toBe(45);
    expect(recovery?.patch.trainingDays).toBeUndefined();
  });

  it("detects when the selected weekly schedule is not being completed", () => {
    const current = state({
      trainingDays: 4,
      workoutLogs: [
        { id: "w1", date: "2026-08-05", workoutName: "A", minutes: 40, exercises: [], completed: true },
        { id: "w2", date: "2026-08-12", workoutName: "A", minutes: 40, exercises: [], completed: true },
      ],
    });
    expect(workoutAdherence(current, "2026-08-17")).toBeLessThan(0.6);
    const schedule = buildAdaptationReview(current, "2026-08-17").recommendations.find((item) => item.kind === "schedule");
    expect(schedule?.patch.trainingDays).toBe(3);
  });

  it("does not judge food adherence until enough real logging days exist", () => {
    const current = state({ mealLogs: [
      { date: "2026-08-16", mealId: "a" },
      { date: "2026-08-17", mealId: "b" },
    ] });
    expect(mealAdherence(current, "2026-08-17")).toBeNull();
  });

  it("recognizes repeated top-of-range performance as a progression signal", () => {
    const current = state({
      workoutLogs: [
        {
          id: "w1", date: "2026-08-10", workoutName: "A", minutes: 45, completed: true,
          exercises: [{ exerciseId: "leg-press", sets: [
            { weight: 90, reps: 10, complete: true },
            { weight: 90, reps: 10, complete: true },
          ] }],
        },
        {
          id: "w2", date: "2026-08-14", workoutName: "A", minutes: 45, completed: true,
          exercises: [{ exerciseId: "leg-press", sets: [
            { weight: 90, reps: 11, complete: true },
            { weight: 90, reps: 10, complete: true },
          ] }],
        },
      ],
    });
    expect(progressionCue(current, "leg-press")).toContain("small load increase");
  });
});
