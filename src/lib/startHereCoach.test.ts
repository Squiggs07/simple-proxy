import { describe, expect, it } from "vitest";
import { applyCoachFoodLog, interpretCoachRequest } from "@/lib/startHereCoach";
import { buildDayMeals, currentTargets } from "@/lib/startHerePlan";
import { INITIAL_STATE } from "@/lib/startHereModels";

describe("Start Here Coach action layer", () => {
  it("treats lean bulk as cautious muscle gain", () => {
    const result = interpretCoachRequest("I want to do a lean bulk and not gain much fat", INITIAL_STATE);
    expect(result.patch.goal).toBe("gain");
    expect(result.patch.calorieOverride).toBeTypeOf("number");
    expect(result.reply.toLowerCase()).toContain("zero fat gain cannot be guaranteed");
  });

  it("can directly change the goal and rebuild deterministic targets", () => {
    const result = interpretCoachRequest("I want to lose fat", INITIAL_STATE);
    expect(result.patch.goal).toBe("lose");
    expect(result.patch.calorieOverride).toBeTypeOf("number");
    expect(result.patch.proteinOverride).toBeTypeOf("number");
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

  it("changes ongoing equipment instead of creating a today-only override", () => {
    const result = interpretCoachRequest("From now on I train at home", INITIAL_STATE);
    expect(result.patch.equipment).toBe("home");
    expect(result.patch.todayOverride).toEqual({ minutes: null, equipment: null, note: null });
  });

  it("changes a named meal portion through deterministic meal state", () => {
    const targets = currentTargets(INITIAL_STATE);
    const lunch = buildDayMeals(INITIAL_STATE, targets.calories, targets.proteinGrams).find((item) => item.meal.type === "Lunch");
    expect(lunch).toBeDefined();
    const result = interpretCoachRequest("make lunch smaller", INITIAL_STATE);
    expect(result.patch.mealPortionOverrides?.[lunch!.sourceMealId]).toBe("smaller");
  });

  it("does not mistake meal prep time for a temporary workout duration", () => {
    const result = interpretCoachRequest("keep meal prep under 10 minutes", INITIAL_STATE);
    expect(result.patch.cookingMinutes).toBe(10);
    expect(result.patch.todayOverride).toBeUndefined();
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

  it("can rotate to genuinely different meals from normal language", () => {
    const state = { ...INITIAL_STATE, mealRotation: 2, swappedMealIds: { "chicken-rice-bowl": "turkey-rice-bowl" } };
    const result = interpretCoachRequest("Give me different meals", state);
    expect(result.patch.mealRotation).toBe(3);
    expect(result.patch.swappedMealIds).toEqual({});
  });

  it("captures foods the user actively wants to eat", () => {
    const result = interpretCoachRequest("I want tacos and salmon more often", { ...INITIAL_STATE, foodRequests: [] });
    const requests = result.patch.foodRequests ?? [];
    expect(requests.some((item) => item.toLowerCase().includes("taco"))).toBe(true);
    expect(requests.some((item) => item.toLowerCase().includes("salmon"))).toBe(true);
    expect(result.patch.mealRotation).toBeTypeOf("number");
  });

  it("answers normal training questions without pretending a plan change happened", () => {
    const result = interpretCoachRequest("How long should I rest between sets?", INITIAL_STATE);
    expect(Object.keys(result.patch)).toHaveLength(0);
    expect(result.reply.toLowerCase()).toContain("2–3 minutes");
  });

  it("answers common nutrition timing questions without changing app state", () => {
    const result = interpretCoachRequest("What should I eat before lifting?", INITIAL_STATE);
    expect(Object.keys(result.patch)).toHaveLength(0);
    expect(result.reply.toLowerCase()).toContain("carbs");
    expect(result.reply.toLowerCase()).toContain("protein");
  });

  it("logs a verified restaurant item for today without changing ongoing targets", () => {
    const state = { ...INITIAL_STATE, currentDay: "2026-08-20", externalFoodLogs: [] };
    const result = interpretCoachRequest("I just ate a large fry from Chick-fil-A. Add that into my daily macros.", state);
    const log = result.patch.externalFoodLogs?.[0];

    expect(log).toMatchObject({
      date: "2026-08-20",
      name: "Large Chick-fil-A Waffle Potato Fries",
      calories: 600,
      protein: 7,
      source: "verified",
    });
    expect(result.patch.calorieOverride).toBeUndefined();
    expect(result.patch.proteinOverride).toBeUndefined();
    expect(result.reply.toLowerCase()).toContain("logged");
  });

  it("uses recent conversation when the user clarifies that a food log is just for today", () => {
    const state = {
      ...INITIAL_STATE,
      currentDay: "2026-08-20",
      externalFoodLogs: [],
      coachHistory: [
        ...INITIAL_STATE.coachHistory,
        { id: "food-request", role: "user" as const, text: "I ate a large Chick-fil-A fry. Can you add it to my macros?", createdAt: "2026-08-20T18:00:00.000Z" },
      ],
    };
    const result = interpretCoachRequest("just today", state);

    expect(result.patch.externalFoodLogs?.[0]?.catalogId).toBe("chick-fil-a-large-waffle-fries");
    expect(result.patch.calorieOverride).toBeUndefined();
  });

  it("logs an uncatalogued food only from nutrition numbers the user supplied", () => {
    const state = { ...INITIAL_STATE, currentDay: "2026-08-20", externalFoodLogs: [] };
    const result = interpretCoachRequest("log food today: restaurant chicken bowl | 620 cal | 42g protein", state);

    expect(result.patch.externalFoodLogs?.[0]).toMatchObject({
      name: "restaurant chicken bowl",
      calories: 620,
      protein: 42,
      source: "user",
    });
  });

  it("can log an arbitrary meal estimate without changing the ongoing plan", () => {
    const state = { ...INITIAL_STATE, currentDay: "2026-08-20", externalFoodLogs: [] };
    const result = applyCoachFoodLog({
      name: "Chicken burrito bowl with rice, beans, cheese, and guacamole",
      calories: 850,
      protein: 48,
      source: "estimated",
      sourceLabel: "Coach estimate — adjust or remove anytime",
      catalogId: null,
      calorieRange: { min: 700, max: 1000 },
      proteinRange: { min: 38, max: 58 },
    }, state);

    expect(result.patch.externalFoodLogs?.[0]).toMatchObject({
      date: "2026-08-20",
      name: "Chicken burrito bowl with rice, beans, cheese, and guacamole",
      calories: 850,
      protein: 48,
      source: "estimated",
      calorieRange: { min: 700, max: 1000 },
    });
    expect(result.patch.calorieOverride).toBeUndefined();
    expect(result.patch.proteinOverride).toBeUndefined();
    expect(result.reply).toContain("Coach estimate");
    expect(result.reply).toContain("ongoing targets and future plan did not change");
  });
});
