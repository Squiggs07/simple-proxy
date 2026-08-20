import type { AppState } from "@/lib/startHereModels";
import { buildAdaptationReview } from "@/lib/startHereAdaptation";
import { learnedBehaviorSignals } from "@/lib/startHereBehavior";
import { externalFoodTotals, VERIFIED_FOODS } from "@/lib/startHereFoodLog";
import type { CoachFoodLogAction } from "@/lib/startHereFoodLog";
import { buildEffectiveDayMeals, type currentTargets } from "@/lib/startHerePlan";
import { buildTrainingWeek } from "@/lib/startHereWeek";

type Targets = ReturnType<typeof currentTargets>;

export interface CoachAIResponse {
  available: boolean;
  answer?: string;
  canonicalCommand?: string | null;
  foodLog?: CoachFoodLogAction | null;
  model?: string;
}

function isFoodLogAction(value: unknown): value is CoachFoodLogAction {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CoachFoodLogAction>;
  const isRange = (range: unknown): range is { min: number; max: number } | null => range === null
    || (typeof range === "object" && range !== null
      && typeof (range as { min?: unknown }).min === "number"
      && typeof (range as { max?: unknown }).max === "number");
  return typeof item.name === "string"
    && typeof item.calories === "number"
    && typeof item.protein === "number"
    && (item.source === "verified" || item.source === "user" || item.source === "estimated")
    && typeof item.sourceLabel === "string"
    && (item.catalogId === null || typeof item.catalogId === "string")
    && isRange(item.calorieRange)
    && isRange(item.proteinRange);
}

export async function askCoach(
  message: string,
  state: AppState,
  targets: Targets,
): Promise<CoachAIResponse> {
  const trimmed = message.trim();
  if (!trimmed) return { available: false };
  const currentDate = state.currentDay || new Date().toISOString().slice(0, 10);
  const adaptation = buildAdaptationReview(state, currentDate);
  const learnedBehavior = learnedBehaviorSignals(state);
  const trainingWeek = buildTrainingWeek(state, currentDate);
  const todayMeals = buildEffectiveDayMeals(state, targets.calories, targets.proteinGrams).map((item) => ({
    name: item.meal.name,
    calories: item.calories,
    protein: item.protein,
    logged: state.eatenMealIds.includes(item.meal.id),
  }));
  const loggedCalories = todayMeals.filter((item) => item.logged).reduce((total, item) => total + item.calories, 0);
  const loggedProtein = todayMeals.filter((item) => item.logged).reduce((total, item) => total + item.protein, 0);
  const todayExternalFoods = state.externalFoodLogs
    .filter((item) => item.date === currentDate)
    .map(({ name, calories, protein }) => ({ name, calories, protein }));
  const externalTotals = externalFoodTotals(state, currentDate);
  const totalLoggedCalories = loggedCalories + externalTotals.calories;
  const totalLoggedProtein = loggedProtein + externalTotals.protein;

  try {
    const response = await fetch("/api/start-here-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        context: {
          goal: state.goal,
          age: state.age,
          calories: targets.calories,
          maintenanceCalories: targets.maintenanceCalories,
          protein: targets.proteinGrams,
          proteinRange: targets.proteinRange,
          trainingDays: state.trainingDays,
          sessionMinutes: state.sessionMinutes,
          equipment: state.equipment,
          experience: state.experience,
          confidence: state.confidence,
          liftingHistory: state.liftingHistory,
          liftingBaseline: state.liftingBaseline,
          likedFoods: state.likedFoods.slice(0, 20),
          foodRequests: state.foodRequests.slice(0, 20),
          cuisines: state.cuisines.slice(0, 10),
          mealFormats: state.mealFormats.slice(0, 10),
          dislikes: state.dislikes.slice(0, 20),
          allergies: state.allergies.slice(0, 20),
          dietType: state.dietType,
          cookingMinutes: state.cookingMinutes,
          budget: state.budget,
          healthFlags: state.healthFlags.slice(0, 10),
          hideCalories: state.hideCalories,
          readiness: adaptation.latestReadiness?.readiness ?? null,
          workoutAdherence: adaptation.workoutAdherence,
          mealAdherence: adaptation.mealAdherence,
          readinessLowRate: adaptation.readinessLowRate,
          learnedBehavior,
          trainingSchedule: trainingWeek.preferredDays,
          todayScheduled: trainingWeek.today.scheduled,
          todayTrainingComplete: trainingWeek.today.trained,
          nextTrainingDate: trainingWeek.nextTrainingDay.date,
          nextTrainingName: trainingWeek.nextTrainingDay.workoutName,
          weekTrainingCompleted: trainingWeek.completedScheduled,
          weekTrainingPlanned: trainingWeek.scheduledCount,
          weekScheduleAdjustments: trainingWeek.adjustmentSummary.slice(0, 6),
          todayMeals,
          todayExternalFoods,
          verifiedFoodCatalog: VERIFIED_FOODS.map(({ id, name, calories, protein, aliases, sourceLabel, checkedOn }) => ({ id, name, calories, protein, aliases, sourceLabel, checkedOn })),
          loggedCalories: totalLoggedCalories,
          loggedProtein: totalLoggedProtein,
          remainingCalories: Math.max(0, targets.calories - totalLoggedCalories),
          remainingProtein: Math.max(0, targets.proteinGrams - totalLoggedProtein),
        },
        history: state.coachHistory.slice(-6).map((item) => ({ role: item.role, text: item.text })),
      }),
    });

    if (!response.ok) return { available: false };
    const data = (await response.json().catch(() => null)) as CoachAIResponse | null;
    if (!data?.available) return { available: false };
    return {
      available: true,
      answer: typeof data.answer === "string" ? data.answer.trim() : undefined,
      canonicalCommand: typeof data.canonicalCommand === "string" ? data.canonicalCommand.trim() : null,
      foodLog: isFoodLogAction(data.foodLog) ? data.foodLog : null,
      model: typeof data.model === "string" ? data.model : undefined,
    };
  } catch {
    return { available: false };
  }
}

export async function canonicalizeCoachRequest(
  message: string,
  state: AppState,
  targets: Targets,
): Promise<string> {
  const response = await askCoach(message, state, targets);
  return response.canonicalCommand?.trim() || message.trim();
}
