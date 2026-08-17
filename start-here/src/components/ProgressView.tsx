"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { kgToLbs, lbsToKg } from "@/lib/units";
import { WeightChart } from "./WeightChart";

interface ProgressData {
  units: "metric" | "imperial";
  target: { calories: number; proteinG: number } | null;
  trend: Array<{ date: string; weightKg: number; trendKg: number }>;
  latestTrendKg: number | null;
  weeklyChangeKg: number | null;
  week: {
    daysLogged: number;
    onTrackDays: number;
    weighIns: number;
  };
  months: Array<{
    month: string;
    changeKg: number;
    daysWeighed: number;
    daysLogged: number;
    mealsEaten: number;
    mealsPlanned: number;
    endTrendKg: number;
  }>;
  needsWeighIn: boolean;
}

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function ProgressView() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/progress?today=${localDate()}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? "Something went wrong — please try again.");
          return;
        }
        setData(body);
      } catch {
        if (!cancelled) setError("Something went wrong — please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-md py-16 text-center text-stone-400">
        Loading your progress…
      </div>
    );
  }

  const imperial = data.units === "imperial";
  const display = (kg: number) =>
    imperial ? `${Math.round(kgToLbs(kg) * 10) / 10} lb` : `${Math.round(kg * 10) / 10} kg`;
  const displayChange = (kg: number) => {
    const value = imperial ? kgToLbs(kg) : kg;
    const rounded = Math.round(Math.abs(value) * 10) / 10;
    const unit = imperial ? "lb" : "kg";
    if (rounded < 0.1) return `steady`;
    return `${kg < 0 ? "down" : "up"} ${rounded} ${unit}`;
  };

  async function saveWeighIn() {
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter a number for your weight.");
      return;
    }
    const kg = imperial ? lbsToKg(value) : value;
    if (kg < 30 || kg > 300) {
      setError("That weight doesn't look right — mind double-checking it?");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/weighin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localDate(),
          weight: value,
          units: data!.units,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong — please try again.");
        return;
      }
      setNote(
        body.recomputed
          ? `Logged! Your body has changed enough that we've gently updated your daily target to about ${body.newCalories.toLocaleString()} calories.`
          : "Logged! Remember: day-to-day wiggles are mostly water — your trend line is the real story.",
      );
      setWeightInput("");
      setReloadKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  const weekDots = Array.from({ length: 7 }, (_, i) => i < data.week.daysLogged);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-bold text-stone-900">Your progress</h1>
      <p className="mt-1 text-sm text-stone-500">
        One glance: are you on track? (Spoiler: showing up is the win.)
      </p>

      {/* Weigh-in */}
      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-700">
          {data.needsWeighIn
            ? "Time for your weekly check-in ✨"
            : "Log today's weight (optional)"}
        </h2>
        <div className="mt-2 flex gap-2">
          <label className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={imperial ? "e.g. 170" : "e.g. 77"}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              aria-label="Today's weight"
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-stone-400">
              {imperial ? "lbs" : "kg"}
            </span>
          </label>
          <button
            type="button"
            disabled={saving || !weightInput}
            onClick={() => void saveWeighIn()}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "…" : "Log"}
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Same time of day gives the steadiest numbers — first thing in the
          morning works best.
        </p>
        {note && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {note}
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </section>

      {/* This week */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-700">This week</h2>
        <div className="mt-3 flex items-center gap-1.5" aria-label={`${data.week.daysLogged} of 7 days logged`}>
          {weekDots.map((filled, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${filled ? "bg-emerald-500" : "bg-stone-200"}`}
            />
          ))}
          <span className="ml-2 text-sm text-stone-600">
            {data.week.daysLogged} of 7 days logged
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-lg font-bold text-stone-800">{data.week.onTrackDays}</p>
            <p className="text-xs text-stone-500">days most meals eaten</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-lg font-bold text-stone-800">
              {data.weeklyChangeKg === null ? "—" : displayChange(data.weeklyChangeKg)}
            </p>
            <p className="text-xs text-stone-500">weight trend this week</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          {data.week.daysLogged >= 4
            ? "That's real consistency — this is exactly how progress happens."
            : "Any day you log is a good day. Aim for most days, not perfect days."}
        </p>
      </section>

      {/* Weight trend */}
      {data.trend.length >= 2 && data.latestTrendKg !== null && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Weight trend</h2>
            <span className="text-sm font-bold text-stone-900">
              {display(data.latestTrendKg)}
            </span>
          </div>
          <div className="mt-2">
            <WeightChart trend={data.trend} display={display} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            The green line is your trend — the dots are daily readings, which
            bounce around with water and meals. Trust the line, not the dots.
          </p>
        </section>
      )}

      {/* Monthly summaries */}
      {data.months.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-sm font-semibold text-stone-700">Month by month</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400">
                <th className="py-1 font-medium">Month</th>
                <th className="py-1 text-right font-medium">Weight</th>
                <th className="py-1 text-right font-medium">Days logged</th>
                <th className="py-1 text-right font-medium">Meals eaten</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-t border-stone-100">
                  <td className="py-2 pr-2 text-stone-700">{monthLabel(m.month)}</td>
                  <td className="py-2 text-right whitespace-nowrap text-stone-600">
                    {m.daysWeighed > 0 ? displayChange(m.changeKg) : "—"}
                  </td>
                  <td className="py-2 text-right text-stone-600">
                    {Math.max(m.daysLogged, m.daysWeighed)}
                  </td>
                  <td className="py-2 text-right text-stone-600">
                    {m.mealsPlanned > 0
                      ? `${Math.round((m.mealsEaten / m.mealsPlanned) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.trend.length < 2 && (
        <section className="mt-4 rounded-2xl border-2 border-dashed border-stone-200 p-5 text-center">
          <p className="text-2xl" aria-hidden>
            📈
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Log a few weigh-ins and your trend chart will appear here. Weekly
            is plenty — daily is even better if it feels easy.
          </p>
        </section>
      )}

      <div className="mt-6 flex items-center justify-center gap-6">
        <Link href="/plan" className="text-sm font-medium text-emerald-700">
          ← Today&apos;s meals
        </Link>
        <Link href="/summary" className="text-sm font-medium text-emerald-700">
          My targets
        </Link>
      </div>
    </div>
  );
}
