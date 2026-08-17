import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeMacroTargets, type MacroInputs } from "@/lib/macros";
import { computeTrend, shouldRecomputeTarget } from "@/lib/progress";
import { lbsToKg } from "@/lib/units";

const weighInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive(),
  units: z.enum(["metric", "imperial"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = weighInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That weight doesn't look right." }, { status: 400 });
  }

  const weightKg =
    parsed.data.units === "imperial" ? lbsToKg(parsed.data.weight) : parsed.data.weight;
  if (weightKg < 30 || weightKg > 300) {
    return NextResponse.json(
      { error: "That weight doesn't look right — mind double-checking it?" },
      { status: 400 },
    );
  }

  await prisma.weighIn.upsert({
    where: { userId_date: { userId, date: parsed.data.date } },
    create: { userId, date: parsed.data.date, weightKg },
    update: { weightKg },
  });

  // Gently recompute targets off the smoothed trend — never a single reading.
  const profile = await prisma.profile.findUnique({ where: { userId } });
  let recomputed = false;
  let newCalories: number | null = null;
  if (profile) {
    const weighIns = await prisma.weighIn.findMany({ where: { userId } });
    const trend = computeTrend(weighIns);
    const latestTrendKg = trend[trend.length - 1]?.trendKg;

    if (latestTrendKg && shouldRecomputeTarget(profile.weightKg, latestTrendKg)) {
      const inputs: MacroInputs = {
        goal: profile.goal as MacroInputs["goal"],
        sexAtBirth: profile.sexAtBirth as MacroInputs["sexAtBirth"],
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: latestTrendKg,
        activityLevel: profile.activityLevel as MacroInputs["activityLevel"],
      };
      const targets = computeMacroTargets(inputs);

      await prisma.$transaction([
        prisma.profile.update({
          where: { userId },
          data: { weightKg: latestTrendKg },
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
            inputs: JSON.stringify(inputs),
          },
        }),
      ]);
      recomputed = true;
      newCalories = targets.calories;
    }
  }

  return NextResponse.json({ ok: true, recomputed, newCalories });
}
