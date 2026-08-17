import { describe, expect, it } from "vitest";
import { interpretCoachRequest } from "@/lib/startHereCoach";
import { INITIAL_STATE } from "@/lib/startHereModels";

describe("Start Here Coach action layer", () => {
  it("treats lean bulk as cautious muscle gain", () => {
    const result = interpretCoachRequest("I want to do a lean bulk and not gain much fat", INITIAL_STATE);
    expect(result.patch.goal).toBe("gain");
    expect(result.patch.calorieOverride).toBeTypeOf("number");
    expect(result.reply.toLowerCase()).toContain("zero fat gain cannot be guaranteed");
  });

  it("keeps a short no-equipment request temporary when phrased for today", () => {
    const result = interpretCoachRequest("I only have 20 minutes and no equipment today", INITIAL_STATE);
    expect(result.patch.todayOverride).toEqual({ minutes: 20, equipment: "home", note: "Temporary Coach change" });
    expect(result.patch.trainingDays).toBeUndefined();
    expect(result.patch.sessionMinutes).toBeUndefined();
  });

  it("changes the ongoing program when scope is explicit", () => {
    const result = interpretCoachRequest("From now on I can train three days for 30 minutes", INITIAL_STATE);
    expect(result.patch.trainingDays).toBe(3);
    expect(result.patch.sessionMinutes).toBe(30);
  });

  it("makes allergies a hard exclusion", () => {
    const result = interpretCoachRequest("I am allergic to peanuts", INITIAL_STATE);
    expect(result.patch.allergies).toContain("Peanuts");
  });

  it("can simplify the visible app without changing targets", () => {
    const result = interpretCoachRequest("This is overwhelming, make the app simpler", INITIAL_STATE);
    expect(result.patch.detailLevel).toBe("simple");
    expect(result.patch.calorieOverride).toBeUndefined();
  });
});
