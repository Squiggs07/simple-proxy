import { calculateTargets, smoothedWeightTrend, validateCalorieTarget } from "@/lib/startHereEngine";
import type { AppState, ReadinessCheckIn, WorkoutSessionLog } from "@/lib/startHereModels";

export interface AdaptationRecommendation {
  id: string;
  kind: "recovery" | "schedule" | "nutrition";
  scope: "today" | "ongoing";
  title: string;
  reason: string;
  confidence: "early" | "moderate" | "strong";
  patch: Partial<AppState>;
}

export interface AdaptationReview {
  latestReadiness: ReadinessCheckIn | null;
  workoutAdherence: number | null;
  mealAdherence: number | null;
  readinessLowRate: number | null;
  recommendations: AdaptationRecommendation[];
}

function parseDate(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function diffDays(later: string, earlier: string) {
  return Math.max(0, Math.round((parseDate(later) - parseDate(earlier)) / 86_400_000));
}

function daysAgo(today: string, days: number) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function recentOngoingAdaptation(state: AppState, today: string, cooldownDays = 7) {
  const cutoff = daysAgo(today, cooldownDays - 1);
  if (state.adaptationEvents.some((event) => event.kind !== "recovery" && event.date >= cutoff && event.date <= today)) return true;
  return state.coachHistory.some((message) =>
    message.role === "coach" &&
    message.text.startsWith("I adapted the plan:") &&
    message.createdAt.slice(0, 10) >= cutoff,
  );
}

export function latestReadiness(state: AppState, today: string): ReadinessCheckIn | null {
  return [...state.readinessCheckIns].reverse().find((item) => item.date === today) ?? null;
}

export function readinessLowRate(state: AppState, today: string, windowDays = 10): number | null {
  const cutoff = daysAgo(today, windowDays - 1);
  const checkIns = state.readinessCheckIns.filter((item) => item.date >= cutoff && item.date <= today);
  if (checkIns.length < 5) return null;
  return checkIns.filter((item) => item.readiness === "low").length / checkIns.length;
}

export function workoutAdherence(state: AppState, today: string, windowDays = 14): number | null {
  if (!state.onboardingCompletedAt) return null;
  const onboardingDate = state.onboardingCompletedAt.slice(0, 10);
  const start = onboardingDate > daysAgo(today, windowDays - 1) ? onboardingDate : daysAgo(today, windowDays - 1);
  const elapsed = diffDays(today, start) + 1;
  if (elapsed < 7) return null;
  const expected = Math.max(1, (state.trainingDays * elapsed) / 7);
  const completed = state.workoutLogs.filter((log) => log.completed && log.date >= start && log.date <= today).length;
  return Math.min(1.5, completed / expected);
}

export function mealAdherence(state: AppState, today: string, windowDays = 10): number | null {
  if (!state.onboardingCompletedAt) return null;
  const onboardingDate = state.onboardingCompletedAt.slice(0, 10);
  const start = onboardingDate > daysAgo(today, windowDays - 1) ? onboardingDate : daysAgo(today, windowDays - 1);
  const elapsed = diffDays(today, start) + 1;
  if (elapsed < 4) return null;
  const logs = state.mealLogs.filter((log) => log.date >= start && log.date <= today);
  const eaten = logs.length;
  const expected = Math.max(1, elapsed * state.mealsPerDay);
  return Math.min(1, eaten / expected);
}

function baseCalories(state: AppState) {
  return calculateTargets({
    goal: state.goal,
    age: state.age,
    sexEquation: state.sexEquation,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    activity: state.activity,
    healthFlag: state.healthFlags.length > 0,
  });
}

function nutritionRecommendation(state: AppState, mealRate: number | null): AdaptationRecommendation | null {
  if (mealRate === null || mealRate < 0.65 || state.weightLog.length < 10) return null;
  const sorted = [...state.weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const span = diffDays(sorted[sorted.length - 1].date, sorted[0].date);
  if (span < 10) return null;
  const trend = smoothedWeightTrend(sorted, 7);
  const latest = trend[trend.length - 1];
  const reference = [...trend].reverse().find((point) => diffDays(latest.date, point.date) >= 7) ?? trend[0];
  const weeklyChange = latest.trend - reference.trend;
  let delta = 0;
  let reason = "";

  if (state.goal === "lose" && weeklyChange > -0.15) {
    delta = -100;
    reason = "Your smoothed weight trend has been flatter than the current fat-loss pace, and your recent food logging covers enough of the plan to make a small test reasonable.";
  } else if (state.goal === "lose" && weeklyChange < -0.9) {
    delta = 100;
    reason = "Your smoothed trend is moving quickly. A small increase can make the plan easier to sustain while still keeping the direction intact.";
  } else if (state.goal === "gain" && weeklyChange < 0.05) {
    delta = 100;
    reason = "Your smoothed trend has not moved up despite enough recent food logging to evaluate the plan, so a small increase is a useful next test.";
  } else if (state.goal === "gain" && weeklyChange > 0.7) {
    delta = -100;
    reason = "Your smoothed trend is rising faster than a cautious muscle-gain phase needs, so a small reduction is reasonable.";
  }

  if (!delta) return null;
  const targets = baseCalories(state);
  const current = state.calorieOverride ?? targets.calories;
  const requested = current + delta;
  const safe = validateCalorieTarget(requested, {
    goal: state.goal,
    age: state.age,
    sexEquation: state.sexEquation,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    activity: state.activity,
    healthFlag: state.healthFlags.length > 0,
  }, targets.maintenanceCalories);
  if (safe === current) return null;
  return {
    id: `nutrition-${delta > 0 ? "up" : "down"}`,
    kind: "nutrition",
    scope: "ongoing",
    title: `${delta > 0 ? "Add" : "Remove"} about 100 calories`,
    reason,
    confidence: "strong",
    patch: { calorieOverride: safe },
  };
}

export function buildAdaptationReview(state: AppState, today: string): AdaptationReview {
  const readiness = latestReadiness(state, today);
  const workoutRate = workoutAdherence(state, today);
  const mealRate = mealAdherence(state, today);
  const lowReadinessRate = readinessLowRate(state, today);
  const recommendations: AdaptationRecommendation[] = [];

  if (readiness?.readiness === "low") {
    const reducedMinutes = Math.max(15, Math.round((state.sessionMinutes * 0.75) / 5) * 5);
    if ((state.todayOverride.minutes ?? state.sessionMinutes) > reducedMinutes) {
      recommendations.push({
        id: "recovery-easier-today",
        kind: "recovery",
        scope: "today",
        title: `Make today a ${reducedMinutes}-minute session`,
        reason: "You marked today as low readiness. Keeping the habit while trimming volume is usually more useful than forcing the normal session.",
        confidence: "moderate",
        patch: { todayOverride: { ...state.todayOverride, minutes: reducedMinutes, note: "Adjusted from today's readiness check-in." } },
      });
    }
  }

  const coolingDown = recentOngoingAdaptation(state, today);
  if (!coolingDown && lowReadinessRate !== null && lowReadinessRate >= 0.5 && workoutRate !== null && workoutRate < 0.8 && state.sessionMinutes > 20) {
    const shorter = Math.max(20, state.sessionMinutes - 10);
    recommendations.push({
      id: "recovery-shorter-baseline",
      kind: "recovery",
      scope: "ongoing",
      title: `Make normal sessions ${shorter} minutes for now`,
      reason: "Low-readiness check-ins have become a pattern and workout completion is also below plan. Shortening the normal session is a smaller change than cutting a training day and is easy to reverse.",
      confidence: "moderate",
      patch: { sessionMinutes: shorter },
    });
  } else if (!coolingDown && workoutRate !== null && workoutRate < 0.6 && state.trainingDays > 1) {
    recommendations.push({
      id: "schedule-less-often",
      kind: "schedule",
      scope: "ongoing",
      title: `Try ${state.trainingDays - 1} training days instead of ${state.trainingDays}`,
      reason: "Your recent completed-workout rate is below the schedule you chose. A smaller plan you complete is more useful than a larger plan you keep missing.",
      confidence: "moderate",
      patch: { trainingDays: state.trainingDays - 1 },
    });
  }

  if (!coolingDown && !recommendations.some((item) => item.scope === "ongoing")) {
    const nutrition = nutritionRecommendation(state, mealRate);
    if (nutrition) recommendations.push(nutrition);
  }

  return { latestReadiness: readiness, workoutAdherence: workoutRate, mealAdherence: mealRate, readinessLowRate: lowReadinessRate, recommendations };
}

function completedExerciseSets(session: WorkoutSessionLog, exerciseId: string) {
  return session.exercises.find((item) => item.exerciseId === exerciseId)?.sets.filter((set) => set.complete) ?? [];
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function progressionCue(state: AppState, exerciseId: string): string | null {
  const sessions = state.workoutLogs.filter((session) => completedExerciseSets(session, exerciseId).length > 0).slice(-2);
  if (sessions.length < 2) return null;
  const recentSets = completedExerciseSets(sessions[1], exerciseId);
  const priorSets = completedExerciseSets(sessions[0], exerciseId);
  if (recentSets.length < 2 || priorSets.length < 2) return null;
  const recentReps = recentSets.map((set) => set.reps).filter((value): value is number => value !== null);
  const priorReps = priorSets.map((set) => set.reps).filter((value): value is number => value !== null);
  if (!recentReps.length || !priorReps.length) return null;
  const recentAvg = average(recentReps);
  const priorAvg = average(priorReps);
  const recentLoads = recentSets.map((set) => set.weight).filter((value): value is number => value !== null);
  const priorLoads = priorSets.map((set) => set.weight).filter((value): value is number => value !== null);
  const bothWeighted = recentLoads.length > 0 && priorLoads.length > 0;
  const recentLoad = bothWeighted ? average(recentLoads) : null;
  const priorLoad = bothWeighted ? average(priorLoads) : null;
  const comparableLoad = recentLoad === null || priorLoad === null || recentLoad >= priorLoad * 0.98;
  const materiallyHeavier = recentLoad !== null && priorLoad !== null && recentLoad > priorLoad * 1.03;

  if (recentAvg >= 10 && priorAvg >= 9 && comparableLoad) {
    return "You handled the top of the rep range twice at a comparable load. If warm-ups feel normal, try a small load increase today.";
  }
  if (recentAvg < priorAvg - 2 && !materiallyHeavier) {
    return "Performance dipped last time without a meaningful load increase. Keep the load steady today and focus on clean reps instead of forcing progression.";
  }
  return null;
}
