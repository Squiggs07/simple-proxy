import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const baselineSchema = z.object({
  benchKg: z.number().nullable(),
  squatKg: z.number().nullable(),
  deadliftKg: z.number().nullable(),
  pushups: z.number().nullable(),
  note: z.string().max(300),
});

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1800),
  context: z.object({
    goal: z.string().max(40),
    age: z.number().min(13).max(100),
    calories: z.number().int().positive(),
    maintenanceCalories: z.number().int().positive(),
    protein: z.number().int().positive(),
    proteinRange: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    trainingDays: z.number().int().min(1).max(7),
    sessionMinutes: z.number().int().min(10).max(120),
    equipment: z.string().max(40),
    experience: z.string().max(40),
    confidence: z.string().max(40),
    liftingHistory: z.string().max(40),
    liftingBaseline: baselineSchema,
    likedFoods: z.array(z.string().max(80)).max(20),
    foodRequests: z.array(z.string().max(100)).max(20),
    cuisines: z.array(z.string().max(80)).max(10),
    mealFormats: z.array(z.string().max(80)).max(10),
    dislikes: z.array(z.string().max(80)).max(20),
    allergies: z.array(z.string().max(80)).max(20),
    dietType: z.string().max(40),
    cookingMinutes: z.number().int().min(0).max(180),
    budget: z.string().max(40),
    healthFlags: z.array(z.string().max(120)).max(10),
    hideCalories: z.boolean(),
    readiness: z.enum(["low", "normal", "high"]).nullable(),
    workoutAdherence: z.number().min(0).max(1.5).nullable(),
    mealAdherence: z.number().min(0).max(1).nullable(),
    readinessLowRate: z.number().min(0).max(1).nullable(),
    learnedBehavior: z.array(z.string().max(180)).max(6),
    trainingSchedule: z.array(z.string().max(3)).max(6),
    todayScheduled: z.boolean(),
    todayTrainingComplete: z.boolean(),
    nextTrainingDate: z.string().max(10),
    nextTrainingName: z.string().max(80).nullable(),
    weekTrainingCompleted: z.number().int().min(0).max(7),
    weekTrainingPlanned: z.number().int().min(0).max(6),
    weekScheduleAdjustments: z.array(z.string().max(180)).max(6),
    todayMeals: z.array(z.object({
      name: z.string().max(120),
      calories: z.number().int().nonnegative(),
      protein: z.number().int().nonnegative(),
      logged: z.boolean(),
    })).max(5),
    loggedCalories: z.number().int().nonnegative(),
    loggedProtein: z.number().int().nonnegative(),
    remainingCalories: z.number().int().nonnegative(),
    remainingProtein: z.number().int().nonnegative(),
  }),
  history: z.array(z.object({ role: z.enum(["user", "coach"]), text: z.string().max(1800) })).max(6).default([]),
});

const responseSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  canonicalCommand: z.string().trim().max(600).nullable(),
});

const canonicalExamples = [
  "I want to do a lean bulk and minimize fat gain",
  "increase my calories by 150",
  "set my protein to 180",
  "from now on I can train 3 days for 30 minutes",
  "move today's workout to tomorrow this week",
  "move Friday's workout to Saturday this week",
  "skip Friday's workout this week",
  "from now on train Saturday instead of Friday every week",
  "restore my normal schedule this week",
  "I only have 20 minutes and no equipment today",
  "from now on I train at home",
  "hide calories",
  "make the app simpler",
  "I hate lunges",
  "I like pasta",
  "I want tacos and salmon more often",
  "give me different meals",
  "I dislike mushrooms",
  "I am allergic to peanuts",
  "make my meals cheaper",
  "keep meal prep under 10 minutes",
  "make lunch smaller",
  "I want to lose fat",
];

function requesterKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

export async function POST(request: Request) {
  if (!rateLimit(`coach:${requesterKey(request)}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json({ available: false, reason: "rate_limited" }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: "invalid_request" }, { status: 400 });
  }

  try {
    const model = process.env.START_HERE_COACH_MODEL || "alibaba/qwen3.7-flash";
    const context = JSON.stringify(parsed.data.context);
    const history = parsed.data.history.map((item) => `${item.role === "user" ? "User" : "Coach"}: ${item.text}`).join("\n");
    const examples = canonicalExamples.map((item) => `- ${item}`).join("\n");

    const result = await generateText({
      model,
      maxOutputTokens: 700,
      temperature: 0,
      output: Output.object({ schema: responseSchema }),
      system: `You are Start Here Coach, the intelligence layer inside a consumer fitness, nutrition, recovery, and wellness app. You have two jobs at the same time:

1) ANSWER QUESTIONS. Be a genuinely useful general fitness and wellness assistant. You can explain strength training, hypertrophy, cardio, exercise technique, programming, nutrition principles, protein, meal timing, recovery, sleep, soreness, habits, common supplements, body-composition concepts, restaurant choices, and how to make a plan more realistic. Use the user's compact context when it is relevant. The context may include today's audited planned meals, which planned meals were logged, calories/protein remaining from those logs, today's readiness, recent workout and meal adherence, a multi-day low-readiness rate, the actual current-week training schedule/status, temporary weekScheduleAdjustments, and learnedBehavior derived from repeated in-app choices. Use those signals when helpful, but do not overreact to one day. Treat learnedBehavior as observed tendencies rather than permanent facts; an explicit current request always overrides an inferred preference. Be plainspoken, practical, and nuanced. Answer the question directly instead of forcing every conversation into a plan change.

2) IDENTIFY PLAN CHANGES. If the user is explicitly asking the app to change something, also return one concise canonicalCommand for the deterministic action engine. The model does NOT directly mutate state. Never claim that a plan change has already happened. Never calculate a new calorie or protein target yourself; the deterministic engine does that.

Schedule scope matters. A request caused by one conflict ("I can't train Friday", "move today's workout", "this week") should remain a temporary current-week change unless the user clearly says from now on, every week, ongoing, or otherwise makes it permanent. Preserve the source day and target day in canonicalCommand. Never silently turn one missed day into a permanent routine change.

Safety boundaries: do not diagnose conditions, interpret imaging/labs as a diagnosis, prescribe medication, or tell someone to push through concerning symptoms. For pain, injury, dizziness, chest pain, fainting, severe shortness of breath, eating-disorder concerns, pregnancy, or other medical situations, give high-level education and recommend appropriate professional care. If symptoms could be urgent, say so clearly. You may discuss common wellness topics and supplements in general terms, including evidence, tradeoffs, and common dosing ranges, while noting relevant medical cautions.

For nutrition, never invent nutrition data for a food or meal that is not in the app's audited library. For a restaurant order, use exact numbers only when the user supplied them or a verified restaurant-data result is explicitly present in context. Otherwise say that exact current nutrition needs verification, ask for the official nutrition details when helpful, and still explain how to evaluate the order using the user's provided remaining targets. The todayMeals numbers are audited in-app estimates; do not count an unlogged planned meal as already eaten. When referring to the user's current calorie/protein numbers, use only the provided context.

Keep normal answers concise. Prefer a direct answer plus the few most useful details instead of a long essay unless the user asks for depth.

Return ONLY JSON with this shape:
{"answer":"useful response to the user","canonicalCommand":null}
If an app change is requested, canonicalCommand should be a concise command the deterministic engine can understand. If it is only a question, canonicalCommand must be null.

Examples of supported change-command forms:\n${examples}`,
      prompt: `Current app context: ${context}\n\nRecent conversation:\n${history || "No prior messages."}\n\nUser message: ${parsed.data.message}`,
    });

    const normalized = result.output;

    return NextResponse.json({
      available: true,
      answer: normalized.answer,
      canonicalCommand: normalized.canonicalCommand,
      model,
    });
  } catch (error) {
    console.error("Start Here Coach gateway error", error);
    return NextResponse.json({ available: false, reason: "provider_error" });
  }
}
