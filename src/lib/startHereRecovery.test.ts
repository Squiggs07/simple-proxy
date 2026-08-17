import { describe, expect, it } from "vitest";
import {
  detectRecoverySignals,
  mergeRecoverySignalFromText,
  progressionRecoveryHold,
  recoveryPatternSummary,
  recoveryReasonRate,
} from "@/lib/startHereRecovery";
import { INITIAL_STATE, type AppState } from "@/lib/startHereModels";

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...INITIAL_STATE,
    currentDay: "2026-08-17",
    readinessCheckIns: [],
    ...overrides,
  };
}

describe("recovery signals", () => {
  it("detects poor sleep and infers low readiness from a very short night", () => {
    const signal = detectRecoverySignals("I only slept 4.5 hours last night");
    expect(signal.reasons).toContain("poor-sleep");
    expect(signal.inferredReadiness).toBe("low");
  });

  it("records soreness without automatically declaring mild soreness low readiness", () => {
    const signal = detectRecoverySignals("I'm a little sore today");
    expect(signal.reasons).toContain("sore");
    expect(signal.inferredReadiness).toBeNull();
  });

  it("detects a time crunch separately from physical recovery", () => {
    const signal = detectRecoverySignals("I only have 20 minutes today");
    expect(signal.reasons).toEqual(["short-on-time"]);
    expect(signal.inferredReadiness).toBeNull();
  });

  it("detects a genuinely good recovery day without overcomplicating it", () => {
    const signal = detectRecoverySignals("I feel great and well rested today");
    expect(signal.reasons).toContain("feeling-good");
    expect(signal.inferredReadiness).toBe("high");
  });

  it("merges Coach-observed recovery context into an existing manual check-in", () => {
    const current = state({
      readinessCheckIns: [{ date: "2026-08-17", readiness: "normal", reasons: ["sore"], source: "check-in" }],
    });
    const result = mergeRecoverySignalFromText(current, "I slept 5 hours and I'm stressed", "2026-08-17")!;
    const checkIn = result.patch.readinessCheckIns?.[0];
    expect(checkIn?.readiness).toBe("low");
    expect(checkIn?.reasons).toEqual(expect.arrayContaining(["sore", "poor-sleep", "stressed"]));
    expect(checkIn?.source).toBe("coach");
  });

  it("waits for enough check-ins before treating a recovery reason as a pattern", () => {
    const current = state({
      readinessCheckIns: [
        { date: "2026-08-15", readiness: "low", reasons: ["short-on-time"] },
        { date: "2026-08-17", readiness: "low", reasons: ["short-on-time"] },
      ],
    });
    expect(recoveryReasonRate(current, "2026-08-17", "short-on-time")).toBeNull();
  });

  it("summarizes repeated recovery reasons only after a useful sample exists", () => {
    const current = state({
      readinessCheckIns: [
        { date: "2026-08-10", readiness: "low", reasons: ["poor-sleep"] },
        { date: "2026-08-12", readiness: "normal", reasons: [] },
        { date: "2026-08-14", readiness: "low", reasons: ["poor-sleep"] },
        { date: "2026-08-16", readiness: "normal", reasons: ["short-on-time"] },
        { date: "2026-08-17", readiness: "normal", reasons: ["short-on-time"] },
      ],
    });
    const summary = recoveryPatternSummary(current, "2026-08-17").join(" ");
    expect(summary).toContain("Poor sleep: 2 of 5");
    expect(summary).toContain("Short on time: 2 of 5");
  });

  it("holds progression on a poor-sleep day instead of treating old performance as a mandate", () => {
    const current = state({
      readinessCheckIns: [{ date: "2026-08-17", readiness: "low", reasons: ["poor-sleep"] }],
    });
    expect(progressionRecoveryHold(current, "2026-08-17")).toContain("sleep was rough");
  });
});
