import { describe, expect, it } from "vitest";
import { interpretWeekScheduleRequest } from "@/lib/startHereWeekCoach";
import { buildTrainingWeek } from "@/lib/startHereWeek";
import { INITIAL_STATE, type AppState } from "@/lib/startHereModels";

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...INITIAL_STATE,
    onboarded: true,
    currentDay: "2026-08-17",
    onboardingCompletedAt: "2026-08-01T12:00:00.000Z",
    trainingDays: 3,
    preferredDays: ["Mon", "Wed", "Fri"],
    workoutLogs: [],
    weightLog: [],
    ...overrides,
  };
}

describe("week schedule Coach", () => {
  it("moves today's workout to tomorrow as a week-only exception", () => {
    const current = state();
    const result = interpretWeekScheduleRequest("I can't train today, move my workout to tomorrow", current)!;
    expect(result.patch.preferredDays).toBeUndefined();
    expect(result.patch.weekTrainingExceptions).toHaveLength(1);
    expect(result.patch.weekTrainingExceptions?.[0]).toMatchObject({
      kind: "move",
      fromDate: "2026-08-17",
      toDate: "2026-08-18",
      weekStart: "2026-08-17",
    });
    const nextState = { ...current, ...result.patch };
    expect(buildTrainingWeek(nextState, current.currentDay).nextTrainingDay.date).toBe("2026-08-18");
  });

  it("moves Friday to Saturday without changing future weeks", () => {
    const current = state();
    const result = interpretWeekScheduleRequest("Move Friday's workout to Saturday this week", current)!;
    expect(result.patch.weekTrainingExceptions?.[0]).toMatchObject({ fromDate: "2026-08-21", toDate: "2026-08-22" });
    expect(result.patch.preferredDays).toBeUndefined();
    const nextState = { ...current, ...result.patch };
    expect(buildTrainingWeek(nextState, "2026-08-24").preferredDays).toEqual(["Mon", "Wed", "Fri"]);
  });

  it("interprets an unavailable day with no replacement as an excused skip this week", () => {
    const result = interpretWeekScheduleRequest("I can't train Friday this week", state())!;
    expect(result.patch.weekTrainingExceptions?.[0]).toMatchObject({
      kind: "skip",
      fromDate: "2026-08-21",
      toDate: null,
    });
    expect(result.reply).toContain("this week only");
  });

  it("changes the normal weekday when the user explicitly says from now on", () => {
    const result = interpretWeekScheduleRequest("From now on I want to train Saturday instead of Friday every week", state())!;
    expect(result.patch.preferredDays).toEqual(["Mon", "Wed", "Sat"]);
    expect(result.patch.weekTrainingExceptions).toEqual([]);
    expect(result.changeSummary).toContain("Ongoing schedule");
  });

  it("does not stack a moved workout onto another planned session", () => {
    const result = interpretWeekScheduleRequest("Move Friday's workout to Wednesday", state())!;
    expect(result.patch).toEqual({});
    expect(result.clarification).toBe("schedule-conflict");
    expect(result.reply).toContain("already has");
  });

  it("can move an already-moved slot again while preserving the original workout identity", () => {
    const current = state({
      weekTrainingExceptions: [{
        id: "first",
        weekStart: "2026-08-17",
        kind: "move",
        fromDate: "2026-08-17",
        toDate: "2026-08-18",
        createdAt: "2026-08-17T08:00:00.000Z",
        note: null,
      }],
      currentDay: "2026-08-18",
    });
    const result = interpretWeekScheduleRequest("Move today's workout to Thursday", current)!;
    expect(result.patch.weekTrainingExceptions).toHaveLength(1);
    expect(result.patch.weekTrainingExceptions?.[0]).toMatchObject({
      fromDate: "2026-08-17",
      toDate: "2026-08-20",
    });
    const next = buildTrainingWeek({ ...current, ...result.patch }, current.currentDay);
    expect(next.days.find((day) => day.date === "2026-08-20")?.workoutName).toBe("Full Body A");
  });

  it("restores the original weekday when a moved session is put back", () => {
    const current = state({
      weekTrainingExceptions: [{
        id: "first",
        weekStart: "2026-08-17",
        kind: "move",
        fromDate: "2026-08-17",
        toDate: "2026-08-18",
        createdAt: "2026-08-17T08:00:00.000Z",
        note: null,
      }],
      currentDay: "2026-08-18",
    });
    const result = interpretWeekScheduleRequest("Move today's workout back to Monday", current)!;
    expect(result.patch.weekTrainingExceptions).toEqual([]);
    const next = buildTrainingWeek({ ...current, ...result.patch }, current.currentDay);
    expect(next.days.find((day) => day.date === "2026-08-17")?.scheduled).toBe(true);
  });

  it("clears every temporary schedule adjustment for the current week on request", () => {
    const current = state({
      weekTrainingExceptions: [
        { id: "one", weekStart: "2026-08-17", kind: "skip", fromDate: "2026-08-21", toDate: null, createdAt: "2026-08-17T08:00:00.000Z", note: null },
        { id: "old", weekStart: "2026-08-10", kind: "skip", fromDate: "2026-08-14", toDate: null, createdAt: "2026-08-10T08:00:00.000Z", note: null },
      ],
    });
    const result = interpretWeekScheduleRequest("Restore my normal schedule this week", current)!;
    expect(result.patch.weekTrainingExceptions).toHaveLength(1);
    expect(result.patch.weekTrainingExceptions?.[0].weekStart).toBe("2026-08-10");
  });

  it("refuses to move a session that has already been completed", () => {
    const current = state({
      workoutLogs: [{ id: "done", date: "2026-08-17", workoutName: "Full Body A", minutes: 45, completed: true, exercises: [] }],
    });
    const result = interpretWeekScheduleRequest("Move today's workout to tomorrow", current)!;
    expect(result.patch).toEqual({});
    expect(result.clarification).toBe("schedule-complete");
  });
});
