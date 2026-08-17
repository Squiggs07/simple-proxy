import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { serializeExclusions } from "@/lib/exclusions";
import { computeMacroTargets } from "@/lib/macros";

const shortString = z.string().trim().min(1).max(80);
const stringList = z.array(shortString).max(30).default([]);

const onboardingSchema = z.object({
  goal: z.enum([
    "lose_fat",
    "build_muscle",
    "recomp",
    "healthy_habits",
    "feel_stronger",
    "maintain",
    "unsure",
  ]),
  sexAtBirth: z.enum(["male", "female"]),
  age: z.number().int().min(13).max(100),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  activityLevel: z.enum([
    "mostly_sitting",
    "on_feet_some",
    "on_feet_lots",
    "hard_physical",
  ]),
  exclusions: stringList,
  mealPriority: z
    .enum(["precision", "simple", "variety", "balanced"])
    .default("balanced"),
  units: z.enum(["metric", "imperial"]).default("imperial"),

  trainingDays: z.number().int().min(1).max(6).default(3),
  sessionMinutes: z.number().int().min(15).max(120).default(45),
  equipment: z
    .enum(["gym", "dumbbells", "home", "mixed", "unsure"])
    .default("gym"),
  experienceLevel: z
    .enum(["beginner", "returning", "comfortable", "experienced"])
    .default("beginner"),
  confidenceLevel: z
    .enum(["nervous", "unsure", "okay", "confident"])
    .default("unsure"),

  likedFoods: stringList,
  preferredCuisines: stringList,
  mealFormats: stringList,
  dislikes: stringList,
  neverFoods: stringList,
  allergies: stringList,
  dietType: z.enum(["none", "vegetarian", "vegan"]).default("none"),
  breakfastStyle: z
    .enum(["savory", "sweet", "either", "skip"])
    .default("either"),
  cookingMinutes: z.number().int().min(0).max(120).default(20),
  budgetLevel: z.enum(["lower", "moderate", "flexible"]).default("moderate"),
  varietyPreference: z
    .enum(["repeat", "some", "variety"])
    .default("some"),
  mealsPerDay: z.number().int().min(2).max(6).default(4),
  healthFlags: stringList,
});

function json(values: string[]) {
  return JSON.stringify(values);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const {
    exclusions,
    mealPriority,
    units,
    trainingDays,
    sessionMinutes,
    equipment,
    experienceLevel,
    confidenceLevel,
    likedFoods,
    preferredCuisines,
    mealFormats,
    dislikes,
    neverFoods,
    allergies,
    dietType,
    breakfastStyle,
    cookingMinutes,
    budgetLevel,
    varietyPreference,
    mealsPerDay,
    healthFlags,
    ...macroInputs
  } = parsed.data;

  const targets = computeMacroTargets(macroInputs);
  const userId = session.user.id;

  // Keep the current verified meal engine compatible: dietary identity,
  // allergies and never-use foods become mechanical exclusions. Ordinary
  // dislikes do not — they are ranking signals, not safety rules.
  const hardExclusions = [
    ...exclusions,
    ...neverFoods,
    ...allergies,
    ...(dietType === "vegetarian" ? ["Vegetarian"] : []),
    ...(dietType === "vegan" ? ["Vegan"] : []),
  ];

  const profileData = {
    ...macroInputs,
    exclusions: serializeExclusions([...new Set(hardExclusions)]),
    mealPriority,
    units,
    trainingDays,
    sessionMinutes,
    equipment,
    experienceLevel,
    confidenceLevel,
    likedFoods: json(likedFoods),
    preferredCuisines: json(preferredCuisines),
    mealFormats: json(mealFormats),
    dislikes: json(dislikes),
    neverFoods: json(neverFoods),
    allergies: json(allergies),
    dietType,
    breakfastStyle,
    cookingMinutes,
    budgetLevel,
    varietyPreference,
    mealsPerDay,
    healthFlags: json(healthFlags),
  };

  await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    }),
    prisma.macroTarget.create({
      data: {
        userId,
        calories: targets.calories,
        proteinG: targets.proteinG,
        carbsG: targets.carbsG,
        fatG: targets.fatG,
        maintenanceCalories: targets.maintenanceCalories,
        planType: targets.planType,
        flags: JSON.stringify(targets.flags),
        inputs: JSON.stringify(macroInputs),
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    targets,
  });
}
