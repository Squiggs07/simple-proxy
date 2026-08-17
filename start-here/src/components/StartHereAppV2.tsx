"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { GOAL_LABELS, type Goal, smoothedWeightTrend } from "@/lib/startHereEngine";
import { MEALS, mealMacros, type Exercise, type Meal } from "@/lib/startHereCatalog";
import { interpretCoachRequest } from "@/lib/startHereCoach";
import {
  alternativeExercises,
  buildDayMeals,
  buildWorkout,
  currentTargets,
  rankMeals,
  reviewProgress,
  type PlannedMeal,
  type WorkoutPlan,
} from "@/lib/startHerePlan";
import {
  INITIAL_STATE,
  mergeStoredState,
  type AppState,
  type AppTab,
  type Budget,
  type Confidence,
  type DietType,
  type Equipment,
  type Experience,
  type Variety,
} from "@/lib/startHereModels";

type IconName =
  | "home" | "eat" | "train" | "progress" | "coach" | "arrow" | "back"
  | "clock" | "swap" | "check" | "user" | "undo" | "plus" | "close"
  | "chevron" | "spark" | "target" | "calendar" | "grocery" | "settings";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    eat: <><path d="M7 3v8M4.5 3v5.5A2.5 2.5 0 0 0 7 11h0a2.5 2.5 0 0 0 2.5-2.5V3M7 11v10"/><path d="M16 3v18M16 3c3 1.5 4 4.4 4 7.5h-4"/></>,
    train: <><path d="M4 9v6M7 6v12M17 6v12M20 9v6M7 12h10"/></>,
    progress: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></>,
    coach: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    swap: <><path d="M4 8h13"/><path d="m14 5 3 3-3 3"/><path d="M20 16H7"/><path d="m10 13-3 3 3 3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    undo: <><path d="M9 7H4v-5"/><path d="M4 7a9 9 0 1 1-1 8"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    spark: <><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    grocery: <><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...common}>{paths[name]}</svg>;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function list(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
}

const goalOptions: Array<{ value: Goal; title: string; copy: string; tone: string; mark: string }> = [
  { value: "lose", title: "Lose fat", copy: "Reduce calories while protecting muscle.", tone: "lavender", mark: "↓" },
  { value: "gain", title: "Build muscle", copy: "A small surplus and repeatable strength plan.", tone: "mint", mark: "↗" },
  { value: "strength", title: "Feel stronger", copy: "Build strength, energy, and useful habits.", tone: "green", mark: "✦" },
  { value: "maintain", title: "Maintain weight", copy: "Keep weight steady while improving fitness.", tone: "peach", mark: "=" },
  { value: "unsure", title: "I’m not sure", copy: "We’ll help you choose a sensible starting point.", tone: "stone", mark: "?" },
];

const foodChoices = ["Chicken", "Turkey", "Steak", "Salmon", "Eggs", "Greek yogurt", "Pasta", "Rice bowls", "Wraps", "Sandwiches", "Tacos", "Smoothies"];
const cuisineChoices = ["American", "Italian", "Mexican", "Mediterranean", "Asian"];
const formatChoices = ["Bowls", "Pasta", "Wraps", "Sandwiches", "Plates", "Smoothies"];
const healthChoices = [
  "Pregnancy or breastfeeding",
  "Eating-disorder concern",
  "Kidney or physician-directed diet",
  "Exercise-limiting injury or condition",
  "Concerning symptoms",
];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StartHereAppV2() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<AppTab>("today");
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<string, string>>({});
  const [setChecks, setSetChecks] = useState<Record<string, boolean[]>>({});
  const [coachText, setCoachText] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<AppState | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("start-here-state-v3");
      if (saved) setState(mergeStoredState(JSON.parse(saved)));
    } catch {
      setState(INITIAL_STATE);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("start-here-state-v3", JSON.stringify(state));
  }, [state, ready]);

  const targets = useMemo(() => currentTargets(state), [state]);
  const plannedMeals = useMemo(() => buildDayMeals(state, targets.calories, targets.proteinGrams), [state, targets.calories, targets.proteinGrams]);
  const rankedMeals = useMemo(() => rankMeals(state), [state]);
  const baseWorkout = useMemo(() => buildWorkout(state), [state]);
  const workout = useMemo<WorkoutPlan>(() => ({
    ...baseWorkout,
    exercises: baseWorkout.exercises.map((item) => {
      const overrideId = exerciseSwaps[item.exercise.id];
      if (!overrideId) return item;
      const replacement = MEALS.length >= 0 ? undefined : undefined;
      void replacement;
      return item;
    }),
  }), [baseWorkout, exerciseSwaps]);

  const effectiveWorkout = useMemo<WorkoutPlan>(() => {
    const allAlternatives = new Map<string, Exercise>();
    for (const item of baseWorkout.exercises) {
      for (const alt of alternativeExercises(item.exercise.id, state)) allAlternatives.set(alt.id, alt);
    }
    return {
      ...baseWorkout,
      exercises: baseWorkout.exercises.map((item) => {
        const alt = exerciseSwaps[item.exercise.id] ? allAlternatives.get(exerciseSwaps[item.exercise.id]) : undefined;
        return alt ? { ...item, exercise: alt } : item;
      }),
    };
  }, [baseWorkout, exerciseSwaps, state]);
  void workout;

  const progressReview = useMemo(() => reviewProgress(state), [state]);
  const selectedMeal = selectedMealId ? MEALS.find((meal) => meal.id === selectedMealId) ?? null : null;
  const swapSource = swapMealId ? MEALS.find((meal) => meal.id === swapMealId) ?? null : null;

  function patch(update: Partial<AppState>) {
    setState((current) => ({ ...current, ...update }));
  }

  function toggleArray<K extends keyof AppState>(key: K, value: string) {
    setState((current) => {
      const currentValue = current[key];
      if (!Array.isArray(currentValue)) return current;
      const items = currentValue as string[];
      return { ...current, [key]: items.includes(value) ? items.filter((item) => item !== value) : [...items, value] };
    });
  }

  function completeOnboarding() {
    setBuilding(true);
    window.setTimeout(() => {
      patch({ onboarded: true, onboardingCompletedAt: new Date().toISOString() });
      setBuilding(false);
      setTab("today");
    }, 900);
  }

  function swapMeal(source: Meal, replacement: Meal) {
    patch({ swappedMealIds: { ...state.swappedMealIds, [source.id]: replacement.id } });
    setSwapMealId(null);
  }

  function effectiveMeal(item: PlannedMeal) {
    const replacementId = state.swappedMealIds[item.meal.id];
    const replacement = replacementId ? MEALS.find((meal) => meal.id === replacementId) : undefined;
    if (!replacement) return item;
    const macro = mealMacros(replacement);
    const factor = item.portion === "smaller" ? 0.88 : item.portion === "larger" ? 1.12 : 1;
    return { ...item, meal: replacement, calories: Math.round(macro.calories * factor), protein: Math.round(macro.protein * factor) };
  }

  const dayMeals = plannedMeals.map(effectiveMeal);

  function toggleMealEaten(id: string) {
    patch({ eatenMealIds: state.eatenMealIds.includes(id) ? state.eatenMealIds.filter((item) => item !== id) : [...state.eatenMealIds, id] });
  }

  function startWorkout() {
    const next: Record<string, boolean[]> = {};
    for (const item of effectiveWorkout.exercises) next[item.exercise.id] = Array(item.sets).fill(false) as boolean[];
    setSetChecks(next);
    setActiveWorkout(true);
  }

  function toggleSet(exerciseId: string, index: number) {
    setSetChecks((current) => {
      const values = [...(current[exerciseId] ?? [])];
      values[index] = !values[index];
      return { ...current, [exerciseId]: values };
    });
  }

  function finishWorkout() {
    const log = {
      id: `workout-${Date.now()}`,
      date: todayKey(),
      workoutName: effectiveWorkout.name,
      minutes: effectiveWorkout.minutes,
      completed: true,
      exercises: effectiveWorkout.exercises.map((item) => ({
        exerciseId: item.exercise.id,
        sets: Array.from({ length: item.sets }, (_, index) => ({ reps: null, weight: null, complete: Boolean(setChecks[item.exercise.id]?.[index]) })),
      })),
    };
    patch({ workoutLogs: [...state.workoutLogs, log], todayOverride: { minutes: null, equipment: null, note: null } });
    setActiveWorkout(false);
    setExerciseSwaps({});
  }

  function handleCoach(event: FormEvent) {
    event.preventDefault();
    const raw = coachText.trim();
    if (!raw) return;
    const result = interpretCoachRequest(raw, state);
    const changed = Object.keys(result.patch).length > 0;
    if (changed) setUndoSnapshot(state);
    const now = new Date().toISOString();
    const nextHistory = [
      ...state.coachHistory,
      { id: `user-${Date.now()}`, role: "user" as const, text: raw, createdAt: now },
      { id: `coach-${Date.now() + 1}`, role: "coach" as const, text: result.reply, changeSummary: result.changeSummary, createdAt: now },
    ];
    setState((current) => ({ ...current, ...result.patch, coachHistory: nextHistory }));
    setCoachText("");
  }

  function undoCoach() {
    if (!undoSnapshot) return;
    const restored: AppState = {
      ...undoSnapshot,
      coachHistory: [
        ...state.coachHistory,
        { id: `coach-undo-${Date.now()}`, role: "coach", text: "Undone. Your previous plan is back.", createdAt: new Date().toISOString() },
      ],
    };
    setState(restored);
    setUndoSnapshot(null);
  }

  if (!ready) return <div className="min-h-dvh bg-[#F7F4EE]" />;

  if (!state.onboarded) {
    return (
      <Onboarding
        state={state}
        step={step}
        setStep={setStep}
        patch={patch}
        toggleArray={toggleArray}
        targets={targets}
        building={building}
        complete={completeOnboarding}
      />
    );
  }

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={effectiveWorkout}
        setChecks={setChecks}
        toggleSet={toggleSet}
        finish={finishWorkout}
        close={() => setActiveWorkout(false)}
        state={state}
        onSwap={(exerciseId, replacementId) => setExerciseSwaps((current) => ({ ...current, [exerciseId]: replacementId }))}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">
      <div className="start-shell">
        <main className="px-5 pb-28 pt-[max(18px,env(safe-area-inset-top))]">
          {tab === "today" && (
            <TodayView state={state} targets={targets} meals={dayMeals} workout={effectiveWorkout} setTab={setTab} onStartWorkout={startWorkout} onMeal={(id) => setSelectedMealId(id)} onSwap={(id) => setSwapMealId(id)} openProfile={() => setShowProfile(true)} />
          )}
          {tab === "eat" && (
            <EatView state={state} targets={targets} meals={dayMeals} onMeal={(id) => setSelectedMealId(id)} onSwap={(id) => setSwapMealId(id)} toggleEaten={toggleMealEaten} showPrep={showPrep || state.showPrep} setShowPrep={setShowPrep} />
          )}
          {tab === "train" && (
            <TrainView state={state} workout={effectiveWorkout} startWorkout={startWorkout} setTab={setTab} />
          )}
          {tab === "progress" && (
            <ProgressView state={state} review={progressReview} targets={targets} patch={patch} setTab={setTab} />
          )}
          {tab === "coach" && (
            <CoachView state={state} targets={targets} coachText={coachText} setCoachText={setCoachText} submit={handleCoach} canUndo={Boolean(undoSnapshot)} undo={undoCoach} />
          )}
        </main>
        <BottomNav tab={tab} setTab={setTab} />
      </div>

      {selectedMeal && <MealDetail meal={selectedMeal} state={state} close={() => setSelectedMealId(null)} swap={() => { setSelectedMealId(null); setSwapMealId(selectedMeal.id); }} toggleEaten={toggleMealEaten} />}
      {swapSource && <MealSwap source={swapSource} state={state} ranked={rankedMeals.map((item) => item.meal)} close={() => setSwapMealId(null)} choose={(replacement) => swapMeal(swapSource, replacement)} />}
      {showProfile && <ProfileSheet state={state} targets={targets} patch={patch} close={() => setShowProfile(false)} reset={() => { localStorage.removeItem("start-here-state-v3"); setState(INITIAL_STATE); setStep(0); setShowProfile(false); }} />}
    </div>
  );
}

interface OnboardingProps {
  state: AppState;
  step: number;
  setStep: (value: number | ((current: number) => number)) => void;
  patch: (update: Partial<AppState>) => void;
  toggleArray: <K extends keyof AppState>(key: K, value: string) => void;
  targets: ReturnType<typeof currentTargets>;
  building: boolean;
  complete: () => void;
}

function Onboarding({ state, step, setStep, patch, toggleArray, targets, building, complete }: OnboardingProps) {
  const totalSteps = 9;
  const back = () => setStep((current) => Math.max(0, current - 1));
  return (
    <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        {step > 0 && step <= totalSteps && !building && (
          <div className="mb-5 flex items-center gap-3">
            <button onClick={back} className="round-button" aria-label="Back"><Icon name="back" /></button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E6E0D6]"><div className="h-full rounded-full bg-[#17483F] transition-all" style={{ width: `${Math.min(100, (step / totalSteps) * 100)}%` }} /></div>
            <span className="text-[11px] font-bold text-[#8A928F]">{step}/{totalSteps}</span>
          </div>
        )}

        {step === 0 && (
          <section className="flex flex-1 flex-col justify-between py-7">
            <div>
              <div className="brand-pill"><Icon name="spark" size={16} /> START HERE</div>
              <h1 className="mt-9 max-w-sm text-[46px] font-semibold leading-[1.01] tracking-[-.052em]">Your plan can be simple.</h1>
              <p className="mt-6 max-w-sm text-[18px] leading-7 text-[#68736F]">Tell us what you want, what your life actually looks like, and what you like to eat. We’ll turn it into one manageable place to start.</p>
              <div className="mt-9 grid grid-cols-3 gap-2.5">
                <WelcomeMini icon="eat" label="Food that fits" />
                <WelcomeMini icon="train" label="Workouts that fit" />
                <WelcomeMini icon="coach" label="Coach that adapts" />
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={() => setStep(1)} className="start-primary w-full">Start with my goal <Icon name="arrow" size={18} /></button>
              <button onClick={() => { patch({ goal: "unsure" }); setStep(2); }} className="start-secondary w-full">I’m not sure yet</button>
              <p className="px-3 pt-1 text-center text-xs leading-5 text-[#7D8783]">No streaks. No punishment. No fitness vocabulary test.</p>
            </div>
          </section>
        )}

        {step === 1 && (
          <OnboardingSection title="What would you like help with?" copy="Choose the path that feels right for you today.">
            <div className="mt-5 flex flex-1 flex-col justify-between gap-2">
              {goalOptions.map((option) => (
                <button key={option.value} onClick={() => { patch({ goal: option.value }); setStep(2); }} className="start-choice text-left">
                  <span className={cx("goal-mark", `goal-${option.tone}`)}>{option.mark}</span>
                  <span className="min-w-0 flex-1"><strong>{option.title}</strong><small>{option.copy}</small></span>
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </div>
          </OnboardingSection>
        )}

        {step === 2 && (
          <OnboardingSection title="A few basics." copy="Just enough to estimate a useful starting point. You can change these later." footer={<Continue onClick={() => setStep(3)} />}>
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age"><input inputMode="numeric" type="number" min={13} max={100} value={state.age} onChange={(e) => patch({ age: Number(e.target.value) })} /></Field>
                <Field label="Equation used"><select value={state.sexEquation} onChange={(e) => patch({ sexEquation: e.target.value as "male" | "female" })}><option value="male">Male</option><option value="female">Female</option></select></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height"><div className="unit-input"><input inputMode="decimal" type="number" value={state.heightCm} onChange={(e) => patch({ heightCm: Number(e.target.value) })} /><span>cm</span></div></Field>
                <Field label="Current weight"><div className="unit-input"><input inputMode="decimal" type="number" value={state.weightKg} onChange={(e) => patch({ weightKg: Number(e.target.value) })} /><span>kg</span></div></Field>
              </div>
              <InfoCard>We use these only to make the starting estimate more sensible. No body-fat estimate, target photo, or advanced macro setup required.</InfoCard>
            </div>
          </OnboardingSection>
        )}

        {step === 3 && (
          <OnboardingSection title="What does a normal day look like?" copy="This is only a starting estimate. We’ll learn from your real trend later." footer={<Continue onClick={() => setStep(4)} />}>
            <div className="mt-5 space-y-2.5">
              {([
                ["seated", "Mostly seated", "Desk work, school, driving, or a generally low-step day."],
                ["light", "Lightly active", "Some walking and normal daily movement, with a few active periods."],
                ["active", "Active", "On your feet a lot, regular sports, or frequent purposeful activity."],
                ["very", "Very active", "A physically demanding routine or high weekly activity."],
              ] as const).map(([value, title, copy]) => (
                <button key={value} onClick={() => patch({ activity: value })} className={cx("start-choice w-full text-left", state.activity === value && "selected-choice")}>
                  <span className="activity-dot" /><span className="flex-1"><strong>{title}</strong><small>{copy}</small></span>{state.activity === value && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </OnboardingSection>
        )}

        {step === 4 && (
          <OnboardingSection title="What can you realistically train?" copy="A plan that fits three days beats a perfect six-day plan you cannot keep." footer={<Continue onClick={() => setStep(5)} />}>
            <div className="mt-5 space-y-5">
              <ChoiceGroup label="Days per week" hint="2–3 is a strong beginner starting point."><div className="chip-row">{[1,2,3,4,5,6].map((n) => <button key={n} onClick={() => patch({ trainingDays: n })} className={cx("number-chip", state.trainingDays === n && "chip-active")}>{n}</button>)}</div></ChoiceGroup>
              <ChoiceGroup label="Time per session"><div className="chip-row wrap">{[15,20,30,45,60,75,90].map((n) => <button key={n} onClick={() => patch({ sessionMinutes: n })} className={cx("text-chip", state.sessionMinutes === n && "chip-active")}>{n} min</button>)}</div></ChoiceGroup>
              <ChoiceGroup label="Where / equipment"><div className="chip-row wrap">{(["gym","dumbbells","home","mixed","unsure"] as Equipment[]).map((item) => <button key={item} onClick={() => patch({ equipment: item })} className={cx("text-chip capitalize", state.equipment === item && "chip-active")}>{item}</button>)}</div></ChoiceGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Experience"><select value={state.experience} onChange={(e) => patch({ experience: e.target.value as Experience })}><option value="new">New</option><option value="some">Some experience</option><option value="experienced">Experienced</option></select></Field>
                <Field label="Confidence"><select value={state.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}><option value="nervous">Nervous</option><option value="unsure">Unsure</option><option value="comfortable">Comfortable</option></select></Field>
              </div>
            </div>
          </OnboardingSection>
        )}

        {step === 5 && (
          <OnboardingSection title="What would you actually look forward to eating?" copy="Pick foods that sound good. These are positive preferences, not rules." footer={<Continue onClick={() => setStep(6)} />}>
            <div className="mt-5 flex flex-wrap gap-2.5">{foodChoices.map((food) => <button key={food} onClick={() => toggleArray("likedFoods", food)} className={cx("food-chip", state.likedFoods.includes(food) && "food-chip-active")}>{state.likedFoods.includes(food) && <Icon name="check" size={14} />}{food}</button>)}</div>
            <InfoCard className="mt-5"><strong>Meals start here.</strong><br />We rank food you want first, then make the portions work — not the other way around.</InfoCard>
          </OnboardingSection>
        )}

        {step === 6 && (
          <OnboardingSection title="How do you like to eat?" copy="A few preferences make the meal plan feel much less generic." footer={<Continue onClick={() => setStep(7)} />}>
            <div className="mt-5 space-y-5">
              <ChoiceGroup label="Cuisines"><div className="chip-row wrap">{cuisineChoices.map((item) => <button key={item} onClick={() => toggleArray("cuisines", item)} className={cx("text-chip", state.cuisines.includes(item) && "chip-active")}>{item}</button>)}</div></ChoiceGroup>
              <ChoiceGroup label="Meal formats"><div className="chip-row wrap">{formatChoices.map((item) => <button key={item} onClick={() => toggleArray("mealFormats", item)} className={cx("text-chip", state.mealFormats.includes(item) && "chip-active")}>{item}</button>)}</div></ChoiceGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cooking time"><select value={state.cookingMinutes} onChange={(e) => patch({ cookingMinutes: Number(e.target.value) })}><option value={10}>10 min</option><option value={20}>20 min</option><option value={30}>30 min</option><option value={45}>45 min</option></select></Field>
                <Field label="Meals / day"><select value={state.mealsPerDay} onChange={(e) => patch({ mealsPerDay: Number(e.target.value) })}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget"><select value={state.budget} onChange={(e) => patch({ budget: e.target.value as Budget })}><option value="low">Keep it low</option><option value="medium">Moderate</option><option value="flexible">Flexible</option></select></Field>
                <Field label="Variety"><select value={state.variety} onChange={(e) => patch({ variety: e.target.value as Variety })}><option value="repeat">I like repeats</option><option value="some">Some variety</option><option value="lots">Lots of variety</option></select></Field>
              </div>
            </div>
          </OnboardingSection>
        )}

        {step === 7 && (
          <OnboardingSection title="Anything we should keep out?" copy="Dislikes lower ranking. Allergies and never-foods remove meals entirely." footer={<Continue onClick={() => setStep(8)} />}>
            <div className="mt-5 space-y-3">
              <Field label="Foods you dislike"><input placeholder="mushrooms, tuna" value={state.dislikes.join(", ")} onChange={(e) => patch({ dislikes: list(e.target.value) })} /></Field>
              <Field label="Allergies"><input placeholder="peanuts, shellfish" value={state.allergies.join(", ")} onChange={(e) => patch({ allergies: list(e.target.value) })} /></Field>
              <Field label="Never foods"><input placeholder="anything you want fully excluded" value={state.neverFoods.join(", ")} onChange={(e) => patch({ neverFoods: list(e.target.value) })} /></Field>
              <ChoiceGroup label="Eating pattern"><div className="chip-row wrap">{(["none","vegetarian","vegan"] as DietType[]).map((item) => <button key={item} onClick={() => patch({ dietType: item })} className={cx("text-chip capitalize", state.dietType === item && "chip-active")}>{item === "none" ? "No restriction" : item}</button>)}</div></ChoiceGroup>
            </div>
          </OnboardingSection>
        )}

        {step === 8 && (
          <OnboardingSection title="One quick safety check." copy="This only changes how conservative the plan should be. It does not diagnose anything." footer={<Continue onClick={() => setStep(9)} label="Show my starting plan" />}>
            <div className="mt-5 space-y-2.5">
              {healthChoices.map((item) => <button key={item} onClick={() => toggleArray("healthFlags", item)} className={cx("safety-row", state.healthFlags.includes(item) && "selected-choice")}><span className="health-check">{state.healthFlags.includes(item) && <Icon name="check" size={16} />}</span><span>{item}</span></button>)}
              <button onClick={() => patch({ healthFlags: [] })} className={cx("safety-row", state.healthFlags.length === 0 && "selected-choice")}><span className="health-check">{state.healthFlags.length === 0 && <Icon name="check" size={16} />}</span><span>None of these</span></button>
            </div>
          </OnboardingSection>
        )}

        {step === 9 && !building && (
          <OnboardingSection title="Simple enough to use today." copy="These are starting estimates, not judgments or permanent limits." eyebrow="YOUR STARTING POINT" footer={<Continue onClick={complete} label="Build my first week" />}>
            <div className="mt-5 rounded-[28px] bg-[#17483F] p-5 text-white shadow-[0_14px_40px_rgba(23,72,63,.14)]">
              <p className="text-sm text-white/65">{GOAL_LABELS[state.goal]}</p>
              <div className="mt-5 grid grid-cols-2 gap-4"><Metric big={`${targets.calories.toLocaleString()}`} label="calories / day" inverse /><Metric big={`${targets.proteinGrams}g`} label={`protein · ${targets.proteinRange[0]}–${targets.proteinRange[1]}g range`} inverse /></div>
              <div className="my-5 h-px bg-white/15" />
              <div className="flex items-center justify-between text-sm"><span>{state.trainingDays} workouts / week</span><span>{state.sessionMinutes} min each</span></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="Food direction" value={state.likedFoods.slice(0,2).join(" + ") || "Your favorites"} /><MiniCard label="First review" value="After enough trend data" /></div>
            <InfoCard className="mt-3">{targets.note}</InfoCard>
          </OnboardingSection>
        )}

        {building && (
          <section className="grid flex-1 place-items-center text-center">
            <div className="w-full max-w-xs"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ECF3EE] text-[#17483F]"><Icon name="spark" size={24} /></div><h1 className="mt-6 text-3xl font-semibold tracking-[-.035em]">Building your first week</h1><div className="mt-7 space-y-3 text-left text-sm text-[#66716D]"><BuildRow text="Understanding your preferences" /><BuildRow text="Estimating a safe starting target" /><BuildRow text="Choosing meals you would actually eat" /><BuildRow text="Building a manageable workout rhythm" /></div><div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-[#E6E0D6]"><div className="loading-bar h-full rounded-full bg-[#17483F]" /></div></div></div>
          </section>
        )}
      </div>
    </div>
  );
}

function OnboardingSection({ title, copy, eyebrow, children, footer }: { title: string; copy: string; eyebrow?: string; children: ReactNode; footer?: ReactNode }) {
  return <section className="flex flex-1 flex-col">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="start-title">{title}</h1><p className="start-subtitle">{copy}</p>{children}{footer && <div className="mt-auto pt-5">{footer}</div>}</section>;
}

function Continue({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="start-primary w-full">{label}<Icon name="arrow" size={18} /></button>;
}

function WelcomeMini({ icon, label }: { icon: IconName; label: string }) {
  return <div className="welcome-mini"><span><Icon name={icon} size={18} /></span><small>{label}</small></div>;
}

function BuildRow({ text }: { text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#ECF3EE] text-[#17483F]"><Icon name="check" size={14} /></span>{text}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="start-field"><span>{label}</span>{children}</label>;
}

function ChoiceGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><div className="mb-2 flex items-end justify-between gap-3"><p className="start-label !mb-0">{label}</p>{hint && <span className="text-right text-[10px] text-[#8A928F]">{hint}</span>}</div>{children}</div>;
}

function InfoCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[20px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#49655C]", className)}>{children}</div>;
}

function Metric({ big, label, inverse }: { big: string; label: string; inverse?: boolean }) {
  return <div><p className="text-[28px] font-semibold tracking-[-.035em]">{big}</p><p className={cx("mt-1 text-xs", inverse ? "text-white/60" : "text-[#7A8581]")}>{label}</p></div>;
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="mini-card"><span>{label}</span><strong>{value}</strong></div>;
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <header className="mb-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="text-[34px] font-semibold leading-[1.04] tracking-[-.04em]">{title}</h1></div>{action}</div>{copy && <p className="mt-2 text-[15px] leading-6 text-[#68736F]">{copy}</p>}</header>;
}

function TodayView({ state, targets, meals, workout, setTab, onStartWorkout, onMeal, onSwap, openProfile }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; workout: WorkoutPlan; setTab: (tab: AppTab) => void; onStartWorkout: () => void; onMeal: (id: string) => void; onSwap: (id: string) => void; openProfile: () => void }) {
  const completedToday = state.workoutLogs.some((log) => log.date === todayKey() && log.completed);
  const proteinLogged = meals.filter((item) => state.eatenMealIds.includes(item.meal.id)).reduce((sum, item) => sum + item.protein, 0);
  const nextMeal = meals.find((item) => !state.eatenMealIds.includes(item.meal.id)) ?? meals[0];
  const nextIsWorkout = !completedToday;
  return <div>
    <PageHeader eyebrow={friendlyDate().toUpperCase()} title="Here’s your manageable plan." copy="One useful thing at a time. You do not need a perfect day." action={<button onClick={openProfile} className="avatar-button" aria-label="Profile"><Icon name="user" size={19} /></button>} />

    <section className="hero-card">
      <div className="flex items-center justify-between"><span className="hero-pill">NEXT STEP</span><span className="flex items-center gap-1.5 text-xs font-semibold text-[#68736F]"><Icon name="clock" size={15} />{nextIsWorkout ? workout.minutes : nextMeal?.meal.prepMinutes ?? 10} min</span></div>
      <h2 className="mt-5 text-[25px] font-semibold leading-tight tracking-[-.03em]">{nextIsWorkout ? `Do ${workout.name}.` : `Make ${nextMeal?.meal.name}.`}</h2>
      <p className="mt-2 text-[15px] leading-6 text-[#5E6C68]">{nextIsWorkout ? workout.note : nextMeal?.meal.why}</p>
      <div className="mt-5 flex gap-2"><button onClick={nextIsWorkout ? onStartWorkout : () => nextMeal && onMeal(nextMeal.meal.id)} className="start-primary flex-1">{nextIsWorkout ? "Start workout" : "View meal"}<Icon name="arrow" size={17} /></button><button onClick={() => setTab("coach")} className="icon-button" aria-label="Make this easier"><Icon name="coach" size={20} /></button></div>
    </section>

    <section className="dashboard-card mt-3">
      <div className="flex items-center justify-between"><div><div className="card-kicker">FOOD TODAY</div><p className="mt-1 text-sm text-[#68736F]">{state.eatenMealIds.length} logged · {proteinLogged}g protein so far</p></div><button onClick={() => setTab("eat")} className="text-link">See all</button></div>
      <div className="mt-4 space-y-2">{meals.slice(0, 3).map((item) => <button key={item.meal.id} onClick={() => onMeal(item.meal.id)} className="today-meal-row"><span className={cx("status-dot", state.eatenMealIds.includes(item.meal.id) && "status-done")}>{state.eatenMealIds.includes(item.meal.id) && <Icon name="check" size={12} />}</span><span className="min-w-0 flex-1 text-left"><strong>{item.meal.name}</strong><small>{item.protein}g protein · {item.meal.prepMinutes} min</small></span><button onClick={(event) => { event.stopPropagation(); onSwap(item.meal.id); }} className="row-action" aria-label="Swap"><Icon name="swap" size={16} /></button></button>)}</div>
    </section>

    <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="Protein" value={`${proteinLogged} / ${targets.proteinGrams}g`} /><MiniCard label="Weekly rhythm" value={`${state.workoutLogs.filter((log) => log.completed).length} sessions logged`} /></div>

    {state.detailLevel !== "simple" && <section className="dashboard-card mt-3"><div className="flex items-center justify-between"><div><div className="card-kicker">STARTING TARGET</div><p className="mt-2 text-xl font-semibold">{state.hideCalories ? "Calories hidden" : `${targets.calories.toLocaleString()} cal`}</p><p className="mt-1 text-xs text-[#818A87]">Maintenance estimate: {targets.maintenanceCalories.toLocaleString()}</p></div><button onClick={() => setTab("coach")} className="soft-button">Adjust</button></div></section>}

    <section className="mt-3 rounded-[24px] bg-[#EAE6F5] p-4"><div className="flex gap-3"><span className="mt-0.5 text-[#655F7D]"><Icon name="coach" size={20} /></span><button onClick={() => setTab("coach")} className="text-left"><p className="text-sm font-semibold">Something does not fit?</p><p className="mt-1 text-sm leading-5 text-[#64656B]">Tell Coach in normal words: “I only have 20 minutes today.”</p></button></div></section>
  </div>;
}

function EatView({ state, targets, meals, onMeal, onSwap, toggleEaten, showPrep, setShowPrep }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; onMeal: (id: string) => void; onSwap: (id: string) => void; toggleEaten: (id: string) => void; showPrep: boolean; setShowPrep: (value: boolean) => void }) {
  const logged = meals.filter((item) => state.eatenMealIds.includes(item.meal.id));
  const caloriesLogged = logged.reduce((sum, item) => sum + item.calories, 0);
  const proteinLogged = logged.reduce((sum, item) => sum + item.protein, 0);
  return <div>
    <PageHeader eyebrow="EAT" title="Food you’d actually choose." copy="Your preferences come first. Targets shape the portions, not your entire personality." />
    <section className="nutrition-banner"><div><p className="card-kicker !text-white/55">TODAY</p><p className="mt-2 text-[27px] font-semibold tracking-[-.03em]">{state.hideCalories ? "Calories hidden" : `${caloriesLogged} / ${targets.calories.toLocaleString()}`}</p><p className="mt-1 text-xs text-white/55">{state.hideCalories ? "Focus on meals + protein" : "calories logged"}</p></div><div className="text-right"><p className="text-[27px] font-semibold">{proteinLogged}g</p><p className="mt-1 text-xs text-white/55">of {targets.proteinGrams}g protein</p></div></section>

    <div className="mt-5 flex items-center justify-between"><p className="section-label">YOUR DAY</p><button onClick={() => setShowPrep(!showPrep)} className="soft-button"><Icon name="grocery" size={15} /> Prep</button></div>
    <div className="mt-3 space-y-3">{meals.map((item, index) => <article key={`${item.slot}-${item.meal.id}`} className="meal-card"><button onClick={() => onMeal(item.meal.id)} className={cx("meal-art", index % 4 === 0 ? "meal-butter" : index % 4 === 1 ? "meal-peach" : index % 4 === 2 ? "meal-blue" : "meal-sage")} aria-label={`Open ${item.meal.name}`}>{item.meal.type.charAt(0)}</button><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#89918E]">{item.slot}</p><span className="portion-pill">{item.portion}</span></div><button onClick={() => onMeal(item.meal.id)} className="mt-1 block text-left font-semibold leading-5">{item.meal.name}</button><p className="mt-1 text-[13px] text-[#68736F]">{item.protein}g protein · {item.meal.prepMinutes} min{state.hideCalories ? "" : ` · ${item.calories} cal`}</p><p className="mt-2 text-xs leading-5 text-[#7D8682]">{item.meal.why}</p><div className="mt-3 flex gap-2"><button onClick={() => toggleEaten(item.meal.id)} className={cx("tiny-button", state.eatenMealIds.includes(item.meal.id) && "tiny-active")}><Icon name="check" size={13} />{state.eatenMealIds.includes(item.meal.id) ? "Logged" : "I ate this"}</button><button onClick={() => onSwap(item.meal.id)} className="tiny-button"><Icon name="swap" size={13} />Swap</button></div></div></article>)}</div>

    {showPrep && <PrepCard meals={meals} />}
  </div>;
}

function PrepCard({ meals }: { meals: PlannedMeal[] }) {
  const ingredients = Array.from(new Set(meals.flatMap((item) => item.meal.ingredients.map((ingredient) => ingredient.name))));
  return <section className="dashboard-card mt-4"><div className="flex items-center gap-2"><span className="text-[#17483F]"><Icon name="grocery" size={19} /></span><div><p className="font-semibold">Grocery & prep</p><p className="text-xs text-[#7D8582]">Built from the meals already in your day.</p></div></div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">{ingredients.slice(0, 10).map((item) => <div key={item} className="flex items-center gap-2 text-xs text-[#58645F]"><span className="h-1.5 w-1.5 rounded-full bg-[#6E9084]" />{item}</div>)}</div><p className="mt-4 rounded-xl bg-[#FCFAF6] p-3 text-xs leading-5 text-[#707A76]">Easy prep: cook the main protein and starch in batches, then keep sauces and vegetables separate so meals do not feel identical.</p></section>;
}

function TrainView({ state, workout, startWorkout, setTab }: { state: AppState; workout: WorkoutPlan; startWorkout: () => void; setTab: (tab: AppTab) => void }) {
  const completed = state.workoutLogs.filter((log) => log.completed).length;
  return <div>
    <PageHeader eyebrow="TRAIN" title="A workout you can repeat." copy={`${workout.minutes} minutes · ${workout.equipment} · ${workout.focus}`} />
    <section className="hero-card"><div className="flex items-center justify-between"><span className="hero-pill">{state.trainingDays <= 3 ? "FULL BODY" : "STRENGTH"}</span><span className="text-xs text-[#68736F]">{workout.exercises.length} movements</span></div><h2 className="mt-4 text-[25px] font-semibold tracking-[-.03em]">{workout.name}</h2><p className="mt-2 text-sm leading-6 text-[#68736F]">{workout.note}</p>{state.todayOverride.note && <div className="mt-3 rounded-xl bg-[#EAE6F5] px-3 py-2 text-xs text-[#625F71]">Today-only override active. Your normal program is unchanged.</div>}<button onClick={startWorkout} className="start-primary mt-5 w-full">Start workout <Icon name="arrow" size={17} /></button></section>
    <div className="mt-4 space-y-2.5">{workout.exercises.map((item, index) => <article key={item.exercise.id} className="exercise-row"><span className="exercise-number">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.exercise.name}</h3><p className="mt-1 text-sm text-[#68736F]">{item.sets} sets · {item.reps}</p>{state.detailLevel === "detailed" && <><p className="mt-1 text-xs text-[#909895]">Previous: {item.previous}</p><p className="mt-1 text-xs leading-5 text-[#7A8581]">{item.exercise.cue}</p></>}</div><span className="text-[#AAB2AE]"><Icon name="chevron" size={17} /></span></article>)}</div>
    <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="This week" value={`${Math.min(completed, state.trainingDays)} of ${state.trainingDays} sessions`} /><MiniCard label="Session length" value={`${workout.minutes} minutes`} /></div>
    <button onClick={() => setTab("coach")} className="coach-inline mt-3"><Icon name="coach" size={18} /><span><strong>Need to change today?</strong><small>“No equipment” · “Only 20 minutes”</small></span><Icon name="chevron" size={16} /></button>
  </div>;
}

function ActiveWorkoutView({ workout, setChecks, toggleSet, finish, close, state, onSwap }: { workout: WorkoutPlan; setChecks: Record<string, boolean[]>; toggleSet: (exerciseId: string, index: number) => void; finish: () => void; close: () => void; state: AppState; onSwap: (exerciseId: string, replacementId: string) => void }) {
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const selected = swapFor ? workout.exercises.find((item) => item.exercise.id === swapFor) : undefined;
  const alternatives = selected ? alternativeExercises(selected.exercise.id, state) : [];
  const completedSets = Object.values(setChecks).flat().filter(Boolean).length;
  const totalSets = workout.exercises.reduce((sum, item) => sum + item.sets, 0);
  return <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]"><div className="start-shell pb-8"><div className="sticky top-0 z-20 border-b border-[#E6E0D6] bg-[#F7F4EE]/95 px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur"><div className="flex items-center justify-between"><button onClick={close} className="round-button"><Icon name="close" /></button><div className="text-center"><p className="text-[10px] font-extrabold tracking-[.14em] text-[#78837E]">ACTIVE WORKOUT</p><p className="mt-0.5 text-sm font-semibold">{workout.name}</p></div><span className="rounded-full bg-[#ECF3EE] px-3 py-2 text-xs font-bold text-[#17483F]">{completedSets}/{totalSets}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E6E0D6]"><div className="h-full rounded-full bg-[#17483F] transition-all" style={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }} /></div></div>
      <main className="px-5 py-5"><div className="mb-4 rounded-[22px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#526860]">Keep 2–3 good reps in reserve. You do not need to earn exhaustion for the workout to count.</div><div className="space-y-3">{workout.exercises.map((item, exerciseIndex) => <article key={item.exercise.id} className="active-exercise"><div className="flex items-start justify-between gap-3"><div><p className="card-kicker">{exerciseIndex + 1} · {item.exercise.focus.join(" + ")}</p><h2 className="mt-1 text-lg font-semibold">{item.exercise.name}</h2><p className="mt-1 text-xs leading-5 text-[#77817D]">{item.exercise.cue}</p></div><button onClick={() => setSwapFor(item.exercise.id)} className="soft-button"><Icon name="swap" size={14} /> Swap</button></div><div className="mt-4 grid grid-cols-[44px_1fr_1fr_46px] gap-2 text-center text-[10px] font-bold uppercase tracking-[.08em] text-[#8A938F]"><span>Set</span><span>Previous</span><span>Today</span><span>Done</span></div>{Array.from({ length: item.sets }, (_, index) => <div key={index} className="set-row"><span className="set-number">{index + 1}</span><span className="text-center text-xs text-[#6E7874]">{item.previous}</span><span className="text-center text-xs font-semibold text-[#34413D]">8–12 reps</span><button onClick={() => toggleSet(item.exercise.id, index)} className={cx("set-check", setChecks[item.exercise.id]?.[index] && "set-check-done")} aria-label="Complete set">{setChecks[item.exercise.id]?.[index] && <Icon name="check" size={16} />}</button></div>)}</article>)}</div><button onClick={finish} className="start-primary mt-5 w-full">Finish workout <Icon name="check" size={17} /></button><p className="mt-3 text-center text-xs text-[#858D89]">Partial completion still counts. The log records what you actually did.</p></main></div>
      {selected && <BottomSheet close={() => setSwapFor(null)} title={`Swap ${selected.exercise.name}`}><p className="text-sm leading-6 text-[#68736F]">Same movement role, filtered to your current equipment and dislikes.</p><div className="mt-4 space-y-2">{alternatives.map((alt) => <button key={alt.id} onClick={() => { onSwap(selected.exercise.id, alt.id); setSwapFor(null); }} className="swap-option"><span><strong>{alt.name}</strong><small>{alt.focus.join(" + ")} · {alt.stable ? "stable setup" : "free movement"}</small></span><Icon name="chevron" size={17} /></button>)}</div></BottomSheet>}
    </div>;
}

function ProgressView({ state, review, targets, patch, setTab }: { state: AppState; review: ReturnType<typeof reviewProgress>; targets: ReturnType<typeof currentTargets>; patch: (update: Partial<AppState>) => void; setTab: (tab: AppTab) => void }) {
  const trend = smoothedWeightTrend(state.weightLog, 7);
  const workouts = state.workoutLogs.filter((log) => log.completed).length;
  function logWeight() {
    const current = state.weightLog[state.weightLog.length - 1]?.weight ?? state.weightKg;
    patch({ weightLog: [...state.weightLog, { date: todayKey(), weight: current }] });
  }
  function applyReview() {
    if (!review.suggestedCalorieChange) return;
    patch({ calorieOverride: targets.calories + review.suggestedCalorieChange });
  }
  return <div>
    <PageHeader eyebrow="PROGRESS" title="Trust the trend, not one dot." copy="We wait for enough data before suggesting a change." />
    <section className="dashboard-card"><div className="flex items-start justify-between gap-3"><div><p className="card-kicker">YOUR TREND</p><p className="mt-2 text-[30px] font-semibold tracking-[-.035em]">{review.trendNow?.toFixed(1) ?? "—"} kg</p><p className="mt-1 text-sm text-[#68736F]">{review.change === null ? "No trend yet" : `${review.change > 0 ? "+" : ""}${review.change.toFixed(1)} kg across the smoothed sample`}</p></div><button onClick={logWeight} className="soft-button"><Icon name="plus" size={14} /> Log weight</button></div><TrendChart points={trend} /><p className="mt-3 text-xs leading-5 text-[#7C8582]">Raw readings are light dots. The darker line is the smoothed trend we actually pay attention to.</p></section>
    <section className={cx("mt-3 rounded-[24px] p-4", review.ready ? "bg-[#ECF3EE]" : "bg-[#E7EFF5]")}><div className="flex items-start gap-3"><span className="mt-0.5 text-[#17483F]"><Icon name="target" size={20} /></span><div className="flex-1"><p className="font-semibold">{review.ready ? "Trend review" : "Still learning your trend"}</p><p className="mt-1 text-sm leading-6 text-[#5D6965]">{review.message}</p>{review.suggestedCalorieChange !== 0 && <button onClick={applyReview} className="soft-button mt-3">Apply {review.suggestedCalorieChange > 0 ? "+" : ""}{review.suggestedCalorieChange} calories</button>}</div></div></section>
    <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="Training" value={`${workouts} workouts logged`} /><MiniCard label="Food" value={`${state.eatenMealIds.length} meals logged`} /><MiniCard label="Trend data" value={`${review.readings} readings`} /><MiniCard label="Current target" value={state.hideCalories ? "Calories hidden" : `${targets.calories} cal`} /></div>
    <button onClick={() => setTab("coach")} className="coach-inline mt-3"><Icon name="coach" size={18} /><span><strong>Want to change the pace?</strong><small>Coach can explain the tradeoff before changing it.</small></span><Icon name="chevron" size={16} /></button>
  </div>;
}

function TrendChart({ points }: { points: ReturnType<typeof smoothedWeightTrend> }) {
  if (points.length < 2) return <div className="mt-6 grid h-32 place-items-center rounded-2xl bg-[#FCFAF6] text-sm text-[#8A928F]">Add a few readings to see the trend.</div>;
  const values = points.flatMap((point) => [point.weight, point.trend]);
  const min = Math.min(...values) - 0.25;
  const max = Math.max(...values) + 0.25;
  const range = Math.max(0.5, max - min);
  const x = (index: number) => 8 + (index / (points.length - 1)) * 284;
  const y = (value: number) => 106 - ((value - min) / range) * 90;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.trend).toFixed(1)}`).join(" ");
  return <svg className="mt-5 h-32 w-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none"><line x1="0" y1="108" x2="300" y2="108" stroke="#E6E0D6" strokeWidth="1" />{points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.weight)} r="3.2" fill="#A7B8B0" opacity=".45" />)}<path d={path} fill="none" stroke="#17483F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CoachView({ state, targets, coachText, setCoachText, submit, canUndo, undo }: { state: AppState; targets: ReturnType<typeof currentTargets>; coachText: string; setCoachText: (value: string) => void; submit: (event: FormEvent) => void; canUndo: boolean; undo: () => void }) {
  const suggestions = ["I only have 20 minutes today", "I want to do a lean bulk", "Make my meals cheaper", state.hideCalories ? "Show calories" : "Hide calories"];
  return <div>
    <PageHeader eyebrow="COACH" title="Change the plan in normal words." copy="Coach uses your current plan and preferences, then applies validated changes to the app." action={canUndo ? <button onClick={undo} className="soft-button"><Icon name="undo" size={14} /> Undo</button> : undefined} />
    <div className="context-strip"><span><strong>{GOAL_LABELS[state.goal]}</strong><small>goal</small></span><span><strong>{targets.proteinGrams}g</strong><small>protein</small></span><span><strong>{state.trainingDays} × {state.sessionMinutes}</strong><small>training</small></span></div>
    <div className="mt-5 space-y-3">{state.coachHistory.slice(-8).map((message) => <div key={message.id} className={cx("coach-message", message.role === "user" ? "coach-user" : "coach-assistant")}><div className="flex items-start gap-2.5">{message.role === "coach" && <span className="coach-mark"><Icon name="spark" size={14} /></span>}<div className="min-w-0 flex-1"><p>{message.text}</p>{message.changeSummary && <div className="change-summary"><Icon name="check" size={14} /><span>{message.changeSummary}</span></div>}</div></div></div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setCoachText(suggestion)} className="suggestion-chip">{suggestion}</button>)}</div>
    <form onSubmit={submit} className="coach-composer"><textarea rows={3} value={coachText} onChange={(e) => setCoachText(e.target.value)} placeholder="Try: From now on I can train 3 days for 30 minutes..." /><div className="mt-2 flex items-center justify-between"><p className="text-[10px] leading-4 text-[#8B938F]">Changes use deterministic targets and guardrails.</p><button className="send-button" type="submit" aria-label="Send"><Icon name="arrow" size={18} /></button></div></form>
  </div>;
}

function MealDetail({ meal, state, close, swap, toggleEaten }: { meal: Meal; state: AppState; close: () => void; swap: () => void; toggleEaten: (id: string) => void }) {
  const macros = mealMacros(meal);
  const eaten = state.eatenMealIds.includes(meal.id);
  return <BottomSheet close={close} title={meal.name}><div className="flex flex-wrap gap-2"><span className="detail-pill">{meal.type}</span><span className="detail-pill"><Icon name="clock" size={13} /> {meal.prepMinutes} min</span><span className="detail-pill">{macros.protein}g protein</span>{!state.hideCalories && <span className="detail-pill">{macros.calories} cal</span>}</div><p className="mt-4 text-sm leading-6 text-[#68736F]">{meal.why}</p><p className="section-label mt-5">INGREDIENTS</p><div className="mt-2 divide-y divide-[#EEE9E1]">{meal.ingredients.map((ingredient) => <div key={ingredient.name} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{ingredient.name}</p><p className="mt-0.5 text-xs text-[#7D8582]">{ingredient.amount}</p></div><div className="text-right text-xs text-[#68736F]"><p>{ingredient.protein}g protein</p>{!state.hideCalories && <p className="mt-0.5">{ingredient.calories} cal</p>}</div></div>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => toggleEaten(meal.id)} className={cx("start-primary", eaten && "!bg-[#6E9084]")}>{eaten ? <><Icon name="check" size={17} /> Logged</> : "I ate this"}</button><button onClick={swap} className="start-secondary"><Icon name="swap" size={16} /> Swap</button></div></BottomSheet>;
}

function MealSwap({ source, state, ranked, close, choose }: { source: Meal; state: AppState; ranked: Meal[]; close: () => void; choose: (meal: Meal) => void }) {
  const options = ranked.filter((meal) => meal.id !== source.id && (meal.type === source.type || meal.format === source.format)).slice(0, 5);
  return <BottomSheet close={close} title={`Swap ${source.type.toLowerCase()}`}><p className="text-sm leading-6 text-[#68736F]">These stay close to the same role in your day and are already filtered through your hard exclusions.</p><div className="mt-4 space-y-2.5">{options.map((meal) => { const macro = mealMacros(meal); return <button key={meal.id} onClick={() => choose(meal)} className="swap-option"><span><strong>{meal.name}</strong><small>{macro.protein}g protein · {meal.prepMinutes} min{state.hideCalories ? "" : ` · ${macro.calories} cal`}</small></span><Icon name="chevron" size={17} /></button>; })}{options.length === 0 && <InfoCard>No close replacement is available with the current hard exclusions. Coach can help change the meal direction instead.</InfoCard>}</div></BottomSheet>;
}

function ProfileSheet({ state, targets, patch, close, reset }: { state: AppState; targets: ReturnType<typeof currentTargets>; patch: (update: Partial<AppState>) => void; close: () => void; reset: () => void }) {
  return <BottomSheet close={close} title="Your plan settings"><div className="grid grid-cols-2 gap-3"><MiniCard label="Goal" value={GOAL_LABELS[state.goal]} /><MiniCard label="Starting target" value={state.hideCalories ? "Calories hidden" : `${targets.calories} cal`} /></div><div className="mt-5 space-y-3"><SettingRow title="Hide calories" copy="Meals and protein stay visible." control={<button onClick={() => patch({ hideCalories: !state.hideCalories })} className={cx("toggle", state.hideCalories && "toggle-on")}><span /></button>} /><SettingRow title="Detail level" copy="Change how much information appears on normal screens." control={<select className="mini-select" value={state.detailLevel} onChange={(e) => patch({ detailLevel: e.target.value as AppState["detailLevel"] })}><option value="simple">Simple</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select>} /><SettingRow title="Grocery & prep" copy="Keep prep tools available under Eat." control={<button onClick={() => patch({ showPrep: !state.showPrep })} className={cx("toggle", state.showPrep && "toggle-on")}><span /></button>} /></div><div className="mt-5 rounded-[20px] bg-[#FCFAF6] p-4"><p className="text-xs font-bold text-[#68736F]">ESTIMATE DETAILS</p><div className="mt-3 grid grid-cols-2 gap-y-3 text-sm"><span className="text-[#7D8582]">Maintenance</span><strong className="text-right">{targets.maintenanceCalories} cal</strong><span className="text-[#7D8582]">Protein range</span><strong className="text-right">{targets.proteinRange[0]}–{targets.proteinRange[1]}g</strong><span className="text-[#7D8582]">Activity</span><strong className="text-right capitalize">{state.activity}</strong></div></div><button onClick={reset} className="mt-6 w-full rounded-2xl border border-[#E6E0D6] bg-white px-4 py-3 text-sm font-semibold text-[#7A514D]">Restart onboarding</button></BottomSheet>;
}

function SettingRow({ title, copy, control }: { title: string; copy: string; control: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[#E6E0D6] bg-white p-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#7D8582]">{copy}</p></div>{control}</div>;
}

function BottomSheet({ close, title, children }: { close: () => void; title: string; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16221E]/25 px-2 backdrop-blur-[2px]" onMouseDown={close}><section onMouseDown={(event) => event.stopPropagation()} className="sheet w-full max-w-[430px]"><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8D5CF]" /><div className="flex items-center justify-between gap-3"><h2 className="text-[24px] font-semibold tracking-[-.03em]">{title}</h2><button onClick={close} className="round-button" aria-label="Close"><Icon name="close" size={18} /></button></div><div className="mt-4">{children}</div></section></div>;
}

function BottomNav({ tab, setTab }: { tab: AppTab; setTab: (tab: AppTab) => void }) {
  const items: Array<{ id: AppTab; label: string; icon: IconName }> = [
    { id: "today", label: "Today", icon: "home" }, { id: "eat", label: "Eat", icon: "eat" }, { id: "train", label: "Train", icon: "train" }, { id: "progress", label: "Progress", icon: "progress" }, { id: "coach", label: "Coach", icon: "coach" },
  ];
  return <nav className="bottom-nav">{items.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={cx("nav-item", tab === item.id && "nav-active")}><Icon name={item.icon} size={20} /><small>{item.label}</small></button>)}</nav>;
}
