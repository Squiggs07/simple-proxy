import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  context: z.object({
    goal: z.string().max(40),
    age: z.number().min(13).max(100),
    calories: z.number().int().positive(),
    protein: z.number().int().positive(),
    trainingDays: z.number().int().min(1).max(7),
    sessionMinutes: z.number().int().min(10).max(120),
    equipment: z.string().max(40),
    experience: z.string().max(40),
    confidence: z.string().max(40),
    likedFoods: z.array(z.string().max(80)).max(20),
    dislikes: z.array(z.string().max(80)).max(20),
    allergies: z.array(z.string().max(80)).max(20),
    healthFlags: z.array(z.string().max(120)).max(10),
    hideCalories: z.boolean(),
  }),
});

const responseSchema = z.object({
  canonicalCommand: z.string().trim().min(1).max(500),
});

const canonicalExamples = [
  "I want to do a lean bulk and minimize fat gain",
  "increase my calories by 150",
  "decrease my calories by 100",
  "set my calories to 2400",
  "increase my protein by 10",
  "set my protein to 180",
  "from now on I can train 3 days for 30 minutes",
  "I only have 20 minutes and no equipment today",
  "from now on I train at home",
  "hide calories",
  "show calories",
  "make the app simpler",
  "show me more detail",
  "add meal prep",
  "hide meal prep",
  "I hate lunges",
  "I like pasta",
  "I dislike mushrooms",
  "I am allergic to peanuts",
  "never give me tuna",
  "make my meals cheaper",
  "keep meal prep under 10 minutes",
  "swap chicken for turkey",
  "change what I want to eat",
  "make lunch smaller",
  "make dinner larger",
  "I want to lose fat",
  "I want to maintain my weight",
  "I want to feel stronger",
];

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: "invalid_request" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ available: false, reason: "not_configured" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const context = JSON.stringify(parsed.data.context);
    const examples = canonicalExamples.map((item) => `- ${item}`).join("\n");

    const response = await client.messages.create({
      model,
      max_tokens: 300,
      temperature: 0,
      system: `You are the semantic normalization layer for a consumer fitness and nutrition app called Start Here. Your only job is to translate the user's natural language into one concise canonical command that the app's deterministic action engine can understand. You never calculate or invent calories, protein, macros, food nutrition, diagnoses, workout loads, or outcome guarantees. You never bypass safety rules. You do not directly mutate app state. Preserve whether a request is today-only versus ongoing. If a request mentions concerning symptoms or a medical issue, preserve that wording so the deterministic safety route can handle it. Return only valid JSON with one key: canonicalCommand. Do not add markdown.\n\nExamples of useful canonical command forms:\n${examples}`,
      messages: [
        {
          role: "user",
          content: `Current compact context: ${context}\n\nUser request: ${parsed.data.message}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ available: false, reason: "empty_response" });
    }

    const clean = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const normalized = responseSchema.safeParse(JSON.parse(clean));
    if (!normalized.success) {
      return NextResponse.json({ available: false, reason: "invalid_model_response" });
    }

    return NextResponse.json({ available: true, canonicalCommand: normalized.data.canonicalCommand });
  } catch {
    return NextResponse.json({ available: false, reason: "provider_error" });
  }
}
