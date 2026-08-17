import type { AppState } from "@/lib/startHereModels";
import type { currentTargets } from "@/lib/startHerePlan";

type Targets = ReturnType<typeof currentTargets>;

interface NormalizeResponse {
  available?: boolean;
  canonicalCommand?: string;
}

export async function canonicalizeCoachRequest(
  message: string,
  state: AppState,
  targets: Targets,
): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

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
          protein: targets.proteinGrams,
          trainingDays: state.trainingDays,
          sessionMinutes: state.sessionMinutes,
          equipment: state.equipment,
          experience: state.experience,
          confidence: state.confidence,
          likedFoods: state.likedFoods.slice(0, 20),
          dislikes: state.dislikes.slice(0, 20),
          allergies: state.allergies.slice(0, 20),
          healthFlags: state.healthFlags.slice(0, 10),
          hideCalories: state.hideCalories,
        },
      }),
    });

    if (!response.ok) return trimmed;
    const data = (await response.json().catch(() => null)) as NormalizeResponse | null;
    if (!data?.available || typeof data.canonicalCommand !== "string") return trimmed;
    const canonical = data.canonicalCommand.trim();
    return canonical || trimmed;
  } catch {
    return trimmed;
  }
}
