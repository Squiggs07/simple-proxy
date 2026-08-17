import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function StartHereMark() {
  return (
    <span
      aria-hidden
      className="grid h-11 w-11 grid-cols-3 items-end gap-1 rounded-2xl bg-[var(--evergreen)] p-2.5 shadow-[var(--shadow-card)]"
    >
      <span className="h-2.5 rounded-full bg-[var(--butter)]" />
      <span className="h-5 rounded-full bg-[var(--butter)]" />
      <span className="h-3.5 rounded-full bg-[var(--butter)]" />
    </span>
  );
}

function PromiseRow({
  number,
  title,
  text,
  tint,
}: {
  number: string;
  title: string;
  text: string;
  tint: string;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-[1.15rem] border border-[var(--border)] bg-white/80 p-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-[var(--evergreen-dark)] ${tint}`}
      >
        {number}
      </span>
      <div>
        <p className="font-semibold tracking-[-0.015em] text-[var(--ink)]">{title}</p>
        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const target = await prisma.macroTarget.findFirst({
      where: { userId: session.user.id },
    });
    redirect(target ? "/summary" : "/onboarding");
  }

  return (
    <main className="start-page">
      <div className="start-shell flex min-h-[100dvh] flex-col">
        <header className="flex items-center gap-3 pt-1">
          <StartHereMark />
          <div>
            <p className="font-extrabold tracking-[-0.025em] text-[var(--evergreen-dark)]">
              Start Here
            </p>
            <p className="text-[0.68rem] font-bold tracking-[0.12em] text-[var(--sage-strong)] uppercase">
              Adaptive health coach
            </p>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-9 sm:py-12">
          <p className="start-eyebrow">No fitness knowledge required</p>
          <h1 className="mt-3 max-w-[9.5ch] text-[clamp(2.9rem,12vw,4.25rem)] leading-[0.94] font-semibold tracking-[-0.065em] text-[var(--ink)]">
            Your plan can be simple.
          </h1>
          <p className="mt-5 max-w-[33rem] text-[1.06rem] leading-7 text-[var(--muted)]">
            Tell us what you want to improve. We&apos;ll turn it into food and
            workouts that fit your life, then adjust as you go.
          </p>

          <div className="mt-8 grid gap-2.5">
            <PromiseRow
              number="01"
              title="Start with your goal"
              text="A few plain-language choices — no macros, splits, or jargon required."
              tint="bg-[var(--sage)]"
            />
            <PromiseRow
              number="02"
              title="Get one clear starting plan"
              text="We handle the calorie math, protein target, meals, and training structure underneath."
              tint="bg-[var(--butter)]/60"
            />
            <PromiseRow
              number="03"
              title="Change it by talking normally"
              text="If a meal, workout, schedule, or target doesn’t fit, Coach helps reshape the plan."
              tint="bg-[var(--lavender)]"
            />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/signup" className="start-button-primary w-full px-6">
              Start with my goal
              <span aria-hidden className="ml-2 text-lg">
                →
              </span>
            </Link>
            <Link href="/signin" className="start-button-secondary w-full px-6">
              I already have an account
            </Link>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
            About three minutes to your first plan. Starting targets are estimates
            and can be changed anytime.
          </p>
        </section>
      </div>
    </main>
  );
}
