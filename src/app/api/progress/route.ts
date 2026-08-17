import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  addDays,
  computeTrend,
  monthlySummaries,
  weekOutlook,
  weeklyTrendChange,
  type DayLog,
} from "@/lib/progress";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(request.url);
  const today =
    url.searchParams.get("today")?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] ??
    new Date().toISOString().slice(0, 10);

  const [profile, target, weighIns, plans] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.macroTarget.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
    prisma.weighIn.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.mealPlan.findMany({
      where: { userId, date: { gte: addDays(today, -180) } },
      include: { meals: true },
    }),
  ]);

  const days: DayLog[] = plans
    .map((plan) => ({
      date: plan.date,
      mealsPlanned: plan.meals.length,
      mealsEaten: plan.meals.filter((m) => m.eatenAt).length,
      plannedKcal: plan.meals.reduce((s, m) => s + m.kcal, 0),
      eatenKcal: plan.meals
        .filter((m) => m.eatenAt)
        .reduce((s, m) => s + m.kcal, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const trend = computeTrend(weighIns);
  const latest = trend[trend.length - 1] ?? null;
  const lastWeighDate = latest?.date ?? null;

  return NextResponse.json({
    units: profile?.units ?? "imperial",
    target: target
      ? { calories: target.calories, proteinG: target.proteinG }
      : null,
    profileWeightKg: profile?.weightKg ?? null,
    trend: trend.filter((p) => p.date >= addDays(today, -90)),
    latestTrendKg: latest?.trendKg ?? null,
    weeklyChangeKg: weeklyTrendChange(trend),
    week: weekOutlook(today, days, weighIns),
    months: monthlySummaries(trend, days),
    needsWeighIn: !lastWeighDate || diffInDays(today, lastWeighDate) >= 7,
    days: days.filter((d) => d.date >= addDays(today, -30)),
  });
}

function diffInDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );
}
