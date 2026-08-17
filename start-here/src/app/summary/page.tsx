import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Goal, SafetyFlag } from "@/lib/macros";
import { AppNav } from "@/components/AppNav";

const GOAL_LABEL: Record<Goal, string> = {
  lose_fat: "Lose fat and keep muscle",
  build_muscle: "Build muscle gradually",
  recomp: "Recompose",
  healthy_habits: "Feel healthier",
  feel_stronger: "Feel stronger and healthier",
  maintain: "Maintain my weight",
  unsure: "Build a healthy starting point",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function SummaryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;
  const [profile, target, todayPlan] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.macroTarget.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
    prisma.mealPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { meals: true },
    }),
  ]);

  if (!profile || !target) redirect("/onboarding");

  const flags = JSON.parse(target.flags) as SafetyFlag[];
  const goal = profile.goal as Goal;
  const nextMeal = todayPlan?.meals.find((meal) => !meal.eatenAt) ?? todayPlan?.meals[0];
  const completedMeals = todayPlan?.meals.filter((meal) => Boolean(meal.eatenAt)).length ?? 0;
  const totalMeals = todayPlan?.meals.length ?? profile.mealsPerDay;

  return (
    <main className="start-page min-h-[100dvh] pb-24">
      <div className="start-shell">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-semibold text-[var(--sage-strong)]">
              {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}
            </p>
            <h1 className="mt-1 text-[2.15rem] leading-none font-semibold tracking-[-0.05em] text-[var(--ink)]">
              {greeting()}
            </h1>
            <p className="mt-2 text-sm leading-5 text-[var(--muted)]">Here is your manageable plan for today.</p>
          </div>
          <Link
            href="/onboarding"
            aria-label="Profile and plan settings"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-white text-sm font-bold text-[var(--evergreen-dark)] shadow-[var(--shadow-card)]"
          >
            You
          </Link>
        </header>

        <section className="mt-7 overflow-hidden rounded-[1.55rem] bg-[var(--evergreen)] p-5 text-white shadow-[0_14px_34px_rgba(23,72,63,.18)]">
          <p className="text-xs font-bold tracking-[0.12em] text-[#bed8cf] uppercase">Your next useful step</p>
          <h2 className="mt-3 text-[1.55rem] leading-7 font-semibold tracking-[-0.035em]">
            {todayPlan ? "Keep food simple today." : "Build today’s meals."}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#d7e5e0]">
            {todayPlan
              ? `${completedMeals} of ${totalMeals} planned meals logged. You do not need a perfect day — just a useful next choice.`
              : "We’ll turn your targets and preferences into a practical day of meals with verified nutrition underneath."}
          </p>
          <Link href="/plan" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--butter)] px-5 text-sm font-bold text-[var(--evergreen-dark)]">
            {todayPlan ? "See my next meal" : "Build today’s meals"}
            <span aria-hidden className="ml-2">→</span>
          </Link>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="start-card p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">Daily food</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{target.calories.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">starting estimate</p>
          </div>
          <div className="start-card p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">Protein</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-[var(--evergreen)]">{target.proteinG}g</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">supports your goal</p>
          </div>
        </section>

        <section className="start-card mt-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="start-eyebrow">Your direction</p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">{GOAL_LABEL[goal]}</h2>
              <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">
                {profile.trainingDays} training days · about {profile.sessionMinutes} minutes · {profile.equipment === "gym" ? "full gym" : profile.equipment}
              </p>
            </div>
            <span className="rounded-full bg-[var(--sage)] px-3 py-1.5 text-xs font-bold text-[var(--evergreen-dark)]">
              Starting plan
            </span>
          </div>
        </section>

        {nextMeal ? (
          <section className="start-card mt-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="start-eyebrow">Next meal</p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">{nextMeal.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{nextMeal.proteinG.toFixed(0)}g protein · {nextMeal.kcal} calories</p>
              </div>
              <Link href="/plan" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--sage)] font-bold text-[var(--evergreen-dark)]" aria-label="Open meal plan">→</Link>
            </div>
          </section>
        ) : null}

        <section className="start-card mt-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="start-eyebrow">Training</p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">Your strength plan is next.</h2>
              <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">We’ll build sessions around the time, equipment, and confidence level you chose.</p>
            </div>
            <Link href="/train" className="shrink-0 rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--evergreen-dark)]">Train</Link>
          </div>
        </section>

        <section className="mt-4 rounded-[1.3rem] bg-[var(--butter)]/45 p-4">
          <p className="font-semibold text-[var(--evergreen-dark)]">Something doesn’t fit?</p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Tell Coach in normal words. Meals, workouts, schedule, and targets should adapt to you.</p>
          <Link href="/coach" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--evergreen-dark)]">Talk to Coach →</Link>
        </section>

        {flags.length ? (
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Your starting target includes one or more built-in safety adjustments. Start Here never removes those safeguards through AI or manual requests.
          </p>
        ) : null}
      </div>
      <AppNav active="today" />
    </main>
  );
}
