import { describe, expect, it } from "vitest";
import { calculateTargets, validateCalorieTarget, validateProteinTarget } from "@/lib/startHereEngine";

describe("Start Here nutrition guardrails", () => {
  it("never allows a requested deficit beyond 20 percent of maintenance", () => {
    const profile = { goal: "lose" as const, age: 30, sexEquation: "male" as const, heightCm: 180, weightKg: 85, activity: "light" as const };
    const targets = calculateTargets(profile);
    expect(validateCalorieTarget(900, profile, targets.maintenanceCalories)).toBeGreaterThanOrEqual(Math.round(targets.maintenanceCalories * 0.8));
  });

  it("keeps under-18 plans maintenance oriented", () => {
    const profile = { goal: "lose" as const, age: 17, sexEquation: "male" as const, heightCm: 175, weightKg: 70, activity: "light" as const };
    const targets = calculateTargets(profile);
    expect(targets.calories).toBeGreaterThanOrEqual(targets.maintenanceCalories - 10);
    expect(targets.note.toLowerCase()).toContain("under 18");
  });

  it("avoids a deficit below BMI 18.5", () => {
    const profile = { goal: "lose" as const, age: 25, sexEquation: "female" as const, heightCm: 170, weightKg: 50, activity: "light" as const };
    const targets = calculateTargets(profile);
    expect(targets.calories).toBeGreaterThanOrEqual(targets.maintenanceCalories - 10);
  });

  it("caps a manual protein target to 35 percent of calories", () => {
    const calories = 2000;
    expect(validateProteinTarget(300, calories)).toBe(Math.floor((calories * 0.35) / 4));
  });
});
