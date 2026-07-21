import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { kgToLbs } from "@/lib/units";
import type { Goal, SafetyFlag } from "@/lib/macros";
import { Disclaimer } from "@/components/Disclaimer";

const GOAL_HEADLINE: Record<Goal, string> = {
  lose_fat: "lose fat at a steady, sustainable pace",
  build_muscle: "build muscle and strength",
  recomp: "get stronger and healthier",
  healthy_habits: "eat better and feel better",
};

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export default async function SummaryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;
  const [profile, target] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.macroTarget.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
  ]);
  if (!profile || !target) redirect("/onboarding");

  const flags = JSON.parse(target.flags) as SafetyFlag[];
  const goal = profile.goal as Goal;
  const isMaintenancePlan = target.planType === "maintenance";
  const weightDisplay =
    profile.units === "imperial"
      ? `${Math.round(kgToLbs(profile.weightKg))} lbs`
      : `${Math.round(profile.weightKg)} kg`;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
          Here&apos;s your starting point.
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-stone-600">
          {isMaintenancePlan ? (
            <>
              We&apos;ve set you up with a plan focused on nourishing your body
              well and building healthy habits — not eating less.
            </>
          ) : (
            <>
              To {GOAL_HEADLINE[goal]}, you don&apos;t need anything extreme.
              Here&apos;s what a good day of eating looks like for you:
            </>
          )}
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <p className="text-stone-500">Each day, aim for about</p>
          <p className="mt-2 text-4xl font-bold text-stone-900">
            {formatNumber(target.calories)}{" "}
            <span className="text-xl font-semibold text-stone-500">calories</span>
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {target.proteinG}g of protein
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone-500">
            On a plate, that&apos;s three satisfying meals a day, each with a
            palm-sized portion of protein (like chicken, fish, eggs, beans, or
            tofu), plus room for snacks. No weighing everything, no going
            hungry.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4 text-center">
            <div>
              <p className="text-lg font-semibold text-stone-800">
                {target.proteinG}g
              </p>
              <p className="text-xs text-stone-400">protein</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-stone-800">
                {target.carbsG}g
              </p>
              <p className="text-xs text-stone-400">carbs</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-stone-800">
                {target.fatG}g
              </p>
              <p className="text-xs text-stone-400">fat</p>
            </div>
          </div>
        </div>

        {(isMaintenancePlan ||
          flags.includes("underweight_no_deficit") ||
          flags.includes("under_18_no_deficit")) && (
          <div className="mt-5 rounded-2xl bg-sky-50 p-5 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-100">
            <p className="font-semibold">A quick, caring note</p>
            <p className="mt-2">
              {isMaintenancePlan ? (
                <>
                  Based on what you shared, eating less isn&apos;t the right
                  move for your body right now — so we&apos;ve built your plan
                  around fueling yourself well instead. For anything beyond
                  that, we&apos;d really encourage a chat with a doctor or
                  registered dietitian. They can give you guidance we
                  can&apos;t.
                </>
              ) : (
                <>
                  Based on what you shared, we&apos;d really encourage a chat
                  with a doctor or registered dietitian alongside this plan —
                  they can personalize things in ways we can&apos;t, and
                  they&apos;ll make sure your body is getting everything it
                  needs.
                </>
              )}
            </p>
          </div>
        )}

        {!isMaintenancePlan && flags.includes("clamped_to_calorie_floor") && (
          <div className="mt-5 rounded-2xl bg-sky-50 p-5 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-100">
            <p>
              One thing worth knowing: we nudged your target up a bit. Going
              lower wouldn&apos;t be good for your energy or health, and slower
              progress you can stick with beats fast progress you can&apos;t.
            </p>
          </div>
        )}

        <details className="group mt-5 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700">
            <span className="group-open:hidden">
              Curious how we got these numbers? →
            </span>
            <span className="hidden group-open:inline">
              How we got these numbers
            </span>
          </summary>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-500">
            <p>
              We estimated how much energy your body uses in a typical day from
              your age, height, weight ({weightDisplay}), and how active you
              are — that came out to about{" "}
              {formatNumber(target.maintenanceCalories)} calories.
            </p>
            <p>
              {isMaintenancePlan || target.calories === target.maintenanceCalories
                ? "Your target matches that, so your body gets exactly the fuel it needs while you build habits."
                : target.calories < target.maintenanceCalories
                  ? "Eating a little less than that — never drastically less — is how fat loss happens at a pace you can actually keep up."
                  : "Eating a little more than that gives your body the extra building material it needs to add muscle."}
            </p>
            <p>
              The protein target keeps you full and protects your muscle. The
              carbs and fat split fills in the rest — you don&apos;t need to
              hit any of these perfectly for this to work.
            </p>
          </div>
        </details>

        <Link
          href="/plan"
          className="mt-8 block rounded-xl bg-emerald-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Show me today&apos;s meals
        </Link>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href="/onboarding"
            className="text-sm font-medium text-emerald-700"
          >
            Adjust my answers
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-sm text-stone-400">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-10">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
