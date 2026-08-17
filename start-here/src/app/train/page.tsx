import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { buildWorkoutProgram, type TrainingEquipment, type TrainingExperience } from "@/lib/workouts";

export default async function TrainPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/onboarding");

  const program = buildWorkoutProgram({
    daysPerWeek: profile.trainingDays,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment as TrainingEquipment,
    experience: profile.experienceLevel as TrainingExperience,
    confidence: profile.confidenceLevel,
    age: profile.age,
  });
  const today = program[0];

  return (
    <main className="start-page min-h-[100dvh] pb-24">
      <div className="start-shell">
        <header className="pt-1">
          <p className="start-eyebrow">Your training</p>
          <h1 className="mt-2 text-[2.35rem] leading-none font-semibold tracking-[-0.055em] text-[var(--ink)]">Train</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A clear strength plan built around the time, equipment, and confidence level you chose.</p>
        </header>

        {today ? (
          <section className="mt-7 overflow-hidden rounded-[1.55rem] bg-[var(--evergreen)] p-5 text-white shadow-[0_14px_34px_rgba(23,72,63,.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#bed8cf] uppercase">Today’s workout</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{today.name}</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#e4efeb]">~{today.minutes} min</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#d7e5e0]">{today.purpose}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="min-h-12 rounded-2xl bg-[var(--butter)] px-5 text-sm font-bold text-[var(--evergreen-dark)]">Start workout</button>
              <button type="button" className="min-h-12 rounded-2xl border border-white/20 bg-white/5 px-4 text-sm font-bold text-white">Make this shorter</button>
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="start-eyebrow">Today</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">What you’ll do</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--muted)]">{today?.exercises.length ?? 0} exercises</span>
          </div>
          <div className="mt-3 grid gap-2.5">
            {today?.exercises.map((exercise, index) => (
              <article key={exercise.id} className="start-card p-4">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--sage)] text-sm font-extrabold text-[var(--evergreen-dark)]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold tracking-[-0.015em] text-[var(--ink)]">{exercise.name}</h3>
                      <span className="shrink-0 rounded-full bg-[var(--surface-warm)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--muted)]">{exercise.sets} × {exercise.repRange}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">{exercise.cue}</p>
                    <div className="mt-3 flex gap-4 text-xs font-semibold text-[var(--sage-strong)]">
                      <button type="button">How to do this</button>
                      <button type="button">Swap</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="start-card mt-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="start-eyebrow">This week</p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">{profile.trainingDays} sessions that fit your schedule</h2>
              <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">You do not need advanced programming to make progress. The plan repeats the important movement patterns and gives you room to improve them.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {program.map((day, index) => (
              <div key={day.id} className="flex min-h-12 items-center justify-between rounded-2xl bg-[var(--surface-warm)] px-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Day {index + 1} · {day.name}</p>
                  <p className="text-xs text-[var(--muted)]">{day.exercises.length} exercises · ~{day.minutes} min</p>
                </div>
                <span aria-hidden className="text-lg text-[#b9bfbc]">›</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.3rem] bg-[var(--butter)]/45 p-4">
          <p className="font-semibold text-[var(--evergreen-dark)]">Today got complicated?</p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Coach will be able to shorten only today’s session, change equipment, or swap movements without rewriting your whole program.</p>
        </section>
      </div>
      <AppNav active="train" />
    </main>
  );
}
