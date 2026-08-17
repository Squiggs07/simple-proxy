/**
 * Macro target computation. Pure functions only — no I/O — so the safety
 * behavior can be exhaustively unit tested.
 *
 * All internal math is metric (kg, cm). UI-level unit conversion happens
 * at the edges.
 */

export type Goal =
  | "lose_fat"
  | "build_muscle"
  | "recomp"
  | "healthy_habits"
  | "feel_stronger"
  | "maintain"
  | "unsure";
export type SexAtBirth = "male" | "female";
export type ActivityLevel =
  | "mostly_sitting"
  | "on_feet_some"
  | "on_feet_lots"
  | "hard_physical";

export interface MacroInputs {
  goal: Goal;
  sexAtBirth: SexAtBirth;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export type SafetyFlag =
  | "clamped_to_calorie_floor"
  | "underweight_no_deficit"
  | "under_18_no_deficit";

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  maintenanceCalories: number;
  /**
   * "standard" — the plan matches the user's chosen goal.
   * "maintenance" — a red flag was raised and we substituted a
   * maintenance/health-focused plan instead of a deficit.
   */
  planType: "standard" | "maintenance";
  flags: SafetyFlag[];
}

/** Hard calorie floors — never program below these. Treated as hard stops. */
export const CALORIE_FLOOR: Record<SexAtBirth, number> = {
  male: 1500,
  female: 1200,
};

/** Never exceed a moderate deficit, no matter the goal. */
export const MAX_DEFICIT_FRACTION = 0.2;

/** BMI below this is treated as underweight for red-flag screening. */
export const UNDERWEIGHT_BMI = 18.5;

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  mostly_sitting: 1.2,
  on_feet_some: 1.375,
  on_feet_lots: 1.55,
  hard_physical: 1.725,
};

/** Calorie adjustment per goal, as a fraction of maintenance. */
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose_fat: -0.15,
  // A cautious starting surplus. The trend-review loop can adjust this later.
  build_muscle: 0.07,
  recomp: 0,
  healthy_habits: 0,
  feel_stronger: 0,
  maintain: 0,
  unsure: 0,
};

/** Protein target in g per kg bodyweight, by goal. */
const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose_fat: 2.0,
  build_muscle: 1.8,
  recomp: 1.8,
  healthy_habits: 1.6,
  feel_stronger: 1.6,
  maintain: 1.6,
  unsure: 1.6,
};

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(inputs: Pick<MacroInputs, "sexAtBirth" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * inputs.weightKg + 6.25 * inputs.heightCm - 5 * inputs.age;
  return base + (inputs.sexAtBirth === "male" ? 5 : -161);
}

/** Maintenance calories: BMR times an activity factor. */
export function maintenanceCalories(inputs: MacroInputs): number {
  return Math.round(bmr(inputs) * ACTIVITY_FACTOR[inputs.activityLevel]);
}

export function bmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Red-flag screening. Any flag returned here means the user should NOT be
 * given a calorie deficit, regardless of their stated goal.
 */
export function screenRedFlags(inputs: MacroInputs): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  if (inputs.age < 18) flags.push("under_18_no_deficit");
  if (bmi(inputs.heightCm, inputs.weightKg) < UNDERWEIGHT_BMI) {
    flags.push("underweight_no_deficit");
  }
  return flags;
}

/**
 * Compute daily calorie + macro targets with all safety rules applied:
 *  - deficits are capped at MAX_DEFICIT_FRACTION of maintenance
 *  - calories never go below the sex-specific floor
 *  - red flags (underweight, under 18) force a maintenance plan
 */
export function computeMacroTargets(inputs: MacroInputs): MacroTargets {
  const maintenance = maintenanceCalories(inputs);
  const redFlags = screenRedFlags(inputs);

  let adjustment = GOAL_ADJUSTMENT[inputs.goal];
  // Cap the deficit even if goal adjustments are ever made configurable.
  adjustment = Math.max(adjustment, -MAX_DEFICIT_FRACTION);

  let planType: MacroTargets["planType"] = "standard";
  if (redFlags.length > 0 && adjustment < 0) {
    adjustment = 0;
    planType = "maintenance";
  }

  // Red flags always surface so the UI can show supportive copy, even when
  // the goal didn't involve a deficit in the first place.
  const flags: SafetyFlag[] = [...redFlags];

  let calories = Math.round(maintenance * (1 + adjustment));
  const floor = CALORIE_FLOOR[inputs.sexAtBirth];
  if (calories < floor) {
    calories = floor;
    flags.push("clamped_to_calorie_floor");
  }

  // Protein from bodyweight, but never more than 35% of calories so the
  // remaining macros stay sensible for unusual weight/calorie combinations.
  const proteinCap = (calories * 0.35) / KCAL_PER_G.protein;
  const proteinG = Math.round(
    Math.min(PROTEIN_G_PER_KG[inputs.goal] * inputs.weightKg, proteinCap),
  );

  // Fat at 30% of calories, carbs fill the rest. Beginners do not need these
  // details by default, but the verified values remain available underneath.
  const fatG = Math.round((calories * 0.3) / KCAL_PER_G.fat);
  const remainingKcal =
    calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  const carbsG = Math.max(0, Math.round(remainingKcal / KCAL_PER_G.carbs));

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    maintenanceCalories: maintenance,
    planType,
    flags,
  };
}
