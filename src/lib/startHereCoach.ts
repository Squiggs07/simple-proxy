import { calculateTargets, validateCalorieTarget, validateProteinTarget } from "@/lib/startHereEngine";
import { buildDayMeals, currentTargets } from "@/lib/startHerePlan";
import { answerGeneralCoachQuestion } from "@/lib/startHereCoachKnowledge";
import type { AppState, Equipment } from "@/lib/startHereModels";

export interface CoachActionResult {
  patch: Partial<AppState>;
  reply: string;
  changeSummary?: string;
  clarification?: string;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function profileFor(state: AppState) {
  return {
    goal: state.goal,
    age: state.age,
    sexEquation: state.sexEquation,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    activity: state.activity,
    healthFlag: state.healthFlags.length > 0,
  };
}

function currentNumbers(state: AppState) {
  const profile = profileFor(state);
  const base = calculateTargets(profile);
  return {
    profile,
    base,
    calories: state.calorieOverride ?? base.calories,
    protein: state.proteinOverride ?? base.proteinGrams,
  };
}

function parseNumberWord(value: string) {
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  return Number(value) || words[value.toLowerCase()] || null;
}

function detectEquipment(text: string): Equipment | null {
  if (text.includes("no equipment") || text.includes("bodyweight")) return "home";
  if (text.includes("dumbbell")) return "dumbbells";
  if (text.includes("home")) return "home";
  if (text.includes("gym")) return "gym";
  return null;
}

function detectDirectGoal(text: string): AppState["goal"] | null {
  if (/lose fat|lose weight|fat loss|cutting phase|start a cut/.test(text)) return "lose";
  if (/maintain my weight|maintain weight|stay the same weight|maintenance phase/.test(text)) return "maintain";
  if (/feel stronger|strength and health|general strength/.test(text)) return "strength";
  if (/build muscle|gain muscle|muscle gain|gain size/.test(text)) return "gain";
  return null;
}

export function interpretCoachRequest(raw: string, state: AppState): CoachActionResult {
  const text = raw.trim().toLowerCase();
  const { profile, base, calories, protein } = currentNumbers(state);
  const permanent = /from now on|going forward|permanent|every week|ongoing/.test(text);
  const todayOnly = /today|tonight|this morning|this afternoon|right now|only have/.test(text) && !permanent;

  if (!text) {
    return { patch: {}, reply: "Tell me what does not fit. I can change meals, targets, training, or how much detail the app shows." };
  }

  if (/lean bulk|lean gain/.test(text) || (text.includes("gain muscle") && text.includes("fat"))) {
    const nextProfile = { ...profile, goal: "gain" as const };
    const next = calculateTargets(nextProfile);
    return {
      patch: { goal: "gain", calorieOverride: next.calories, proteinOverride: next.proteinGrams },
      reply: `I moved you to a cautious muscle-gain phase with a small starting surplus and ${next.proteinGrams}g of protein. I’ll judge it from the smoothed trend after enough data, not a single weigh-in. Zero fat gain cannot be guaranteed. What meals do you genuinely enjoy enough to repeat?`,
      changeSummary: `Goal → Build muscle · ${next.calories} cal · ${next.proteinGrams}g protein`,
    };
  }

  const directGoal = detectDirectGoal(text);
  if (directGoal) {
    const next = calculateTargets({ ...profile, goal: directGoal });
    const labels: Record<AppState["goal"], string> = {
      lose: "Lose fat",
      gain: "Build muscle",
      maintain: "Maintain weight",
      strength: "Feel stronger",
      unsure: "Not sure yet",
    };
    return {
      patch: { goal: directGoal, calorieOverride: next.calories, proteinOverride: next.proteinGrams },
      reply: `Done. I changed your goal to ${labels[directGoal]} and rebuilt the starting calorie and protein targets from the deterministic engine.`,
      changeSummary: `Goal → ${labels[directGoal]} · ${next.calories} cal · ${next.proteinGrams}g protein`,
    };
  }

  const calorieDelta = text.match(/(?:increase|raise|add|decrease|lower|drop|reduce)\s+(?:my\s+)?calories(?:\s+by)?\s+(\d+)/i);
  if (calorieDelta) {
    const amount = Number(calorieDelta[1]);
    const down = /decrease|lower|drop|reduce/.test(text);
    const requested = calories + (down ? -amount : amount);
    const validated = validateCalorieTarget(requested, profile, base.maintenanceCalories);
    const limited = validated !== requested;
    return {
      patch: { calorieOverride: validated },
      reply: limited
        ? `I did not take the target all the way to ${requested}. The current guardrails put the validated target at ${validated} calories, so I set it there instead.`
        : `Done. Your daily target moved from ${calories} to ${validated} calories. I left protein and training unchanged.`,
      changeSummary: `${calories} → ${validated} calories`,
    };
  }

  const setCalories = text.match(/(?:set|make)\s+(?:my\s+)?calories(?:\s+to)?\s+(\d+)/i);
  if (setCalories) {
    const requested = Number(setCalories[1]);
    const validated = validateCalorieTarget(requested, profile, base.maintenanceCalories);
    return {
      patch: { calorieOverride: validated },
      reply: validated === requested
        ? `Done. Your daily target is now ${validated} calories.`
        : `I validated that request against your current profile. ${requested} would cross the active guardrail, so I set the target to ${validated} instead.`,
      changeSummary: `${calories} → ${validated} calories`,
    };
  }

  const proteinDelta = text.match(/(?:increase|raise|add|decrease|lower|drop|reduce)\s+(?:my\s+)?protein(?:\s+by)?\s+(\d+)/i);
  if (proteinDelta) {
    const amount = Number(proteinDelta[1]);
    const down = /decrease|lower|drop|reduce/.test(text);
    const requested = protein + (down ? -amount : amount);
    const validated = validateProteinTarget(requested, calories);
    return {
      patch: { proteinOverride: validated },
      reply: validated === requested
        ? `Done. Protein moved from ${protein}g to ${validated}g per day.`
        : `I set protein to ${validated}g instead of ${requested}g so it stays inside the validated share of your calorie target.`,
      changeSummary: `${protein}g → ${validated}g protein`,
    };
  }

  const setProtein = text.match(/(?:set|make)\s+(?:my\s+)?protein(?:\s+to)?\s+(\d+)/i);
  if (setProtein) {
    const requested = Number(setProtein[1]);
    const validated = validateProteinTarget(requested, calories);
    return {
      patch: { proteinOverride: validated },
      reply: validated === requested
        ? `Done. Protein is now ${validated}g per day.`
        : `I set protein to ${validated}g rather than ${requested}g so it stays within the plan’s validated calorie share.`,
      changeSummary: `${protein}g → ${validated}g protein`,
    };
  }

  const ageMatch = text.match(/(?:i am|i'm|im)\s+(\d{2})\b/);
  if (ageMatch && Number(ageMatch[1]) >= 55 && /gym|never|beginner|new|train|workout/.test(text)) {
    const age = Number(ageMatch[1]);
    return {
      patch: {
        age,
        experience: "new",
        confidence: "nervous",
        trainingDays: Math.min(state.trainingDays, 2),
        sessionMinutes: Math.min(state.sessionMinutes, 30),
      },
      reply: `I adjusted the starting training setup for a ${age}-year-old beginner: two manageable sessions, stable exercises, lower initial volume, and a little balance work. That is about building capability, not treating age like a limitation. Are you training at a gym, at home, or are you unsure yet?`,
      changeSummary: `Beginner support · 2 days · ${Math.min(state.sessionMinutes, 30)} min`,
    };
  }

  const permanentSchedule = text.match(/(?:from now on|going forward|every week).*?(\d+|one|two|three|four|five|six)\s+days?.*?(\d+)\s*(?:min|minute)/i);
  if (permanentSchedule) {
    const days = parseNumberWord(permanentSchedule[1]);
    const minutes = Number(permanentSchedule[2]);
    if (days) {
      return {
        patch: { trainingDays: Math.max(1, Math.min(6, days)), sessionMinutes: Math.max(15, Math.min(90, minutes)), todayOverride: { minutes: null, equipment: null, note: null } },
        reply: `Done. Your ongoing program is now built around ${days} days per week and ${minutes}-minute sessions. I rebuilt the training rhythm instead of treating this as a one-day exception.`,
        changeSummary: `Ongoing training → ${days} days × ${minutes} min`,
      };
    }
  }

  const minutesMatch = text.match(/(15|20|25|30|35|40|45|50|60|75|90)\s*(?:min|minute)/i);
  const equipment = detectEquipment(text);
  const trainingContext = /workout|train|training|session|gym|equipment|bodyweight|dumbbell|no equipment/.test(text);

  if (permanent && equipment && trainingContext) {
    return {
      patch: { equipment, todayOverride: { minutes: null, equipment: null, note: null } },
      reply: `Done. Your ongoing training setup now uses ${equipment === "home" ? "home / no-equipment-friendly options" : equipment}. I rebuilt future workouts around that instead of treating it as a one-day exception.`,
      changeSummary: `Ongoing equipment → ${equipment}`,
    };
  }

  if ((minutesMatch || equipment) && todayOnly && trainingContext) {
    const minutes = minutesMatch ? Number(minutesMatch[1]) : state.todayOverride.minutes;
    const nextEquipment = equipment ?? state.todayOverride.equipment;
    const pieces = [minutes ? `${minutes} minutes` : null, nextEquipment === "home" ? "no-equipment/home" : nextEquipment].filter(Boolean);
    return {
      patch: { todayOverride: { minutes: minutes ?? null, equipment: nextEquipment ?? null, note: "Temporary Coach change" } },
      reply: `Today only: I changed the session to ${pieces.join(" · ")}. Your normal weekly program stays unchanged.`,
      changeSummary: `Today only → ${pieces.join(" · ")}`,
    };
  }

  if (text.includes("hide calories")) {
    return { patch: { hideCalories: true }, reply: "Done. Calories are hidden across the main experience. Protein, meals, training, and progress stay visible.", changeSummary: "Calories hidden" };
  }
  if (text.includes("show calories")) {
    return { patch: { hideCalories: false }, reply: "Calories are visible again.", changeSummary: "Calories visible" };
  }
  if (/make (?:the app )?simpler|less detail|too much information|overwhelming/.test(text)) {
    return { patch: { detailLevel: "simple" }, reply: "Done. The app will keep the next action prominent and hide secondary detail until you ask for it.", changeSummary: "Detail level → Simple" };
  }
  if (/more detail|show me more|advanced view/.test(text)) {
    return { patch: { detailLevel: "detailed" }, reply: "Done. I’ll show previous performance, more target context, and more of the reasoning without changing the plan itself.", changeSummary: "Detail level → Detailed" };
  }
  if (/add meal prep|show meal prep|prep tab|grocery/.test(text)) {
    return { patch: { showPrep: true }, reply: "Added grocery and prep support to Eat. I kept it secondary so it does not clutter the daily experience.", changeSummary: "Meal prep enabled" };
  }
  if (/hide meal prep|remove meal prep/.test(text)) {
    return { patch: { showPrep: false }, reply: "Meal prep is hidden again. Your meals and preferences are unchanged.", changeSummary: "Meal prep hidden" };
  }

  const portionMatch = text.match(/(?:make|set)\s+(?:my\s+)?(breakfast|lunch|dinner|snack|meal\s*[1-5]).*?(smaller|standard|larger|bigger)/i);
  if (portionMatch) {
    const slot = portionMatch[1].replace(/\s+/g, " ").toLowerCase();
    const requestedPortion = portionMatch[2].toLowerCase() === "bigger" ? "larger" : portionMatch[2].toLowerCase();
    const meals = buildDayMeals(state, calories, protein);
    const indexMatch = slot.match(/meal\s*([1-5])/);
    const meal = indexMatch
      ? meals[Number(indexMatch[1]) - 1]
      : meals.find((item) => item.slot.toLowerCase() === slot || item.meal.type.toLowerCase() === slot);
    if (!meal) {
      return { patch: {}, reply: `I can change that portion, but I do not currently have a ${slot} in today’s plan.`, clarification: "meal-slot" };
    }
    return {
      patch: { mealPortionOverrides: { ...state.mealPortionOverrides, [meal.sourceMealId]: requestedPortion as "smaller" | "standard" | "larger" } },
      reply: `Done. I made ${meal.slot.toLowerCase()} ${requestedPortion}. The meal nutrition is recalculated from the stored ingredient data.`,
      changeSummary: `${meal.slot} portion → ${requestedPortion}`,
    };
  }

  const hateExercise = text.match(/(?:i hate|i dislike|remove|no more)\s+([a-z][a-z\s-]{2,30})(?:\.|$)/i);
  if (hateExercise && /lunge|squat|press|row|deadlift|curl|exercise/.test(hateExercise[1])) {
    const exercise = hateExercise[1].replace(/exercise[s]?/g, "").trim();
    const label = titleCase(exercise);
    return {
      patch: { dislikedExercises: unique([...state.dislikedExercises, exercise]) },
      reply: `Got it. ${label} is out of future plans, and the workout builder will use the closest safe pattern that fits your equipment instead.`,
      changeSummary: `Removed exercise preference → ${label}`,
    };
  }


  if (/different meals|new meals|something else to eat|change up (?:my )?meals|rotate (?:my )?meals/.test(text)) {
    return {
      patch: { mealRotation: state.mealRotation + 1, swappedMealIds: {} },
      reply: "Done. I rotated the day toward a different set of high-ranked meals while keeping your targets, hard exclusions, and positive preferences intact.",
      changeSummary: "Meal options refreshed",
    };
  }

  const requestedFood = text.match(/(?:i want|i'd like|id like|give me|add)\s+(.+?)(?:\s+(?:more often|for my meals|to my meals))?(?:\.|$)/i);
  if (requestedFood && /eat|food|meal|pasta|taco|salmon|chicken|turkey|steak|rice|bowl|wrap|sandwich|smoothie|oat|yogurt|egg|burger|shrimp|fish|potato/.test(text)) {
    const values = requestedFood[1]
      .replace(/\b(?:to eat|for dinner|for lunch|for breakfast)\b/gi, "")
      .split(/,|\band\b/i)
      .map((item) => titleCase(item.replace(/\b(?:more|often|please)\b/gi, "").trim()))
      .filter((item) => item.length > 1 && item.length < 60);
    if (values.length) {
      return {
        patch: { foodRequests: unique([...state.foodRequests, ...values]), mealRotation: state.mealRotation + 1 },
        reply: `Added ${values.join(" + ")} to what you actively want to eat. Matching meals now get the strongest ranking boost, and I rotated the day so you can see a different set immediately.`,
        changeSummary: `Food direction → ${values.join(" + ")}`,
      };
    }
  }

  const loveFood = text.match(/(?:i love|i like|i want more|give me more)\s+([a-z][a-z\s-]{2,30})(?:\.|$)/i);
  if (loveFood && !/detail|time|exercise/.test(loveFood[1])) {
    const food = titleCase(loveFood[1].replace(/food|meals?/g, "").trim());
    return {
      patch: { likedFoods: unique([...state.likedFoods, food]) },
      reply: `Added ${food} as a positive preference. Meals that match it will rank higher; it is not a rule you have to eat every day.`,
      changeSummary: `Food preference added → ${food}`,
    };
  }

  const dislikeFood = text.match(/(?:i hate|i dislike|don't like|do not like)\s+([a-z][a-z\s-]{2,30})(?:\.|$)/i);
  if (dislikeFood) {
    const food = titleCase(dislikeFood[1].replace(/food|meals?/g, "").trim());
    return {
      patch: { dislikes: unique([...state.dislikes, food]) },
      reply: `Got it. ${food} will rank lower in meal suggestions. I did not make it a hard exclusion in case a mixed dish still works for you.`,
      changeSummary: `Dislike added → ${food}`,
    };
  }

  const hardExclude = text.match(/(?:allergic to|never give me|exclude)\s+([a-z][a-z\s-]{2,30})(?:\.|$)/i);
  if (hardExclude) {
    const food = titleCase(hardExclude[1].trim());
    const allergy = text.includes("allergic");
    return {
      patch: allergy
        ? { allergies: unique([...state.allergies, food]) }
        : { neverFoods: unique([...state.neverFoods, food]) },
      reply: `${food} is now a hard exclusion. Meals containing it are mechanically removed rather than merely ranked lower.`,
      changeSummary: `Hard exclusion → ${food}`,
    };
  }

  if (/cheaper|budget meals|spend less/.test(text)) {
    return { patch: { budget: "low" }, reply: "Done. Lower-cost meals now rank higher, while your nutrition targets stay the same.", changeSummary: "Meal budget → Lower cost" };
  }
  const cooking = text.match(/(?:under|less than|max(?:imum)?|only)\s+(5|10|15|20|25|30)\s*(?:min|minute)/i);
  if (cooking && /cook|meal|food|prep/.test(text)) {
    const minutes = Number(cooking[1]);
    return { patch: { cookingMinutes: minutes }, reply: `Done. Meals that fit within about ${minutes} minutes now rank higher.`, changeSummary: `Cooking limit → ${minutes} min` };
  }

  if (text.includes("pasta")) {
    return { patch: { likedFoods: unique([...state.likedFoods, "Pasta"]) }, reply: "Added pasta as a positive preference. Pasta meals will rank higher instead of being treated like something you have to earn.", changeSummary: "Food preference added → Pasta" };
  }
  if (text.includes("swap chicken for turkey") || text.includes("replace chicken with turkey")) {
    return { patch: { likedFoods: unique([...state.likedFoods.filter((item) => item.toLowerCase() !== "chicken"), "Turkey"]) }, reply: "I shifted the meal preference from chicken toward turkey. The meal planner will choose the turkey versions where they fit and recalculate from the stored meal data.", changeSummary: "Chicken preference → Turkey" };
  }

  if (/change what i want to eat|change my food|meals are wrong|don't like my meals/.test(text)) {
    return {
      patch: {},
      reply: "I can fix that without rebuilding everything blindly. What is wrong with the meals: the actual foods, the cuisines, cooking time, cost, or portion size?",
      clarification: "food-preferences",
    };
  }

  if (/injury|pain|chest pain|dizzy|dizziness|faint|shortness of breath/.test(text)) {
    return {
      patch: {},
      reply: "That sounds like a safety question rather than a normal plan tweak. I will not diagnose it or push through concerning symptoms. Use appropriate medical guidance before changing training around that issue.",
      clarification: "safety",
    };
  }


  const generalAnswer = answerGeneralCoachQuestion(raw, state, currentTargets(state));
  if (generalAnswer) {
    return { patch: {}, reply: generalAnswer };
  }

  return {
    patch: {},
    reply: permanent || todayOnly
      ? "I understand the direction, but I need one detail before I change the plan. What exactly do you want me to change?"
      : "I understand what you are trying to change. Is that just for today, or should I update your ongoing plan?",
    clarification: "scope",
  };
}
