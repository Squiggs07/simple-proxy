"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg } from "@/lib/units";

type Units = "imperial" | "metric";

/** Saved profile values used to prefill the wizard for returning users. */
export interface WizardInitial {
  goal: string;
  sexAtBirth: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  exclusions: string[];
  mealPriority: string;
  units: string;
}

const GOALS = [
  {
    value: "lose_fat",
    emoji: "🔥",
    label: "Lose fat",
    detail: "Slim down at a steady, sustainable pace.",
  },
  {
    value: "build_muscle",
    emoji: "💪",
    label: "Build muscle",
    detail: "Get stronger and add muscle over time.",
  },
  {
    value: "recomp",
    emoji: "⚖️",
    label: "Get stronger and healthier",
    detail: "Firm up and feel better without big weight swings.",
  },
  {
    value: "healthy_habits",
    emoji: "🥗",
    label: "Just eat better and move more",
    detail: "Build healthy habits without a big program.",
  },
] as const;

const ACTIVITY_LEVELS = [
  {
    value: "mostly_sitting",
    emoji: "🪑",
    label: "Mostly sitting",
    detail: "Desk work, driving, or lots of screen time.",
  },
  {
    value: "on_feet_some",
    emoji: "🚶",
    label: "Up and about sometimes",
    detail: "Some walking or standing most days.",
  },
  {
    value: "on_feet_lots",
    emoji: "🏃",
    label: "On my feet a lot",
    detail: "Active job, or you exercise most days.",
  },
  {
    value: "hard_physical",
    emoji: "🏗️",
    label: "Hard physical work or training",
    detail: "Heavy labor or intense training most days.",
  },
] as const;

const EXCLUSION_PRESETS = [
  "Vegetarian",
  "Vegan",
  "No dairy",
  "No gluten",
  "No nuts",
  "No shellfish",
  "No pork",
  "No beef",
];

const PRIORITIES = [
  {
    value: "balanced",
    emoji: "🌤️",
    label: "A balanced mix",
    detail: "A little of everything. A great default.",
  },
  {
    value: "precision",
    emoji: "🎯",
    label: "Hit my nutrition targets precisely",
    detail: "Meals engineered to land right on your numbers.",
  },
  {
    value: "simple",
    emoji: "🧺",
    label: "Simple, cheap, and repeatable",
    detail: "Few ingredients, easy cooking, budget-friendly.",
  },
  {
    value: "variety",
    emoji: "🌍",
    label: "Variety and interesting food",
    detail: "More cuisines, less repetition.",
  },
] as const;

type Goal = (typeof GOALS)[number]["value"];
type Activity = (typeof ACTIVITY_LEVELS)[number]["value"];
type Priority = (typeof PRIORITIES)[number]["value"];

const TOTAL_STEPS = 5;

function ChoiceButton({
  selected,
  onClick,
  emoji,
  label,
  detail,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition ${
        selected
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <span>
        <span className="block text-base font-semibold text-stone-900">
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-stone-500">{detail}</span>
      </span>
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export function OnboardingWizard({ initial }: { initial?: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initialFtIn = initial ? cmToFeetInches(initial.heightCm) : null;
  const initialPresets =
    initial?.exclusions.filter((x) => EXCLUSION_PRESETS.includes(x)) ?? [];
  const initialCustom =
    initial?.exclusions.filter((x) => !EXCLUSION_PRESETS.includes(x)) ?? [];

  const [goal, setGoal] = useState<Goal>((initial?.goal as Goal) ?? "healthy_habits");
  const [units, setUnits] = useState<Units>(
    (initial?.units as Units) ?? "imperial",
  );
  const [sex, setSex] = useState<"male" | "female" | null>(
    (initial?.sexAtBirth as "male" | "female") ?? null,
  );
  const [age, setAge] = useState(initial ? String(initial.age) : "30");
  const [heightFt, setHeightFt] = useState(
    initialFtIn ? String(initialFtIn.feet) : "5",
  );
  const [heightIn, setHeightIn] = useState(
    initialFtIn ? String(initialFtIn.inches) : "8",
  );
  const [heightCm, setHeightCm] = useState(
    initial ? String(Math.round(initial.heightCm)) : "173",
  );
  const [weightLbs, setWeightLbs] = useState(
    initial ? String(Math.round(kgToLbs(initial.weightKg))) : "170",
  );
  const [weightKg, setWeightKg] = useState(
    initial ? String(Math.round(initial.weightKg)) : "77",
  );
  const [activity, setActivity] = useState<Activity>(
    (initial?.activityLevel as Activity) ?? "mostly_sitting",
  );
  const [exclusions, setExclusions] = useState<string[]>(initialPresets);
  const [customExclusion, setCustomExclusion] = useState(
    initialCustom.join(", "),
  );
  const [priority, setPriority] = useState<Priority>(
    (initial?.mealPriority as Priority) ?? "balanced",
  );

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function statsValues(): {
    age: number;
    heightCm: number;
    weightKg: number;
  } | null {
    const ageNum = Number(age);
    const h =
      units === "imperial"
        ? feetInchesToCm(Number(heightFt), Number(heightIn))
        : Number(heightCm);
    const w = units === "imperial" ? lbsToKg(Number(weightLbs)) : Number(weightKg);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 100) {
      setError("Please enter an age between 13 and 100.");
      return null;
    }
    if (!Number.isFinite(h) || h < 120 || h > 230) {
      setError("That height doesn't look right — mind double-checking it?");
      return null;
    }
    if (!Number.isFinite(w) || w < 30 || w > 300) {
      setError("That weight doesn't look right — mind double-checking it?");
      return null;
    }
    if (!sex) {
      setError("Please pick one — we only use it for the calorie math.");
      return null;
    }
    return { age: Math.round(ageNum), heightCm: h, weightKg: w };
  }

  function handleStatsNext() {
    if (statsValues()) next();
  }

  async function submit(finalPriority: Priority) {
    const stats = statsValues();
    if (!stats || !sex) {
      setStep(1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const customItems = customExclusion
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          sexAtBirth: sex,
          ...stats,
          activityLevel: activity,
          exclusions: [...exclusions, ...customItems],
          mealPriority: finalPriority,
          units,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong — please try again.");
        return;
      }
      router.push("/summary");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-stone-500">
          <button
            type="button"
            onClick={back}
            className={step === 0 ? "invisible" : "font-medium text-stone-600"}
          >
            ← Back
          </button>
          <span>
            {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label={`Question ${step + 1} of ${TOTAL_STEPS}`}
          className="mt-3 h-1.5 w-full rounded-full bg-stone-200"
        >
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <section>
          <h1 className="text-2xl font-bold text-stone-900">
            What&apos;s your main goal?
          </h1>
          <p className="mt-2 text-stone-500">
            There&apos;s no wrong answer — you can change this anytime.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {GOALS.map((g) => (
              <ChoiceButton
                key={g.value}
                selected={goal === g.value}
                onClick={() => {
                  setGoal(g.value);
                  next();
                }}
                {...g}
              />
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-2xl font-bold text-stone-900">
            A few basics about you
          </h1>
          <p className="mt-2 text-stone-500">
            We use these for one thing only: figuring out how much food your
            body needs in a day.
          </p>

          <div className="mt-6 flex rounded-xl bg-stone-200 p-1 text-sm font-medium">
            {(["imperial", "metric"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnits(u)}
                className={`flex-1 rounded-lg py-2 transition ${
                  units === u ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
                }`}
              >
                {u === "imperial" ? "ft & lbs" : "cm & kg"}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">Age</span>
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">Height</span>
              {units === "imperial" ? (
                <div className="flex gap-3">
                  <label className="relative flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      className={inputClass}
                      aria-label="Height, feet"
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
                      ft
                    </span>
                  </label>
                  <label className="relative flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      className={inputClass}
                      aria-label="Height, inches"
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
                      in
                    </span>
                  </label>
                </div>
              ) : (
                <label className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className={inputClass}
                    aria-label="Height, centimeters"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
                    cm
                  </span>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">
                Current weight
              </span>
              <label className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={units === "imperial" ? weightLbs : weightKg}
                  onChange={(e) =>
                    units === "imperial"
                      ? setWeightLbs(e.target.value)
                      : setWeightKg(e.target.value)
                  }
                  className={inputClass}
                  aria-label="Current weight"
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
                  {units === "imperial" ? "lbs" : "kg"}
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">
                Sex at birth
              </span>
              <div className="flex gap-3">
                {(["female", "male"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`flex-1 rounded-xl border-2 bg-white px-4 py-3 text-base font-medium capitalize transition ${
                      sex === s
                        ? "border-emerald-500 text-stone-900 ring-2 ring-emerald-100"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-xs text-stone-400">
                Bodies burn energy a bit differently — we only use this for the
                calorie math.
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleStatsNext}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Continue
          </button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-2xl font-bold text-stone-900">
            How active is your typical day?
          </h1>
          <p className="mt-2 text-stone-500">
            Just your everyday life — no need to count workouts perfectly.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {ACTIVITY_LEVELS.map((a) => (
              <ChoiceButton
                key={a.value}
                selected={activity === a.value}
                onClick={() => {
                  setActivity(a.value);
                  next();
                }}
                {...a}
              />
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="text-2xl font-bold text-stone-900">
            Any foods you don&apos;t eat?
          </h1>
          <p className="mt-2 text-stone-500">
            Allergies, preferences, or just dislikes — tap any that apply, or
            skip right past this.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {EXCLUSION_PRESETS.map((label) => {
              const selected = exclusions.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setExclusions((prev) =>
                      selected
                        ? prev.filter((x) => x !== label)
                        : [...prev, label],
                    )
                  }
                  className={`rounded-full border-2 px-4 py-2.5 text-sm font-medium transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={customExclusion}
            onChange={(e) => setCustomExclusion(e.target.value)}
            placeholder="Anything else? (e.g. cilantro, mushrooms)"
            maxLength={60}
            className={`${inputClass} mt-4 text-base`}
          />
          <button
            type="button"
            onClick={next}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            {exclusions.length > 0 || customExclusion.trim()
              ? "Continue"
              : "Nothing comes to mind — continue"}
          </button>
        </section>
      )}

      {step === 4 && (
        <section>
          <h1 className="text-2xl font-bold text-stone-900">
            What matters most in your meals?
          </h1>
          <p className="mt-2 text-stone-500">
            This shapes the style of meals we&apos;ll suggest. You can change it
            anytime.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {PRIORITIES.map((p) => (
              <ChoiceButton
                key={p.value}
                selected={priority === p.value}
                onClick={() => {
                  setPriority(p.value);
                  void submit(p.value);
                }}
                {...p}
              />
            ))}
          </div>
          {busy && (
            <p className="mt-4 text-center text-sm text-stone-500">
              Putting your starting point together…
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
