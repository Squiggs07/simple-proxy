"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  calculateTargets,
  Goal,
  GOAL_LABELS,
  ProfileInput,
  validateCalorieTarget,
  validateProteinTarget,
} from "@/lib/startHereEngine";

type Tab = "today" | "eat" | "train" | "progress" | "coach";
type Equipment = "gym" | "dumbbells" | "home" | "mixed" | "unsure";
type Experience = "new" | "some" | "experienced";

interface AppState {
  onboarded: boolean;
  goal: Goal;
  age: number;
  sexEquation: "male" | "female";
  heightCm: number;
  weightKg: number;
  activity: Activity;
  trainingDays: number;
  sessionMinutes: number;
  equipment: Equipment;
  experience: Experience;
  likedFoods: string[];
  dislikes: string[];
  allergies: string[];
  healthFlag: boolean;
  calorieOverride: number | null;
  proteinOverride: number | null;
  hideCalories: boolean;
  simpleMode: boolean;
  dislikedExercises: string[];
  todayMinutes: number | null;
  todayEquipment: Equipment | null;
}

const initialState: AppState = {
  onboarded: false,
  goal: "unsure",
  age: 25,
  sexEquation: "male",
  heightCm: 178,
  weightKg: 82,
  activity: "light",
  trainingDays: 3,
  sessionMinutes: 45,
  equipment: "gym",
  experience: "new",
  likedFoods: ["Chicken bowls", "Pasta", "Eggs"],
  dislikes: [],
  allergies: [],
  healthFlag: false,
  calorieOverride: null,
  proteinOverride: null,
  hideCalories: false,
  simpleMode: true,
  dislikedExercises: [],
  todayMinutes: null,
  todayEquipment: null,
};

const goalOptions: { goal: Goal; title: string; copy: string; tone: string }[] = [
  { goal: "lose", title: "Lose fat", copy: "Reduce calories while protecting muscle.", tone: "lavender" },
  { goal: "gain", title: "Build muscle", copy: "A small surplus and repeatable strength plan.", tone: "mint" },
  { goal: "strength", title: "Feel stronger", copy: "Build strength, energy, and useful habits.", tone: "green" },
  { goal: "maintain", title: "Maintain weight", copy: "Keep weight steady while improving fitness.", tone: "peach" },
  { goal: "unsure", title: "I’m not sure", copy: "We’ll help you choose a sensible starting point.", tone: "stone" },
];

const foodOptions = [
  "Chicken bowls",
  "Pasta",
  "Wraps",
  "Sandwiches",
  "Steak",
  "Salmon",
  "Eggs",
  "Greek yogurt",
  "Rice bowls",
  "Tacos",
  "Smoothies",
  "Breakfast foods",
];

const mealSeed = [
  { id: "m1", name: "Chicken rice bowl", type: "Lunch", calories: 610, protein: 52, time: 18, tags: ["Chicken bowls", "Rice bowls"], why: "High protein, familiar ingredients, easy to scale." },
  { id: "m2", name: "Turkey pesto pasta", type: "Dinner", calories: 720, protein: 48, time: 22, tags: ["Pasta"], why: "A real pasta meal with enough protein to fit the day." },
  { id: "m3", name: "Egg & avocado toast plate", type: "Breakfast", calories: 510, protein: 31, time: 12, tags: ["Eggs", "Breakfast foods"], why: "Quick, filling, and easy to repeat." },
  { id: "m4", name: "Salmon potato plate", type: "Dinner", calories: 660, protein: 46, time: 25, tags: ["Salmon"], why: "Simple whole-food dinner without feeling like diet food." },
  { id: "m5", name: "Chicken Caesar wrap", type: "Lunch", calories: 560, protein: 47, time: 10, tags: ["Wraps", "Chicken bowls"], why: "Fast enough for a busy day and still protein-forward." },
  { id: "m6", name: "Greek yogurt crunch bowl", type: "Breakfast", calories: 430, protein: 36, time: 5, tags: ["Greek yogurt", "Breakfast foods"], why: "Five-minute option when cooking is not happening." },
];

const nav: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "⌂" },
  { id: "eat", label: "Eat", icon: "◒" },
  { id: "train", label: "Train", icon: "↗" },
  { id: "progress", label: "Progress", icon: "⌁" },
  { id: "coach", label: "Coach", icon: "✦" },
];

function cls(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function formatCalories(value: number, hidden: boolean) {
  return hidden ? "Calories hidden" : `${value.toLocaleString()} cal`;
}

export function StartHereApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>("today");
  const [coachText, setCoachText] = useState("");
  const [coachReply, setCoachReply] = useState("Tell me what doesn’t fit, in normal words. I can change the actual plan.");
  const [previousState, setPreviousState] = useState<AppState | null>(null);
  const [mealSwapped, setMealSwapped] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [weightLog, setWeightLog] = useState([82.5, 82.1, 82.3, 81.9, 81.8, 81.6, 81.7]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("start-here-state-v2");
      if (saved) setState({ ...initialState, ...JSON.parse(saved) });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("start-here-state-v2", JSON.stringify(state));
  }, [state, ready]);

  const profile: ProfileInput = useMemo(() => ({
    goal: state.goal,
    age: state.age,
    sexEquation: state.sexEquation,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    activity: state.activity,
    healthFlag: state.healthFlag,
  }), [state]);

  const baseTargets = useMemo(() => calculateTargets(profile), [profile]);
  const calories = state.calorieOverride ?? baseTargets.calories;
  const protein = state.proteinOverride ?? baseTargets.proteinGrams;

  const meals = useMemo(() => {
    return [...mealSeed].sort((a, b) => {
      const aScore = a.tags.filter((tag) => state.likedFoods.includes(tag)).length;
      const bScore = b.tags.filter((tag) => state.likedFoods.includes(tag)).length;
      return bScore - aScore;
    });
  }, [state.likedFoods]);

  const todayMeal = mealSwapped ? meals[1] : meals[0];
  const workoutMinutes = state.todayMinutes ?? state.sessionMinutes;
  const workoutEquipment = state.todayEquipment ?? state.equipment;

  function patch(update: Partial<AppState>, remember = false) {
    if (remember) setPreviousState(state);
    setState((current) => ({ ...current, ...update }));
  }

  function toggleFood(food: string) {
    setState((current) => ({
      ...current,
      likedFoods: current.likedFoods.includes(food)
        ? current.likedFoods.filter((item) => item !== food)
        : [...current.likedFoods, food],
    }));
  }

  function finishOnboarding() {
    setStep(8);
    window.setTimeout(() => {
      patch({ onboarded: true });
      setTab("today");
    }, 1000);
  }

  function handleCoach(event: FormEvent) {
    event.preventDefault();
    const raw = coachText.trim();
    if (!raw) return;
    const text = raw.toLowerCase();
    setPreviousState(state);

    const increaseCalories = text.match(/increase (?:my )?calories(?: by)?\s*(\d+)/i);
    const decreaseCalories = text.match(/(?:decrease|lower|drop) (?:my )?calories(?: by)?\s*(\d+)/i);
    const setProtein = text.match(/(?:set|make) (?:my )?protein(?: to)?\s*(\d+)/i);

    if (text.includes("lean bulk") || (text.includes("gain muscle") && text.includes("fat"))) {
      const nextProfile = { ...profile, goal: "gain" as Goal };
      const next = calculateTargets(nextProfile);
      patch({ goal: "gain", calorieOverride: next.calories, proteinOverride: next.proteinGrams });
      setCoachReply(`I changed the plan to a cautious muscle-gain phase: a small starting surplus, ${next.proteinGrams}g protein, and we’ll judge it from the weight trend rather than one weigh-in. Zero fat gain can’t be guaranteed. What meals do you actually enjoy enough to repeat?`);
    } else if (increaseCalories) {
      const amount = Number(increaseCalories[1]);
      const next = validateCalorieTarget(calories + amount, profile, baseTargets.maintenanceCalories);
      patch({ calorieOverride: next });
      setCoachReply(`Done. Your daily target moved from ${calories} to ${next} calories. I kept the safety guardrails in place and left the rest of your plan alone.`);
    } else if (decreaseCalories) {
      const amount = Number(decreaseCalories[1]);
      const next = validateCalorieTarget(calories - amount, profile, baseTargets.maintenanceCalories);
      patch({ calorieOverride: next });
      setCoachReply(next === calories - amount ? `Done. Your daily target is now ${next} calories.` : `I didn’t take it all the way down to ${calories - amount}. The validated floor for your current profile is ${next}, so I set it there instead.`);
    } else if (setProtein) {
      const requested = Number(setProtein[1]);
      const next = validateProteinTarget(requested, calories);
      patch({ proteinOverride: next });
      setCoachReply(next === requested ? `Done. Protein is now ${next}g per day.` : `I set protein to ${next}g rather than ${requested}g so it stays within the plan’s validated calorie share.`);
    } else if (text.includes("hide calories")) {
      patch({ hideCalories: true });
      setCoachReply("Done. Calories are hidden across the main experience. Protein, meals, training, and progress stay visible.");
    } else if (text.includes("show calories")) {
      patch({ hideCalories: false });
      setCoachReply("Calories are visible again.");
    } else if (text.includes("simpler") || text.includes("less detail")) {
      patch({ simpleMode: true });
      setCoachReply("Done. I simplified the main cards so they focus on the next useful action instead of extra numbers.");
    } else if (text.includes("more detail")) {
      patch({ simpleMode: false });
      setCoachReply("Done. I’ll show more of the reasoning and target detail without changing the plan itself.");
    } else if (text.includes("hate lunges") || text.includes("no lunges")) {
      patch({ dislikedExercises: Array.from(new Set([...state.dislikedExercises, "lunges"])) });
      setCoachReply("Got it. Lunges are out of future plans. I swapped today’s lunge slot for a supported leg press pattern instead.");
    } else if (text.includes("20 minute") || text.includes("20 minutes")) {
      patch({ todayMinutes: 20 });
      setCoachReply("Today only: I shortened the workout to 20 minutes and kept the highest-value movements. Your normal schedule stays unchanged.");
    } else if (text.includes("no equipment")) {
      patch({ todayEquipment: "home" });
      setCoachReply("Today only: I changed the session to a no-equipment home version. Your normal equipment setting stays unchanged.");
    } else if (text.includes("pasta")) {
      patch({ likedFoods: Array.from(new Set([...state.likedFoods, "Pasta"])) });
      setCoachReply("Added pasta as a positive preference. I’ll rank meals with pasta higher instead of treating it like something you need to earn.");
    } else if (text.includes("turkey")) {
      setMealSwapped(true);
      setCoachReply("I swapped today’s primary meal direction toward turkey and kept the meal in roughly the same role in the day.");
    } else {
      setCoachReply("I understand the direction, but I need one detail before I change anything: is this just for today, or should I change your ongoing plan?");
    }

    setCoachText("");
  }

  function undoCoachChange() {
    if (!previousState) return;
    setState(previousState);
    setPreviousState(null);
    setCoachReply("Undone. Your previous plan is back.");
  }

  if (!ready) {
    return <div className="min-h-dvh bg-[#F7F4EE]" />;
  }

  if (!state.onboarded) {
    return (
      <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
          {step > 0 && step < 8 && (
            <div className="mb-5 flex items-center gap-3">
              <button aria-label="Back" onClick={() => setStep((s) => Math.max(0, s - 1))} className="grid h-11 w-11 place-items-center rounded-full border border-[#E6E0D6] bg-white text-xl">‹</button>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E6E0D6]">
                <div className="h-full rounded-full bg-[#17483F] transition-all" style={{ width: `${Math.min(100, (step / 7) * 100)}%` }} />
              </div>
            </div>
          )}

          {step === 0 && (
            <section className="flex flex-1 flex-col justify-between py-8">
              <div>
                <div className="mb-10 inline-flex h-12 items-center rounded-full border border-[#DCE7E0] bg-[#ECF3EE] px-4 text-sm font-semibold text-[#17483F]">START HERE</div>
                <h1 className="max-w-sm text-[46px] font-semibold leading-[1.02] tracking-[-0.045em]">Your plan can be simple.</h1>
                <p className="mt-6 max-w-sm text-[18px] leading-7 text-[#68736F]">Tell us what you want, what your life actually looks like, and what you like to eat. We’ll turn it into one manageable place to start.</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => setStep(1)} className="start-primary w-full">Start with my goal</button>
                <button onClick={() => { patch({ goal: "unsure" }); setStep(2); }} className="start-secondary w-full">I’m not sure yet</button>
                <p className="px-3 pt-2 text-center text-xs leading-5 text-[#7D8783]">No streaks. No punishment. No need to understand fitness jargon first.</p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">What would you like help with?</h1>
              <p className="start-subtitle">Choose the path that feels right for you today.</p>
              <div className="mt-6 flex flex-1 flex-col justify-between gap-2.5">
                {goalOptions.map((option) => (
                  <button key={option.goal} onClick={() => { patch({ goal: option.goal }); setStep(2); }} className="start-choice text-left">
                    <span className={cls("goal-mark", `goal-${option.tone}`)}>{option.goal === "lose" ? "↓" : option.goal === "gain" ? "↗" : option.goal === "strength" ? "✦" : option.goal === "maintain" ? "=" : "?"}</span>
                    <span className="min-w-0 flex-1"><strong>{option.title}</strong><small>{option.copy}</small></span>
                    <span className="text-2xl text-[#C7CDC9]">›</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">A few basics.</h1>
              <p className="start-subtitle">Just enough to estimate a useful starting point. You can change these later.</p>
              <div className="mt-7 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="start-field"><span>Age</span><input type="number" value={state.age} onChange={(e) => patch({ age: Number(e.target.value) })} /></label>
                  <label className="start-field"><span>Equation used</span><select value={state.sexEquation} onChange={(e) => patch({ sexEquation: e.target.value as "male" | "female" })}><option value="male">Male</option><option value="female">Female</option></select></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="start-field"><span>Height (cm)</span><input type="number" value={state.heightCm} onChange={(e) => patch({ heightCm: Number(e.target.value) })} /></label>
                  <label className="start-field"><span>Weight (kg)</span><input type="number" value={state.weightKg} onChange={(e) => patch({ weightKg: Number(e.target.value) })} /></label>
                </div>
                <div className="rounded-[22px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#49655C]">We use these only to make the starting estimate more sensible. No body-fat estimate, target photo, or advanced macro setup required.</div>
              </div>
              <div className="mt-auto pt-6"><button onClick={() => setStep(3)} className="start-primary w-full">Continue</button></div>
            </section>
          )}

          {step === 3 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">What does a normal day look like?</h1>
              <p className="start-subtitle">This is only a starting estimate. We’ll learn from your real trend later.</p>
              <div className="mt-6 space-y-3">
                {([
                  ["seated", "Mostly seated", "Desk work, school, driving, or a generally low-step day."],
                  ["light", "Lightly active", "Some walking and normal daily movement, with a few active periods."],
                  ["active", "Active", "On your feet a lot, regular sports, or frequent purposeful activity."],
                  ["very", "Very active", "A physically demanding routine or high weekly activity."],
                ] as const).map(([value, title, copy]) => (
                  <button key={value} onClick={() => patch({ activity: value })} className={cls("start-choice w-full text-left", state.activity === value && "selected-choice")}>
                    <span className="activity-dot" /><span className="flex-1"><strong>{title}</strong><small>{copy}</small></span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6"><button onClick={() => setStep(4)} className="start-primary w-full">Continue</button></div>
            </section>
          )}

          {step === 4 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">What can you realistically train?</h1>
              <p className="start-subtitle">A plan that fits three days beats a “perfect” six-day plan you can’t keep.</p>
              <div className="mt-7 space-y-6">
                <div><p className="start-label">Days per week</p><div className="chip-row">{[1,2,3,4,5,6].map((n) => <button key={n} onClick={() => patch({ trainingDays: n })} className={cls("number-chip", state.trainingDays === n && "chip-active")}>{n}</button>)}</div></div>
                <div><p className="start-label">Time per session</p><div className="chip-row wrap">{[20,30,45,60,75].map((n) => <button key={n} onClick={() => patch({ sessionMinutes: n })} className={cls("text-chip", state.sessionMinutes === n && "chip-active")}>{n} min</button>)}</div></div>
                <div><p className="start-label">Where / equipment</p><div className="chip-row wrap">{(["gym","dumbbells","home","mixed","unsure"] as Equipment[]).map((item) => <button key={item} onClick={() => patch({ equipment: item })} className={cls("text-chip capitalize", state.equipment === item && "chip-active")}>{item}</button>)}</div></div>
                <div><p className="start-label">Experience</p><div className="grid grid-cols-3 gap-2">{(["new","some","experienced"] as Experience[]).map((item) => <button key={item} onClick={() => patch({ experience: item })} className={cls("text-chip capitalize", state.experience === item && "chip-active")}>{item === "new" ? "New" : item === "some" ? "Some" : "Experienced"}</button>)}</div></div>
              </div>
              <div className="mt-auto pt-6"><button onClick={() => setStep(5)} className="start-primary w-full">Continue</button></div>
            </section>
          )}

          {step === 5 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">What would you actually look forward to eating?</h1>
              <p className="start-subtitle">Pick what sounds good. These are positive preferences, not rules.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {foodOptions.map((food) => <button key={food} onClick={() => toggleFood(food)} className={cls("food-chip", state.likedFoods.includes(food) && "food-chip-active")}>{food}</button>)}
              </div>
              <div className="mt-6 rounded-[22px] border border-[#E6E0D6] bg-white p-4"><p className="font-semibold">Why we ask this</p><p className="mt-1 text-sm leading-6 text-[#68736F]">Meals should start from food you want, then fit your targets — not the other way around.</p></div>
              <div className="mt-auto pt-6"><button onClick={() => setStep(6)} className="start-primary w-full">Continue</button></div>
            </section>
          )}

          {step === 6 && (
            <section className="flex flex-1 flex-col">
              <h1 className="start-title">Anything we should keep out?</h1>
              <p className="start-subtitle">Dislikes lower a meal’s ranking. Allergies and hard exclusions remove it entirely.</p>
              <div className="mt-7 space-y-4">
                <label className="start-field"><span>Foods you dislike</span><input placeholder="e.g. mushrooms, tuna" value={state.dislikes.join(", ")} onChange={(e) => patch({ dislikes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
                <label className="start-field"><span>Allergies / never foods</span><input placeholder="e.g. peanuts, shellfish" value={state.allergies.join(", ")} onChange={(e) => patch({ allergies: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
                <button onClick={() => patch({ healthFlag: !state.healthFlag })} className={cls("start-choice w-full text-left", state.healthFlag && "selected-choice")}><span className="health-check">{state.healthFlag ? "✓" : ""}</span><span className="flex-1"><strong>I have a health or exercise consideration</strong><small>We’ll keep recommendations conservative. This app does not diagnose medical conditions.</small></span></button>
              </div>
              <div className="mt-auto pt-6"><button onClick={() => setStep(7)} className="start-primary w-full">Show my starting plan</button></div>
            </section>
          )}

          {step === 7 && (
            <section className="flex flex-1 flex-col">
              <p className="eyebrow">YOUR STARTING POINT</p>
              <h1 className="start-title mt-2">Simple enough to use today.</h1>
              <p className="start-subtitle">These are starting estimates, not judgments or permanent limits.</p>
              <div className="mt-6 rounded-[28px] bg-[#17483F] p-5 text-white shadow-[0_14px_40px_rgba(23,72,63,.14)]">
                <p className="text-sm text-white/70">{baseTargets.goalLabel}</p>
                <div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-3xl font-semibold tracking-tight">{baseTargets.calories.toLocaleString()}</p><p className="mt-1 text-sm text-white/70">calories / day</p></div><div><p className="text-3xl font-semibold tracking-tight">{baseTargets.proteinGrams}g</p><p className="mt-1 text-sm text-white/70">protein / day</p></div></div>
                <div className="my-5 h-px bg-white/15" />
                <div className="flex items-center justify-between text-sm"><span>{state.trainingDays} workouts / week</span><span>{state.sessionMinutes} min each</span></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="mini-card"><span>Food direction</span><strong>{state.likedFoods.slice(0,2).join(" + ") || "Simple favorites"}</strong></div><div className="mini-card"><span>First review</span><strong>After ~14 days</strong></div></div>
              <p className="mt-4 rounded-[20px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#49655C]">{baseTargets.note}</p>
              <div className="mt-auto pt-6"><button onClick={finishOnboarding} className="start-primary w-full">Build my first week</button></div>
            </section>
          )}

          {step === 8 && (
            <section className="grid flex-1 place-items-center text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ECF3EE] text-2xl text-[#17483F]">✦</div><h1 className="mt-6 text-3xl font-semibold tracking-tight">Building your first week</h1><p className="mt-3 text-[#68736F]">Choosing meals you like, setting a manageable training rhythm, and keeping the numbers inside the guardrails.</p><div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-[#E6E0D6]"><div className="loading-bar h-full rounded-full bg-[#17483F]" /></div></div></section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-[#F7F4EE] pb-[calc(92px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] shadow-[0_0_80px_rgba(35,45,41,.05)]">
        <main className="px-5">
          {tab === "today" && <TodayView state={state} calories={calories} protein={protein} todayMeal={todayMeal} workoutMinutes={workoutMinutes} workoutEquipment={workoutEquipment} onSwap={() => setMealSwapped((v) => !v)} onStart={() => setWorkoutStarted(true)} workoutStarted={workoutStarted} setTab={setTab} />}
          {tab === "eat" && <EatView state={state} calories={calories} protein={protein} meals={meals} onSwap={() => setMealSwapped((v) => !v)} />}
          {tab === "train" && <TrainView state={state} minutes={workoutMinutes} equipment={workoutEquipment} started={workoutStarted} onStart={() => setWorkoutStarted(true)} />}
          {tab === "progress" && <ProgressView state={state} weightLog={weightLog} setWeightLog={setWeightLog} calories={calories} />}
          {tab === "coach" && <CoachView state={state} calories={calories} protein={protein} coachText={coachText} setCoachText={setCoachText} coachReply={coachReply} onSubmit={handleCoach} canUndo={Boolean(previousState)} onUndo={undoCoachChange} />}
        </main>
        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-[#E6E0D6] bg-[#FCFAF6]/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          {nav.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={cls("nav-item", tab === item.id && "nav-active")}><span>{item.icon}</span><small>{item.label}</small></button>)}
        </nav>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return <header className="mb-6">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">{title}</h1>{copy && <p className="mt-2 text-[15px] leading-6 text-[#68736F]">{copy}</p>}</header>;
}

function TodayView({ state, calories, protein, todayMeal, workoutMinutes, workoutEquipment, onSwap, onStart, workoutStarted, setTab }: any) {
  const proteinProgress = Math.min(100, Math.round((78 / protein) * 100));
  return <div><PageHeader eyebrow="SUNDAY" title="Here’s your manageable plan." copy="One useful thing at a time. You do not need a perfect day." />
    <section className="hero-card"><div className="flex items-center justify-between"><span className="hero-pill">NEXT STEP</span><span className="text-sm text-[#63756F]">~{workoutMinutes} min</span></div><h2 className="mt-5 text-2xl font-semibold tracking-tight">{workoutStarted ? "Keep the session easy to finish." : "Do your strength session."}</h2><p className="mt-2 text-[15px] leading-6 text-[#5E6C68]">{state.experience === "new" ? "A simple full-body session with stable movements and no need to train to failure." : "Keep the main movements consistent so progress is easy to see."}</p><div className="mt-5 flex gap-2"><button onClick={onStart} className="start-primary flex-1">{workoutStarted ? "Continue workout" : "Start workout"}</button><button onClick={() => setTab("coach")} className="icon-button" aria-label="Make this easier">−</button></div></section>
    <div className="mt-4 grid grid-cols-2 gap-3"><section className="dashboard-card"><div className="card-kicker">FOOD</div><h3 className="mt-2 font-semibold">{todayMeal.name}</h3><p className="mt-1 text-sm text-[#68736F]">{todayMeal.protein}g protein · {todayMeal.time} min</p><button onClick={onSwap} className="text-link mt-4">Swap meal</button></section><section className="dashboard-card"><div className="card-kicker">PROTEIN</div><div className="mt-3 text-2xl font-semibold">78 <span className="text-base font-medium text-[#68736F]">/ {protein}g</span></div><div className="mt-4 h-2 rounded-full bg-[#ECF0ED]"><div className="h-full rounded-full bg-[#6E9084]" style={{width:`${proteinProgress}%`}} /></div><p className="mt-3 text-xs text-[#7A8581]">Progress, not a pass/fail score.</p></section></div>
    {!state.simpleMode && <section className="dashboard-card mt-3"><div className="flex items-center justify-between"><div><div className="card-kicker">STARTING TARGET</div><p className="mt-2 text-xl font-semibold">{formatCalories(calories, state.hideCalories)}</p></div><button onClick={() => setTab("coach")} className="soft-button">Adjust</button></div></section>}
    <section className="mt-4 rounded-[24px] bg-[#EAE6F5] p-4"><p className="text-sm font-semibold">Something doesn’t fit?</p><button onClick={() => setTab("coach")} className="mt-1 text-left text-sm leading-6 text-[#59605E]">Tell Coach in normal words — “I only have 20 minutes today.” →</button></section>
  </div>;
}

function EatView({ state, calories, protein, meals, onSwap }: any) {
  return <div><PageHeader eyebrow="EAT" title="Food you’d actually choose." copy="Your preferences come first. Targets shape the portions, not your entire personality." />
    <section className="rounded-[26px] bg-[#17483F] p-5 text-white"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold tracking-[.16em] text-white/60">TODAY</p><p className="mt-2 text-2xl font-semibold">{formatCalories(calories, state.hideCalories)}</p></div><div className="text-right"><p className="text-2xl font-semibold">{protein}g</p><p className="text-sm text-white/60">protein target</p></div></div></section>
    <div className="mt-5 space-y-3">{meals.slice(0,4).map((meal: any, index: number) => <article key={meal.id} className="meal-card"><div className={cls("meal-art", index % 3 === 0 ? "bg-[#E8E6A8]" : index % 3 === 1 ? "bg-[#F5DED2]" : "bg-[#E7EFF5]")}><span>{meal.type.slice(0,1)}</span></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#89918E]">{meal.type}</p><h3 className="mt-1 font-semibold">{meal.name}</h3><p className="mt-1 text-sm text-[#68736F]">{meal.protein}g protein · {meal.time} min{state.hideCalories ? "" : ` · ${meal.calories} cal`}</p><p className="mt-2 text-xs leading-5 text-[#78827E]">{meal.why}</p><div className="mt-3 flex gap-2"><button className="tiny-button">I ate this</button><button onClick={onSwap} className="tiny-button">Swap</button></div></div></article>)}</div>
  </div>;
}

function TrainView({ state, minutes, equipment, started, onStart }: any) {
  const noLunges = state.dislikedExercises.includes("lunges");
  const exercises = [
    [equipment === "home" ? "Supported split squat" : "Leg press", "3 × 8–10", "Legs"],
    [equipment === "home" ? "Incline push-up" : "Machine chest press", "3 × 8–12", "Push"],
    [equipment === "home" ? "Backpack row" : "Seated cable row", "3 × 8–12", "Pull"],
    [noLunges ? "Hamstring curl" : "Reverse lunge", "2 × 10", "Legs"],
  ];
  return <div><PageHeader eyebrow="TRAIN" title="Today’s strength session." copy={`${minutes} minutes · ${String(equipment).replace("dumbbells","dumbbells")} · built to be repeatable`} />
    <section className="hero-card"><div className="flex items-center justify-between"><span className="hero-pill">FULL BODY</span><span className="text-sm text-[#68736F]">4 movements</span></div><h2 className="mt-4 text-2xl font-semibold">Simple Full Body A</h2><p className="mt-2 text-sm leading-6 text-[#68736F]">Keep 2–3 reps in reserve. The goal is to leave knowing you can come back.</p><button onClick={onStart} className="start-primary mt-5 w-full">{started ? "Continue workout" : "Start workout"}</button></section>
    <div className="mt-4 space-y-2">{exercises.map(([name, prescription, focus], index) => <article key={name} className="exercise-row"><span className="exercise-number">{index+1}</span><div className="flex-1"><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm text-[#68736F]">{prescription} · {focus}</p>{!state.simpleMode && <p className="mt-1 text-xs text-[#909895]">Previous: {index % 2 ? "55 lb × 10" : "90 lb × 9"}</p>}</div><button className="text-link">Swap</button></article>)}</div>
  </div>;
}

function ProgressView({ state, weightLog, setWeightLog, calories }: any) {
  const start = weightLog[0]; const last = weightLog[weightLog.length-1]; const change = (last-start).toFixed(1);
  const trendMin = Math.min(...weightLog) - .3; const trendMax = Math.max(...weightLog) + .3; const range = trendMax-trendMin;
  return <div><PageHeader eyebrow="PROGRESS" title="Trust the trend, not one dot." copy="We wait for enough data before suggesting a change." />
    <section className="dashboard-card"><div className="flex items-start justify-between"><div><p className="card-kicker">YOUR TREND</p><p className="mt-2 text-3xl font-semibold">{last.toFixed(1)} kg</p><p className="mt-1 text-sm text-[#68736F]">{Number(change) > 0 ? "+" : ""}{change} kg across this sample</p></div><button onClick={() => setWeightLog([...weightLog, Number((last-.1).toFixed(1))])} className="soft-button">Log weight</button></div><div className="mt-8 flex h-32 items-end gap-2 border-b border-[#E6E0D6]">{weightLog.map((w: number, i: number) => { const h = 25 + ((w-trendMin)/range)*70; return <div key={i} className="flex flex-1 justify-center"><span className="block w-2.5 rounded-full bg-[#6E9084]" style={{height:`${h}%`, opacity:.35 + (i/weightLog.length)*.55}} /></div>; })}</div><p className="mt-3 text-xs leading-5 text-[#7C8582]">Seven readings shown. We normally want roughly 10–14 days before changing calories from weight trend alone.</p></section>
    <div className="mt-3 grid grid-cols-2 gap-3"><div className="mini-card"><span>Training</span><strong>2 of {state.trainingDays} this week</strong></div><div className="mini-card"><span>Protein</span><strong>5 steady days</strong></div></div>
    <section className="mt-3 rounded-[24px] bg-[#ECF3EE] p-4"><p className="font-semibold">No adjustment yet.</p><p className="mt-1 text-sm leading-6 text-[#5B6B65]">The current {state.hideCalories ? "food target" : `${calories}-calorie target`} stays in place until the trend is clearer.</p></section>
  </div>;
}

function CoachView({ state, calories, protein, coachText, setCoachText, coachReply, onSubmit, canUndo, onUndo }: any) {
  const examples = ["I want to lean bulk without putting on much fat", "I only have 20 minutes today", state.hideCalories ? "Show calories" : "Hide calories", "I hate lunges"];
  return <div><PageHeader eyebrow="COACH" title="Change the plan by talking normally." copy="Coach can change approved parts of the real app. Safety rules stay in code." />
    <section className="coach-response"><div className="mb-3 flex items-center gap-2"><span className="coach-mark">✦</span><strong>Coach</strong></div><p className="text-[15px] leading-7 text-[#45534F]">{coachReply}</p>{canUndo && <button onClick={onUndo} className="soft-button mt-4">Undo last change</button>}</section>
    <div className="mt-4 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => setCoachText(example)} className="suggestion-chip">{example}</button>)}</div>
    <form onSubmit={onSubmit} className="coach-composer"><textarea rows={3} value={coachText} onChange={(e) => setCoachText(e.target.value)} placeholder="Try: Increase my calories by 150…" /><div className="mt-3 flex items-center justify-between"><span className="text-xs text-[#8B9390]">Current: {formatCalories(calories, state.hideCalories)} · {protein}g protein</span><button className="send-button" aria-label="Send">↑</button></div></form>
    <p className="mt-4 px-2 text-xs leading-5 text-[#8B9390]">Prototype Coach currently uses a validated local action layer. A production AI model can later choose from the same approved actions rather than mutating nutrition numbers directly.</p>
  </div>;
}
