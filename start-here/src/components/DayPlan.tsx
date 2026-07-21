"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { MealDto } from "@/lib/meal-engine/serialize";

const SLOT_META: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: "🌅", label: "Breakfast" },
  lunch: { emoji: "☀️", label: "Lunch" },
  dinner: { emoji: "🌙", label: "Dinner" },
  snack: { emoji: "🍎", label: "Snack" },
};

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function ingredientKcal(i: MealDto["ingredients"][number]): number {
  return Math.round((i.kcalPer100g * i.grams) / 100);
}

function ingredientProtein(i: MealDto["ingredients"][number]): number {
  return Math.round(((i.proteinPer100g * i.grams) / 100) * 10) / 10;
}

export function DayPlan({
  targetKcal,
  targetProteinG,
}: {
  targetKcal: number;
  targetProteinG: number;
}) {
  const [meals, setMeals] = useState<MealDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: localDate() }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? "Something went wrong — please try again.");
          return;
        }
        setMeals(data.meals);
      } catch {
        if (!cancelled) setError("Something went wrong — please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function mealAction(mealId: string, path: string, body?: object) {
    setBusyMealId(mealId);
    setError(null);
    try {
      const res = await fetch(`/api/meals/${mealId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong — please try again.");
        return;
      }
      setMeals((prev) =>
        prev ? prev.map((m) => (m.id === mealId ? data.meal : m)) : prev,
      );
    } finally {
      setBusyMealId(null);
    }
  }

  if (error && !meals) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
          className="mt-4 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!meals) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <p className="animate-pulse text-4xl" aria-hidden>
          🍳
        </p>
        <h1 className="mt-4 text-xl font-bold text-stone-900">
          Putting your day together…
        </h1>
        <p className="mt-2 text-stone-500">
          Building meals that fit your numbers — the amounts are checked
          against real food data, not guessed.
        </p>
      </div>
    );
  }

  const dayKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const dayProtein = Math.round(meals.reduce((s, m) => s + m.proteinG, 0));
  const kcalPct = Math.min(100, Math.round((dayKcal / targetKcal) * 100));

  return (
    <div className="mx-auto w-full max-w-md">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Today&apos;s meals</h1>
        <p className="mt-1 text-sm text-stone-500">
          Eat these and you&apos;ll land on your numbers — no counting needed.
        </p>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-stone-800">
              {dayKcal.toLocaleString()} kcal planned
            </span>
            <span className="text-stone-400">
              target {targetKcal.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-stone-100">
            <div
              className={`h-2 rounded-full ${
                Math.abs(dayKcal - targetKcal) / targetKcal <= 0.07
                  ? "bg-emerald-500"
                  : "bg-amber-400"
              }`}
              style={{ width: `${kcalPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between text-sm">
            <span className="text-stone-600">{dayProtein}g protein</span>
            <span className="text-stone-400">target {targetProteinG}g</span>
          </div>
        </div>
      </header>

      <ul className="mt-6 flex flex-col gap-4">
        {meals.map((meal) => {
          const slot = SLOT_META[meal.slot] ?? { emoji: "🍽️", label: meal.slot };
          const open = openMealId === meal.id;
          const busy = busyMealId === meal.id;
          return (
            <li
              key={meal.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
            >
              <button
                type="button"
                onClick={() => setOpenMealId(open ? null : meal.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
                aria-expanded={open}
              >
                <span className="text-2xl" aria-hidden>
                  {slot.emoji}
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-semibold tracking-wide text-stone-400 uppercase">
                    {slot.label}
                  </span>
                  <span className="block font-semibold text-stone-900">
                    {meal.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {meal.whyThisFits}
                  </span>
                  <span className="mt-1.5 block text-sm font-medium text-emerald-700">
                    {meal.kcal} kcal · {Math.round(meal.proteinG)}g protein
                  </span>
                </span>
                <span className="mt-1 text-stone-300">{open ? "▴" : "▾"}</span>
              </button>

              {open && (
                <div className="border-t border-stone-100 px-4 pb-4">
                  {meal.description && (
                    <p className="pt-3 text-sm text-stone-600">{meal.description}</p>
                  )}

                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-stone-400">
                        <th className="py-1 font-medium">Ingredient</th>
                        <th className="py-1 text-right font-medium">Amount</th>
                        <th className="py-1 text-right font-medium">kcal</th>
                        <th className="py-1 text-right font-medium">Protein</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.ingredients.map((ing) => (
                        <tr key={ing.foodId} className="border-t border-stone-50">
                          <td className="py-1.5 pr-2 text-stone-700 capitalize">
                            {ing.name}
                          </td>
                          <td className="py-1.5 text-right whitespace-nowrap text-stone-500">
                            {ing.grams} g
                          </td>
                          <td className="py-1.5 text-right text-stone-500">
                            {ingredientKcal(ing)}
                          </td>
                          <td className="py-1.5 text-right text-stone-500">
                            {ingredientProtein(ing)}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {meal.steps.length > 0 && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-600">
                      {meal.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void mealAction(meal.id, "swap")}
                      className="flex-1 rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 disabled:opacity-50"
                    >
                      {busy ? "One sec…" : "🔄 Swap this meal"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || meal.portionFactor <= 0.61}
                      onClick={() =>
                        void mealAction(meal.id, "portion", { direction: "less" })
                      }
                      className="rounded-xl border-2 border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 disabled:opacity-40"
                      aria-label="A little less food"
                      title="A little less food"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      disabled={busy || meal.portionFactor >= 1.59}
                      onClick={() =>
                        void mealAction(meal.id, "portion", { direction: "more" })
                      }
                      className="rounded-xl border-2 border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 disabled:opacity-40"
                      aria-label="A little more food"
                      title="A little more food"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-stone-400">
        Every number here is computed from verified food data — never guessed.
      </p>

      <div className="mt-6 text-center">
        <Link href="/summary" className="text-sm font-medium text-emerald-700">
          ← Back to my targets
        </Link>
      </div>
    </div>
  );
}
