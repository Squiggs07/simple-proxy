"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { computeMacroTargets, type Goal } from "@/lib/macros";
import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg } from "@/lib/units";

type Units = "imperial" | "metric";
type Sex = "male" | "female";
type Activity =
  | "mostly_sitting"
  | "on_feet_some"
  | "on_feet_lots"
  | "hard_physical";
type Equipment = "gym" | "dumbbells" | "home" | "mixed" | "unsure";
type Experience = "beginner" | "returning" | "comfortable" | "experienced";
type Confidence = "nervous" | "unsure" | "okay" | "confident";
type DietType = "none" | "vegetarian" | "vegan";
type Breakfast = "savory" | "sweet" | "either" | "skip";
type Budget = "lower" | "moderate" | "flexible";
type Variety = "repeat" | "some" | "variety";

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
  trainingDays?: number;
  sessionMinutes?: number;
  equipment?: string;
  experienceLevel?: string;
  confidenceLevel?: string;
  likedFoods?: string[];
  preferredCuisines?: string[];
  mealFormats?: string[];
  dislikes?: string[];
  neverFoods?: string[];
  allergies?: string[];
  dietType?: string;
  breakfastStyle?: string;
  cookingMinutes?: number;
  budgetLevel?: string;
  varietyPreference?: string;
  mealsPerDay?: number;
  healthFlags?: string[];
}

const GOALS: Array<{ value: Goal; label: string; detail: string; tint: string; icon: string }> = [
  {
    value: "lose_fat",
    label: "Lose fat and keep muscle",
    detail: "A manageable food adjustment, enough protein, and strength training.",
    tint: "bg-[var(--lavender)]",
    icon: "↓",
  },
  {
    value: "build_muscle",
    label: "Build muscle gradually",
    detail: "A cautious increase in food and a repeatable strength plan.",
    tint: "bg-[#ccefe1]",
    icon: "+",
  },
  {
    value: "feel_stronger",
    label: "Feel stronger and healthier",
    detail: "Build strength, energy, and useful habits without focusing on the scale.",
    tint: "bg-[var(--sage)]",
    icon: "↗",
  },
  {
    value: "maintain",
    label: "Maintain my weight",
    detail: "Keep weight steady while improving food and fitness.",
    tint: "bg-[var(--peach)]",
    icon: "=",
  },
  {
    value: "unsure",
    label: "I’m not sure",
    detail: "We’ll help you choose without forcing a goal.",
    tint: "bg-[#ececf0]",
    icon: "?",
  },
];

const ACTIVITIES: Array<{ value: Activity; label: string; detail: string }> = [
  {
    value: "mostly_sitting",
    label: "Mostly seated",
    detail: "Desk work, limited movement, and little intentional exercise.",
  },
  {
    value: "on_feet_some",
    label: "Lightly active",
    detail: "Regular errands or walking and about one to two workouts each week.",
  },
  {
    value: "on_feet_lots",
    label: "Active",
    detail: "Frequent movement or around three to five workouts each week.",
  },
  {
    value: "hard_physical",
    label: "Very active",
    detail: "A physical job, high daily movement, or frequent training.",
  },
];

const CUISINES = ["Mexican", "Italian", "Mediterranean", "Asian", "American", "Indian"];
const FORMATS = ["Bowls", "Pasta", "Wraps", "Sandwiches", "Plates", "Salads", "Smoothies", "Breakfast", "One-pan", "No-cook"];
const HEALTH_FLAGS = [
  ["pregnancy", "Pregnancy or breastfeeding"],
  ["eating_concern", "Eating-disorder history or concern around restrictive eating"],
  ["kidney_diet", "Kidney disease or another condition affecting protein or diet"],
  ["physician_diet", "Physician-directed nutrition restrictions"],
  ["exercise_limit", "Significant injury or condition limiting exercise"],
  ["concerning_symptoms", "Chest pain, unexplained fainting, or concerning symptoms during activity"],
] as const;

const TOTAL_STEPS = 8;

function parseList(value?: string[]) {
  return value ?? [];
}

function splitNaturalList(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function StepHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <header>
      <p className="start-eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-[2rem] leading-[1.03] font-semibold tracking-[-0.045em] text-[var(--ink)]">
        {title}
      </h1>
      <p className="mt-3 text-[0.98rem] leading-6 text-[var(--muted)]">{text}</p>
    </header>
  );
}

function ChoiceCard({
  title,
  detail,
  selected,
  onClick,
  icon,
  tint = "bg-[var(--sage)]",
}: {
  title: string;
  detail?: string;
  selected?: boolean;
  onClick: () => void;
  icon?: string;
  tint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[4.7rem] w-full items-center gap-3.5 rounded-[1.25rem] border bg-white px-4 py-3.5 text-left transition ${
        selected
          ? "border-[var(--evergreen)] shadow-[0_0_0_2px_rgba(23,72,63,.08)]"
          : "border-[var(--border)] hover:border-[var(--sage-strong)]"
      }`}
    >
      {icon ? (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-extrabold text-[var(--evergreen-dark)] ${tint}`}>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tracking-[-0.015em] text-[var(--ink)]">{title}</span>
        {detail ? <span className="mt-1 block text-sm leading-[1.35rem] text-[var(--muted)]">{detail}</span> : null}
      </span>
      <span aria-hidden className="text-xl text-[#b9bfbc] transition group-hover:translate-x-0.5 group-hover:text-[var(--evergreen)]">
        ›
      </span>
    </button>
  );
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        selected
          ? "border-[var(--evergreen)] bg-[var(--evergreen)] text-white"
          : "border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--sage)]"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  choices,
  onChange,
}: {
  value: T;
  choices: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#ebe7df] p-1">
      {choices.map((choice) => (
        <button
          type="button"
          key={choice.value}
          onClick={() => onChange(choice.value)}
          className={`min-h-11 rounded-[0.8rem] px-3 text-sm font-semibold transition ${
            value === choice.value ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
          }`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "min-h-[3.25rem] w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-[1rem] text-[var(--ink)] outline-none placeholder:text-[#9aa29f] focus:border-[var(--sage-strong)] focus:ring-2 focus:ring-[#dbe8e1]";

export function OnboardingWizard({ initial }: { initial?: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initialFtIn = initial ? cmToFeetInches(initial.heightCm) : null;

  const [goal, setGoal] = useState<Goal>((initial?.goal as Goal) ?? "unsure");
  const [units, setUnits] = useState<Units>((initial?.units as Units) ?? "imperial");
  const [sex, setSex] = useState<Sex | null>((initial?.sexAtBirth as Sex) ?? null);
  const [age, setAge] = useState(initial ? String(initial.age) : "30");
  const [heightFt, setHeightFt] = useState(initialFtIn ? String(initialFtIn.feet) : "5");
  const [heightIn, setHeightIn] = useState(initialFtIn ? String(initialFtIn.inches) : "8");
  const [heightCm, setHeightCm] = useState(initial ? String(Math.round(initial.heightCm)) : "173");
  const [weightLbs, setWeightLbs] = useState(initial ? String(Math.round(kgToLbs(initial.weightKg))) : "170");
  const [weightKg, setWeightKg] = useState(initial ? String(Math.round(initial.weightKg)) : "77");
  const [activity, setActivity] = useState<Activity>((initial?.activityLevel as Activity) ?? "mostly_sitting");

  const [trainingDays, setTrainingDays] = useState(initial?.trainingDays ?? 3);
  const [sessionMinutes, setSessionMinutes] = useState(initial?.sessionMinutes ?? 45);
  const [equipment, setEquipment] = useState<Equipment>((initial?.equipment as Equipment) ?? "gym");
  const [experience, setExperience] = useState<Experience>((initial?.experienceLevel as Experience) ?? "beginner");
  const [confidence, setConfidence] = useState<Confidence>((initial?.confidenceLevel as Confidence) ?? "unsure");

  const [likedFoodsText, setLikedFoodsText] = useState(parseList(initial?.likedFoods).join(", "));
  const [cuisines, setCuisines] = useState<string[]>(parseList(initial?.preferredCuisines));
  const [formats, setFormats] = useState<string[]>(parseList(initial?.mealFormats));
  const [breakfast, setBreakfast] = useState<Breakfast>((initial?.breakfastStyle as Breakfast) ?? "either");
  const [cookingMinutes, setCookingMinutes] = useState(initial?.cookingMinutes ?? 20);
  const [budget, setBudget] = useState<Budget>((initial?.budgetLevel as Budget) ?? "moderate");
  const [variety, setVariety] = useState<Variety>((initial?.varietyPreference as Variety) ?? "some");
  const [mealsPerDay, setMealsPerDay] = useState(initial?.mealsPerDay ?? 4);

  const [dietType, setDietType] = useState<DietType>((initial?.dietType as DietType) ?? "none");
  const [dislikesText, setDislikesText] = useState(parseList(initial?.dislikes).join(", "));
  const [neverFoodsText, setNeverFoodsText] = useState(parseList(initial?.neverFoods).join(", "));
  const [allergiesText, setAllergiesText] = useState(parseList(initial?.allergies).join(", "));
  const [healthFlags, setHealthFlags] = useState<string[]>(parseList(initial?.healthFlags));

  function next() {
    setError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function statsValues() {
    const ageNum = Number(age);
    const height = units === "imperial" ? feetInchesToCm(Number(heightFt), Number(heightIn)) : Number(heightCm);
    const weight = units === "imperial" ? lbsToKg(Number(weightLbs)) : Number(weightKg);

    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 100) {
      setError("Please enter an age between 13 and 100.");
      return null;
    }
    if (!Number.isFinite(height) || height < 120 || height > 230) {
      setError("That height doesn’t look right. Please double-check it.");
      return null;
    }
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      setError("That weight doesn’t look right. Please double-check it.");
      return null;
    }
    if (!sex) {
      setError("Choose the equation input so we can estimate your starting food needs.");
      return null;
    }
    return { age: Math.round(ageNum), heightCm: height, weightKg: weight };
  }

  const preview = useMemo(() => {
    const ageNum = Number(age);
    const height = units === "imperial" ? feetInchesToCm(Number(heightFt), Number(heightIn)) : Number(heightCm);
    const weight = units === "imperial" ? lbsToKg(Number(weightLbs)) : Number(weightKg);
    if (!sex || !Number.isFinite(ageNum) || !Number.isFinite(height) || !Number.isFinite(weight)) return null;
    if (ageNum < 13 || height < 120 || weight < 30) return null;
    return computeMacroTargets({
      goal,
      sexAtBirth: sex,
      age: Math.round(ageNum),
      heightCm: height,
      weightKg: weight,
      activityLevel: activity,
    });
  }, [activity, age, goal, heightCm, heightFt, heightIn, sex, units, weightKg, weightLbs]);

  async function submit() {
    const stats = statsValues();
    if (!stats || !sex) {
      setStep(1);
      return;
    }

    const likedFoods = splitNaturalList(likedFoodsText);
    const dislikes = splitNaturalList(dislikesText);
    const neverFoods = splitNaturalList(neverFoodsText);
    const allergies = splitNaturalList(allergiesText);

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          sexAtBirth: sex,
          ...stats,
          activityLevel: activity,
          exclusions: [],
          mealPriority: variety === "variety" ? "variety" : budget === "lower" ? "simple" : "balanced",
          units,
          trainingDays,
          sessionMinutes,
          equipment,
          experienceLevel: experience,
          confidenceLevel: confidence,
          likedFoods,
          preferredCuisines: cuisines,
          mealFormats: formats,
          dislikes,
          neverFoods,
          allergies,
          dietType,
          breakfastStyle: breakfast,
          cookingMinutes,
          budgetLevel: budget,
          varietyPreference: variety,
          mealsPerDay,
          healthFlags,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Your answers are still here — please try again.");
        return;
      }
      router.push("/summary");
    } finally {
      setBusy(false);
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto w-full max-w-[31rem]">
      <div className="mb-7 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-lg text-[var(--evergreen-dark)] ${step === 0 ? "invisible" : ""}`}
          aria-label="Go back"
        >
          ←
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9e4da]">
          <div
            className="h-full rounded-full bg-[var(--evergreen)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="min-w-12 text-right text-xs font-semibold text-[var(--muted)]">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      {error ? (
        <div role="alert" className="mb-5 rounded-2xl border border-[#ecd2ca] bg-[var(--peach)] px-4 py-3 text-sm leading-5 text-[#77483f]">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <section>
          <StepHeader
            eyebrow="Your goal"
            title="What would you like help with?"
            text="Choose the path that feels right for you today. You can change it anytime."
          />
          <div className="mt-6 grid gap-2.5">
            {GOALS.map((item) => (
              <ChoiceCard
                key={item.value}
                title={item.label}
                detail={item.detail}
                icon={item.icon}
                tint={item.tint}
                selected={goal === item.value}
                onClick={() => {
                  setGoal(item.value);
                  setTimeout(next, 80);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <StepHeader
            eyebrow="Starting estimate"
            title="A few basics about you"
            text="We use these to estimate how much energy your body needs. They are a starting point, not a score."
          />

          <div className="mt-6">
            <Segmented
              value={units}
              onChange={setUnits}
              choices={[
                { value: "imperial", label: "US · ft & lbs" },
                { value: "metric", label: "Metric · cm & kg" },
              ]}
            />
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Age</span>
              <input className={inputClass} inputMode="numeric" type="number" value={age} onChange={(event) => setAge(event.target.value)} />
            </label>

            <div className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Height</span>
              {units === "imperial" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="relative">
                    <input className={inputClass} inputMode="numeric" type="number" value={heightFt} onChange={(event) => setHeightFt(event.target.value)} aria-label="Height in feet" />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-[var(--muted)]">ft</span>
                  </label>
                  <label className="relative">
                    <input className={inputClass} inputMode="numeric" type="number" value={heightIn} onChange={(event) => setHeightIn(event.target.value)} aria-label="Height in inches" />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-[var(--muted)]">in</span>
                  </label>
                </div>
              ) : (
                <label className="relative">
                  <input className={inputClass} inputMode="numeric" type="number" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} aria-label="Height in centimeters" />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-[var(--muted)]">cm</span>
                </label>
              )}
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Current weight</span>
              <span className="relative">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={units === "imperial" ? weightLbs : weightKg}
                  onChange={(event) => (units === "imperial" ? setWeightLbs(event.target.value) : setWeightKg(event.target.value))}
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-[var(--muted)]">{units === "imperial" ? "lb" : "kg"}</span>
              </span>
            </label>

            <div className="grid gap-2">
              <div>
                <span className="text-sm font-semibold text-[var(--ink)]">Calorie-equation input</span>
                <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">The standard resting-energy equation uses this value. It is not used to define your identity.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(["female", "male"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setSex(value)}
                    className={`min-h-12 rounded-2xl border px-4 font-semibold capitalize ${sex === value ? "border-[var(--evergreen)] bg-[var(--sage)] text-[var(--evergreen-dark)]" : "border-[var(--border)] bg-white text-[var(--ink)]"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" onClick={() => statsValues() && next()} className="start-button-primary mt-7 w-full px-5">
            Continue
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <StepHeader
            eyebrow="Daily activity"
            title="What does a typical week feel like?"
            text="This gives us a starting estimate. Your progress trend will help us make it more personal later."
          />
          <div className="mt-6 grid gap-2.5">
            {ACTIVITIES.map((item) => (
              <ChoiceCard
                key={item.value}
                title={item.label}
                detail={item.detail}
                selected={activity === item.value}
                onClick={() => {
                  setActivity(item.value);
                  setTimeout(next, 80);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <StepHeader
            eyebrow="Training"
            title="What can realistically fit your life?"
            text="Pick what you could repeat on a normal week — not your most motivated week."
          />

          <div className="mt-6 grid gap-6">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Days per week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <Chip key={value} selected={trainingDays === value} onClick={() => setTrainingDays(value)}>{value}</Chip>
                ))}
              </div>
              {experience === "beginner" ? <p className="mt-2 text-xs text-[var(--sage-strong)]">2–3 days is a strong starting point for most beginners.</p> : null}
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Typical session</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[15, 20, 30, 45, 60, 75, 90].map((value) => (
                  <Chip key={value} selected={sessionMinutes === value} onClick={() => setSessionMinutes(value)}>{value} min</Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Where will you train?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ["gym", "Full gym"],
                  ["dumbbells", "Dumbbells"],
                  ["home", "Home / bodyweight"],
                  ["mixed", "Mixed"],
                  ["unsure", "Not sure yet"],
                ] as Array<[Equipment, string]>).map(([value, label]) => (
                  <button type="button" key={value} onClick={() => setEquipment(value)} className={`min-h-12 rounded-2xl border px-3 text-sm font-semibold ${equipment === value ? "border-[var(--evergreen)] bg-[var(--sage)] text-[var(--evergreen-dark)]" : "border-[var(--border)] bg-white text-[var(--ink)]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
                Experience
                <select className={inputClass} value={experience} onChange={(event) => setExperience(event.target.value as Experience)}>
                  <option value="beginner">Completely new</option>
                  <option value="returning">Returning</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="experienced">Experienced</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
                Confidence
                <select className={inputClass} value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>
                  <option value="nervous">Nervous</option>
                  <option value="unsure">Unsure</option>
                  <option value="okay">Okay</option>
                  <option value="confident">Confident</option>
                </select>
              </label>
            </div>
          </div>

          <button type="button" onClick={next} className="start-button-primary mt-7 w-full px-5">Continue</button>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <StepHeader
            eyebrow="Food you want"
            title="What would you actually look forward to eating?"
            text="Start with what sounds good. We’ll handle the nutrition math underneath."
          />

          <div className="mt-6 grid gap-6">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Foods or complete meals you enjoy</span>
              <textarea
                rows={3}
                value={likedFoodsText}
                onChange={(event) => setLikedFoodsText(event.target.value)}
                placeholder="Chicken bowls, pasta, eggs, Greek yogurt, tacos…"
                className="w-full resize-none rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[1rem] leading-6 outline-none placeholder:text-[#9aa29f] focus:border-[var(--sage-strong)] focus:ring-2 focus:ring-[#dbe8e1]"
              />
            </label>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Cuisines you like</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CUISINES.map((value) => <Chip key={value} selected={cuisines.includes(value)} onClick={() => setCuisines((current) => toggleValue(current, value))}>{value}</Chip>)}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Meal styles you like</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMATS.map((value) => <Chip key={value} selected={formats.includes(value)} onClick={() => setFormats((current) => toggleValue(current, value))}>{value}</Chip>)}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Breakfast</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["savory", "sweet", "either", "skip"] as Breakfast[]).map((value) => <Chip key={value} selected={breakfast === value} onClick={() => setBreakfast(value)}>{value === "skip" ? "Skip breakfast" : value[0].toUpperCase() + value.slice(1)}</Chip>)}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Cooking time</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 10, 20, 30, 60].map((value) => <Chip key={value} selected={cookingMinutes === value} onClick={() => setCookingMinutes(value)}>{value === 0 ? "No cooking" : value === 60 ? "Flexible" : `Under ${value} min`}</Chip>)}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
                Budget
                <select className={inputClass} value={budget} onChange={(event) => setBudget(event.target.value as Budget)}>
                  <option value="lower">Lower cost</option>
                  <option value="moderate">Moderate</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
                Variety
                <select className={inputClass} value={variety} onChange={(event) => setVariety(event.target.value as Variety)}>
                  <option value="repeat">Repeat favorites</option>
                  <option value="some">Some repetition</option>
                  <option value="variety">Frequent variety</option>
                </select>
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Meals per day</p>
              <div className="mt-2 flex gap-2">
                {[2, 3, 4, 5].map((value) => <Chip key={value} selected={mealsPerDay === value} onClick={() => setMealsPerDay(value)}>{value}</Chip>)}
              </div>
            </div>
          </div>

          <button type="button" onClick={next} className="start-button-primary mt-7 w-full px-5">Continue</button>
        </section>
      ) : null}

      {step === 5 ? (
        <section>
          <StepHeader
            eyebrow="Keep it yours"
            title="What should we avoid?"
            text="A dislike changes ranking. An allergy or never-use food removes it completely."
          />

          <div className="mt-6 grid gap-5">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Eating pattern</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["none", "vegetarian", "vegan"] as DietType[]).map((value) => (
                  <button type="button" key={value} onClick={() => setDietType(value)} className={`min-h-12 rounded-2xl border px-2 text-sm font-semibold ${dietType === value ? "border-[var(--evergreen)] bg-[var(--sage)] text-[var(--evergreen-dark)]" : "border-[var(--border)] bg-white text-[var(--ink)]"}`}>
                    {value === "none" ? "No restriction" : value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Foods I simply don’t enjoy</span>
              <input className={inputClass} value={dislikesText} onChange={(event) => setDislikesText(event.target.value)} placeholder="Mushrooms, tuna…" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Never use</span>
              <input className={inputClass} value={neverFoodsText} onChange={(event) => setNeverFoodsText(event.target.value)} placeholder="Any foods you never want included" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">Allergies</span>
              <input className={inputClass} value={allergiesText} onChange={(event) => setAllergiesText(event.target.value)} placeholder="Peanuts, shellfish…" />
            </label>
          </div>

          <button type="button" onClick={next} className="start-button-primary mt-7 w-full px-5">Continue</button>
        </section>
      ) : null}

      {step === 6 ? (
        <section>
          <StepHeader
            eyebrow="Safety"
            title="Anything we should plan around?"
            text="This keeps the starting plan conservative where it should be. Start Here provides general planning and does not diagnose conditions."
          />

          <div className="mt-6 grid gap-2.5">
            {HEALTH_FLAGS.map(([value, label]) => {
              const selected = healthFlags.includes(value);
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setHealthFlags((current) => toggleValue(current, value))}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left ${selected ? "border-[var(--evergreen)] bg-[var(--sage)]" : "border-[var(--border)] bg-white"}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${selected ? "border-[var(--evergreen)] bg-[var(--evergreen)] text-white" : "border-[#cdd2cf] text-transparent"}`}>✓</span>
                  <span className="text-sm leading-5 font-medium text-[var(--ink)]">{label}</span>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={next} className="start-button-primary mt-7 w-full px-5">Review my plan</button>
          <button type="button" onClick={() => { setHealthFlags([]); next(); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-[var(--muted)]">None of these</button>
        </section>
      ) : null}

      {step === 7 ? (
        <section>
          <StepHeader
            eyebrow="Starting plan"
            title="Here’s where we’ll begin."
            text="These are starting estimates, not judgments or permanent limits. Your trend and feedback make the plan more personal over time."
          />

          {preview ? (
            <div className="mt-6 grid gap-3">
              <div className="start-card p-5">
                <p className="text-xs font-bold tracking-[0.08em] text-[var(--sage-strong)] uppercase">Primary goal</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]">{GOALS.find((item) => item.value === goal)?.label}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="start-card p-4">
                  <p className="text-xs font-semibold text-[var(--muted)]">Daily food</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{preview.calories.toLocaleString()}</p>
                  <p className="text-xs text-[var(--muted)]">calories · estimate</p>
                </div>
                <div className="start-card p-4">
                  <p className="text-xs font-semibold text-[var(--muted)]">Daily protein</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{preview.proteinG}g</p>
                  <p className="text-xs text-[var(--muted)]">starting target</p>
                </div>
              </div>

              <div className="start-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.08em] text-[var(--sage-strong)] uppercase">Weekly training</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{trainingDays} days · about {sessionMinutes} min</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{experience === "beginner" ? "A beginner-friendly structure with stable, repeatable movements." : "Built around your available time and equipment."}</p>
                  </div>
                  <span className="rounded-full bg-[var(--butter)]/60 px-3 py-1.5 text-xs font-bold text-[var(--evergreen-dark)]">{equipment}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm leading-5 text-[var(--evergreen-dark)]">
                We’ll review your progress trend before making meaningful target changes. One weigh-in never rewrites the plan.
              </div>

              {preview.flags.length ? (
                <div className="rounded-2xl border border-[#ead8b8] bg-[#fff4df] px-4 py-3 text-sm leading-5 text-[#745731]">
                  We adjusted the starting target to stay within the app’s safety rules. You can still use the food and training guidance without pursuing an aggressive weight change.
                </div>
              ) : null}
            </div>
          ) : null}

          <button type="button" disabled={busy} onClick={submit} className="start-button-primary mt-7 w-full px-5 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Building your first week…" : "Build my first week"}
          </button>
          <button type="button" onClick={back} disabled={busy} className="mt-3 min-h-11 w-full text-sm font-semibold text-[var(--muted)]">Change something first</button>
        </section>
      ) : null}
    </div>
  );
}
