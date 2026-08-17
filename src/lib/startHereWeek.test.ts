import { describe, expect, it } from "vitest";
import { buildTrainingWeek, defaultTrainingDays, normalizePreferredDays, observedTrainingPattern, workoutIdentity } from "@/lib/startHereWeek";
import { INITIAL_STATE, type AppState } from "@/lib/startHereModels";

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...INITIAL_STATE,
    onboarded: true,
    currentDay: "2026-08-17",
    onboardingCompletedAt: "2026-07-20T12:00:00.000Z",
    weightLog: [],
    workoutLogs: [],
    ...overrides,
  };
}

describe("weekly training planner", () => {
  it("uses sensible default day spacing for different weekly frequencies", () => {
    expect(defaultTrainingDays(2)).toEqual(["Tue", "Fri"]);
    expect(defaultTrainingDays(3)).toEqual(["Mon", "Wed", "Fri"]);
    expect(defaultTrainingDays(4)).toEqual(["Mon", "Tue", "Thu", "Sat"]);
  });

  it("normalizes stale preferred days to the current training frequency", () => {
    expect(normalizePreferredDays(["Mon", "Wed", "Fri"], 2)).toHaveLength(2);
    expect(normalizePreferredDays(["Mon"], 3)).toEqual(["Mon", "Wed", "Fri"]);
  });

  it("alternates full-body A and B across a three-day week", () => {
    const week = buildTrainingWeek(state({ trainingDays: 3, preferredDays: ["Mon", "Wed", "Fri"] }), "2026-08-17");
    const scheduled = week.days.filter((day) => day.scheduled);
    expect(scheduled.map((day) => day.workoutName)).toEqual(["Full Body A", "Full Body B", "Full Body A"]);
    expect(week.today.workoutName).toBe("Full Body A");
    expect(week.nextTrainingDay.date).toBe("2026-08-17");
  });

  it("uses an upper/lower A-B rotation at four or more training days", () => {
    expect(workoutIdentity(0, 4).name).toBe("Upper Body A");
    expect(workoutIdentity(1, 4).name).toBe("Lower Body A");
    expect(workoutIdentity(2, 4).name).toBe("Upper Body B");
    expect(workoutIdentity(3, 4).name).toBe("Lower Body B");

    const week = buildTrainingWeek(state({ trainingDays: 4, preferredDays: ["Mon", "Tue", "Thu", "Sat"] }), "2026-08-17");
    expect(week.days.filter((day) => day.scheduled).map((day) => day.workoutName)).toEqual([
      "Upper Body A",
      "Lower Body A",
      "Upper Body B",
      "Lower Body B",
    ]);
  });

  it("does not force a workout on an unscheduled day and points to the next session", () => {
    const week = buildTrainingWeek(state({ trainingDays: 3, preferredDays: ["Mon", "Wed", "Fri"] }), "2026-08-18");
    expect(week.today.scheduled).toBe(false);
    expect(week.nextTrainingDay.day).toBe("Wed");
    expect(week.nextTrainingDay.date).toBe("2026-08-19");
  });

  it("marks scheduled completion separately from extra training", () => {
    const current = state({
      trainingDays: 3,
      preferredDays: ["Mon", "Wed", "Fri"],
      workoutLogs: [
        { id: "m", date: "2026-08-17", workoutName: "Full Body A", minutes: 45, completed: true, exercises: [] },
        { id: "t", date: "2026-08-18", workoutName: "Extra", minutes: 25, completed: true, exercises: [] },
      ],
    });
    const week = buildTrainingWeek(current, "2026-08-18");
    expect(week.completedScheduled).toBe(1);
    expect(week.completedTotal).toBe(2);
    expect(week.today.trained).toBe(true);
    expect(week.today.scheduled).toBe(false);
  });

  it("learns a consistent real-world weekday pattern instead of clinging to the stated schedule", () => {
    const actualDates = [
      "2026-07-27", "2026-07-29", "2026-08-01",
      "2026-08-03", "2026-08-05", "2026-08-08",
      "2026-08-10", "2026-08-12", "2026-08-15",
    ];
    const current = state({
      trainingDays: 3,
      preferredDays: ["Mon", "Wed", "Fri"],
      workoutLogs: actualDates.map((date, index) => ({
        id: `w${index}`,
        date,
        workoutName: `Full Body ${index % 2 === 0 ? "A" : "B"}`,
        minutes: 45,
        completed: true,
        exercises: [],
      })),
    });
    const pattern = observedTrainingPattern(current, "2026-08-17");
    expect(pattern?.days).toEqual(["Mon", "Wed", "Sat"]);
    expect(pattern?.coverage).toBe(1);
    expect(pattern?.confidence).toBe("strong");
  });
});
