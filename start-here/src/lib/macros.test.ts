import { describe, expect, it } from "vitest";

import {
  bmr,
  bmi,
  CALORIE_FLOOR,
  computeMacroTargets,
  maintenanceCalories,
  MacroInputs,
  screenRedFlags,
} from "./macros";

const base: MacroInputs = {
  goal: "lose_fat",
  sexAtBirth: "male",
  age: 30,
  heightCm: 180,
  weightKg: 85,
  activityLevel: "on_feet_some",
};

describe("bmr (Mifflin-St Jeor)", () => {
  it("matches the published formula for men", () => {
    expect(bmr(base)).toBe(1830);
  });

  it("matches the published formula for women", () => {
    expect(
      bmr({ sexAtBirth: "female", age: 40, heightCm: 165, weightKg: 70 }),
    ).toBeCloseTo(1370.25);
  });
});

describe("maintenanceCalories", () => {
  it("applies the activity factor", () => {
    expect(maintenanceCalories({ ...base, activityLevel: "mostly_sitting" })).toBe(
      Math.round(1830 * 1.2),
    );
    expect(maintenanceCalories({ ...base, activityLevel: "hard_physical" })).toBe(
      Math.round(1830 * 1.725),
    );
  });
});

describe("computeMacroTargets — goal adjustments", () => {
  it("applies a moderate deficit for fat loss", () => {
    const t = computeMacroTargets(base);
    expect(t.calories).toBe(Math.round(t.maintenanceCalories * 0.85));
    expect(t.planType).toBe("standard");
    expect(t.flags).toEqual([]);
  });

  it("uses a cautious starting surplus for muscle gain", () => {
    const t = computeMacroTargets({ ...base, goal: "build_muscle" });
    expect(t.calories).toBe(Math.round(t.maintenanceCalories * 1.07));
  });

  it("holds maintenance for non-weight-change starting goals", () => {
    for (const goal of [
      "recomp",
      "healthy_habits",
      "feel_stronger",
      "maintain",
      "unsure",
    ] as const) {
      const t = computeMacroTargets({ ...base, goal });
      expect(t.calories).toBe(t.maintenanceCalories);
    }
  });
});

describe("computeMacroTargets — safety floors", () => {
  it("never programs below the female calorie floor", () => {
    const t = computeMacroTargets({
      goal: "lose_fat",
      sexAtBirth: "female",
      age: 60,
      heightCm: 150,
      weightKg: 48,
      activityLevel: "mostly_sitting",
    });
    expect(t.calories).toBeGreaterThanOrEqual(CALORIE_FLOOR.female);
    expect(t.flags).toContain("clamped_to_calorie_floor");
  });

  it("never programs below the male calorie floor", () => {
    const t = computeMacroTargets({
      goal: "lose_fat",
      sexAtBirth: "male",
      age: 70,
      heightCm: 158,
      weightKg: 56,
      activityLevel: "mostly_sitting",
    });
    expect(t.calories).toBeGreaterThanOrEqual(CALORIE_FLOOR.male);
  });

  it("does not flag a clamp when the target is comfortably above the floor", () => {
    const t = computeMacroTargets(base);
    expect(t.flags).not.toContain("clamped_to_calorie_floor");
  });
});

describe("computeMacroTargets — red-flag screening", () => {
  const underweight: MacroInputs = {
    ...base,
    heightCm: 180,
    weightKg: 55,
  };

  it("detects underweight BMI", () => {
    expect(bmi(180, 55)).toBeLessThan(18.5);
    expect(screenRedFlags(underweight)).toContain("underweight_no_deficit");
  });

  it("replaces a deficit with a maintenance plan for underweight users", () => {
    const t = computeMacroTargets(underweight);
    expect(t.planType).toBe("maintenance");
    expect(t.calories).toBe(t.maintenanceCalories);
    expect(t.flags).toContain("underweight_no_deficit");
  });

  it("replaces a deficit with a maintenance plan for under-18 users", () => {
    const t = computeMacroTargets({ ...base, age: 17 });
    expect(t.planType).toBe("maintenance");
    expect(t.calories).toBe(t.maintenanceCalories);
    expect(t.flags).toContain("under_18_no_deficit");
  });

  it("still allows a cautious surplus for an underweight user who wants to build muscle", () => {
    const t = computeMacroTargets({ ...underweight, goal: "build_muscle" });
    expect(t.planType).toBe("standard");
    expect(t.calories).toBe(Math.round(t.maintenanceCalories * 1.07));
    expect(t.flags).toContain("underweight_no_deficit");
  });
});

describe("computeMacroTargets — macro split", () => {
  it("bases protein on bodyweight", () => {
    const t = computeMacroTargets(base);
    expect(t.proteinG).toBe(Math.round(85 * 2.0));
  });

  it("uses the research-led starting protein values for newer goals", () => {
    expect(computeMacroTargets({ ...base, goal: "build_muscle" }).proteinG).toBe(
      Math.round(85 * 1.8),
    );
    expect(computeMacroTargets({ ...base, goal: "feel_stronger" }).proteinG).toBe(
      Math.round(85 * 1.6),
    );
    expect(computeMacroTargets({ ...base, goal: "maintain" }).proteinG).toBe(
      Math.round(85 * 1.6),
    );
  });

  it("caps protein at 35% of calories for heavy users on low calories", () => {
    const t = computeMacroTargets({
      goal: "lose_fat",
      sexAtBirth: "female",
      age: 45,
      heightCm: 155,
      weightKg: 140,
      activityLevel: "mostly_sitting",
    });
    expect(t.proteinG * 4).toBeLessThanOrEqual(t.calories * 0.35 + 4);
  });

  it("macro calories roughly add up to the calorie target", () => {
    const t = computeMacroTargets(base);
    const kcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(kcal - t.calories)).toBeLessThan(20);
  });

  it("never produces negative carbs", () => {
    const t = computeMacroTargets({
      goal: "lose_fat",
      sexAtBirth: "female",
      age: 30,
      heightCm: 150,
      weightKg: 200,
      activityLevel: "mostly_sitting",
    });
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
  });
});
