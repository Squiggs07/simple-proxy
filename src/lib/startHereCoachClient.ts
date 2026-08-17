import type { AppState } from "@/lib/startHereModels";
import type { currentTargets } from "@/lib/startHerePlan";

type Targets = ReturnType<typeof currentTargets>;

export interface CoachAIResponse {
  available: boolean;
  answer?: string;
  canonicalCommand?: string | null;
  model?: string;
}

export async function askCoach(
  message: string,
  state: AppState,
  targets: Targets,
): Promise<CoachAIResponse> {
  const trimmed = message.trim();
  if (!trimmed) return { available: false };

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
        },
        history: state.coachHistory.slice(-8).map((item) => ({ role: item.role, text: item.text })),
      }),
    });

    if (!response.ok) return { available: false };
    const data = (await response.json().catch(() => null)) as CoachAIResponse | null;
    if (!data?.available) return { available: false };
    return {
      available: true,
      answer: typeof data.answer === "string" ? data.answer.trim() : undefined,
      canonicalCommand: typeof data.canonicalCommand === "string" ? data.canonicalCommand.trim() : null,
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
