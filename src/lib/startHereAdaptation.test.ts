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

  it("counts unlogged days as missing coverage instead of ignoring them", () => {
    const current = state({
      mealsPerDay: 3,
      onboardingCompletedAt: "2026-08-08T12:00:00.000Z",
      mealLogs: [
        { date: "2026-08-16", mealId: "a" },
        { date: "2026-08-17", mealId: "b" },
      ],
    });
    expect(mealAdherence(current, "2026-08-17")).toBeCloseTo(2 / 30, 4);
  });

  it("waits before evaluating food coverage for a brand-new plan", () => {
    const current = state({
      onboardingCompletedAt: "2026-08-16T12:00:00.000Z",
      mealLogs: [{ date: "2026-08-17", mealId: "a" }],
    });
    expect(mealAdherence(current, "2026-08-17")).toBeNull();
  });

  it("does not stack another ongoing adaptation during the cooldown", () => {
    const current = state({
      trainingDays: 4,
      workoutLogs: [
        { id: "w1", date: "2026-08-05", workoutName: "A", minutes: 40, exercises: [], completed: true },
        { id: "w2", date: "2026-08-12", workoutName: "A", minutes: 40, exercises: [], completed: true },
      ],
      coachHistory: [
        ...INITIAL_STATE.coachHistory,
        { id: "adapt", role: "coach", text: "I adapted the plan: Try 4 training days instead of 5. Your recent pattern supported it.", createdAt: "2026-08-15T12:00:00.000Z" },
      ],
    });
    expect(buildAdaptationReview(current, "2026-08-17").recommendations.some((item) => item.scope === "ongoing")).toBe(false);
  });

  it("uses repeated low readiness plus missed workouts to suggest a smaller normal session", () => {
    const current = state({
      trainingDays: 4,
      sessionMinutes: 50,
      readinessCheckIns: [
        { date: "2026-08-09", readiness: "low" },
        { date: "2026-08-11", readiness: "low" },
        { date: "2026-08-13", readiness: "normal" },
        { date: "2026-08-15", readiness: "low" },
        { date: "2026-08-17", readiness: "normal" },
      ],
      workoutLogs: [
        { id: "w1", date: "2026-08-08", workoutName: "A", minutes: 50, exercises: [], completed: true },
        { id: "w2", date: "2026-08-15", workoutName: "A", minutes: 50, exercises: [], completed: true },
      ],
    });
    const ongoing = buildAdaptationReview(current, "2026-08-17").recommendations.find((item) => item.scope === "ongoing");
    expect(ongoing?.kind).toBe("recovery");
    expect(ongoing?.patch.sessionMinutes).toBe(40);
  });

  it("does not stack ongoing adaptations during the cooldown window", () => {
    const current = state({
      trainingDays: 4,
      adaptationEvents: [{ id: "prior", date: "2026-08-15", kind: "schedule", title: "Changed schedule" }],
      workoutLogs: [{ id: "w1", date: "2026-08-10", workoutName: "A", minutes: 40, exercises: [], completed: true }],
    });
    expect(buildAdaptationReview(current, "2026-08-17").recommendations.some((item) => item.scope === "ongoing")).toBe(false);
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

  it("does not call for more load when the recent session used much less weight", () => {
    const current = state({
      workoutLogs: [
        {
          id: "w1", date: "2026-08-10", workoutName: "A", minutes: 45, completed: true,
          exercises: [{ exerciseId: "leg-press", sets: [
            { weight: 100, reps: 10, complete: true },
            { weight: 100, reps: 10, complete: true },
          ] }],
        },
        {
          id: "w2", date: "2026-08-14", workoutName: "A", minutes: 45, completed: true,
          exercises: [{ exerciseId: "leg-press", sets: [
            { weight: 80, reps: 12, complete: true },
            { weight: 80, reps: 12, complete: true },
          ] }],
        },
      ],
    });
    expect(progressionCue(current, "leg-press")).toBeNull();
  });
});
