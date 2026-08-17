import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { serializeExclusions } from "@/lib/exclusions";
import { computeMacroTargets } from "@/lib/macros";

const onboardingSchema = z.object({
  goal: z.enum(["lose_fat", "build_muscle", "recomp", "healthy_habits"]),
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
  exclusions: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  mealPriority: z
    .enum(["precision", "simple", "variety", "balanced"])
    .default("balanced"),
  units: z.enum(["metric", "imperial"]).default("imperial"),
});

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

  const { exclusions, mealPriority, units, ...macroInputs } = parsed.data;
  const targets = computeMacroTargets(macroInputs);

  const userId = session.user.id;
  const profileData = {
    ...macroInputs,
    exclusions: serializeExclusions(exclusions),
    mealPriority,
    units,
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

  return NextResponse.json({ ok: true });
}
