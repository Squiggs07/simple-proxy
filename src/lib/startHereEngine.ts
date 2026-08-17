export type Goal = "lose" | "gain" | "strength" | "maintain" | "unsure";
export type SexEquation = "male" | "female";
export type Activity = "seated" | "light" | "active" | "very";

export interface ProfileInput {
  goal: Goal;
  age: number;
  sexEquation: SexEquation;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  healthFlag?: boolean;
}

export interface Targets {
  bmr: number;
  maintenanceCalories: number;
  calories: number;
  proteinGrams: number;
  proteinRange: [number, number];
  goalLabel: string;
  note: string;
}

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  seated: 1.2,
  light: 1.375,
  active: 1.55,
  very: 1.725,
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose fat",
  gain: "Build muscle",
  strength: "Feel stronger",
  maintain: "Maintain weight",
  unsure: "Find my starting point",
};

function roundTo(value: number, step = 10) {
  return Math.round(value / step) * step;
}

export function calculateTargets(input: ProfileInput): Targets {
  const { age, heightCm, weightKg, sexEquation, activity, healthFlag } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = base + (sexEquation === "male" ? 5 : -161);
  const maintenance = bmr * ACTIVITY_MULTIPLIER[activity];

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const mustMaintain = age < 18 || bmi < 18.5 || healthFlag;
  let adjustment = 0;

  if (!mustMaintain) {
    if (input.goal === "lose") adjustment = -0.12;
    if (input.goal === "gain") adjustment = 0.06;
    if (input.goal === "strength") adjustment = 0;
  }

  // Mechanical guardrail even if adjustment logic changes later.
  adjustment = Math.max(adjustment, -0.2);

  const floor = sexEquation === "male" ? 1500 : 1200;
  const calories = roundTo(Math.max(floor, maintenance * (1 + adjustment)), 10);

  const proteinFactor =
    input.goal === "lose" ? 2.0 :
    input.goal === "gain" || input.goal === "strength" ? 1.8 : 1.6;
  const rangeFactor: [number, number] =
    input.goal === "lose" ? [1.8, 2.2] :
    input.goal === "gain" || input.goal === "strength" ? [1.6, 2.2] : [1.4, 2.0];

  const desiredProtein = Math.round(weightKg * proteinFactor);
  const calorieShareCap = Math.floor((calories * 0.35) / 4);
  const protein = Math.min(desiredProtein, calorieShareCap);

  let note = "A starting estimate we can adjust from your real progress.";
  if (age < 18) note = "Because you are under 18, the starting plan stays maintenance-oriented.";
  else if (bmi < 18.5) note = "The starting plan avoids a calorie deficit at this body weight.";
  else if (healthFlag) note = "The starting plan stays conservative because you flagged a health consideration.";

  return {
    bmr: Math.round(bmr),
    maintenanceCalories: roundTo(maintenance, 10),
    calories,
    proteinGrams: protein,
    proteinRange: [Math.round(weightKg * rangeFactor[0]), Math.round(weightKg * rangeFactor[1])],
    goalLabel: GOAL_LABELS[input.goal],
    note,
  };
}

export interface WeightPoint {
  date: string;
  weight: number;
}

export function smoothedWeightTrend(points: WeightPoint[], window = 7) {
  return points.map((point, index) => {
    const start = Math.max(0, index - window + 1);
    const sample = points.slice(start, index + 1);
    const avg = sample.reduce((sum, item) => sum + item.weight, 0) / sample.length;
    return { ...point, trend: Number(avg.toFixed(1)) };
  });
}

export function validateCalorieTarget(
  requested: number,
  input: ProfileInput,
  maintenanceCalories: number,
) {
  const floor = input.sexEquation === "male" ? 1500 : 1200;
  const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
  if (input.age < 18 || bmi < 18.5 || input.healthFlag) {
    return Math.max(Math.round(maintenanceCalories), requested);
  }
  const maxDeficitTarget = Math.round(maintenanceCalories * 0.8);
  return Math.max(floor, maxDeficitTarget, Math.round(requested));
}

export function validateProteinTarget(requested: number, calories: number) {
  const calorieShareCap = Math.floor((calories * 0.35) / 4);
  return Math.max(40, Math.min(Math.round(requested), calorieShareCap));
}
