from pathlib import Path
import re


def replace(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# Workout builder: give each planned day a real A/B or upper/lower identity.
plan = Path("src/lib/startHerePlan.ts")
text = plan.read_text()
text = text.replace(
    'import { exerciseBehaviorScore, mealBehaviorScore } from "@/lib/startHereBehavior";\n',
    'import { exerciseBehaviorScore, mealBehaviorScore } from "@/lib/startHereBehavior";\nimport type { TrainingSplit, WorkoutVariant } from "@/lib/startHereWeek";\n',
    1,
)
text = text.replace(
    '''export interface WorkoutPlan {
  name: string;
  minutes: number;
  equipment: Equipment;
  focus: string;
  exercises: WorkoutExercise[];
  note: string;
}
''',
    '''export interface WorkoutPlan {
  name: string;
  minutes: number;
  equipment: Equipment;
  focus: string;
  exercises: WorkoutExercise[];
  note: string;
}

export interface WorkoutBuildOptions {
  split?: TrainingSplit;
  variant?: WorkoutVariant;
  name?: string;
}
''',
    1,
)
new_builder = r'''function patternsForWorkout(split: TrainingSplit, olderBeginner: boolean): Exercise["pattern"][] {
  if (split === "upper") return ["push", "pull", "push", "pull", "core", "carry"];
  if (split === "lower") return ["squat", "hinge", olderBeginner ? "balance" : "single-leg", "squat", "hinge", "core"];
  return ["squat", "push", "pull", "hinge", olderBeginner ? "balance" : "single-leg", "core"];
}

function patternFitsSplit(pattern: Exercise["pattern"], split: TrainingSplit) {
  if (split === "upper") return ["push", "pull", "core", "carry", "balance"].includes(pattern);
  if (split === "lower") return ["squat", "hinge", "single-leg", "balance", "core", "carry"].includes(pattern);
  return true;
}

function exercisePlanScore(exercise: Exercise, state: AppState, variant: WorkoutVariant) {
  const explicit = includesLoose(state.preferredExercises, exercise.name) ? 20 : 0;
  const focus = exercise.focus.filter((item) => includesLoose(state.focusAreas, item)).length * 3;
  const learned = exerciseBehaviorScore(state, exercise).score;
  const catalogIndex = EXERCISES.findIndex((item) => item.id === exercise.id);
  const rotation = variant === "B" && catalogIndex % 2 === 1 ? 2 : 0;
  return explicit + focus + learned + rotation;
}

export function buildWorkout(state: AppState, options: WorkoutBuildOptions = {}): WorkoutPlan {
  const minutes = state.todayOverride.minutes ?? state.sessionMinutes;
  const equipment = state.todayOverride.equipment ?? state.equipment;
  const split = options.split ?? "full-body";
  const variant = options.variant ?? "A";
  const olderBeginner = state.age >= 60 && state.experience === "new";
  const nervousBeginner = state.confidence === "nervous" || state.liftingHistory === "none";
  const consistentlyTrained = state.liftingHistory === "consistent" || state.experience === "experienced";
  const returning = state.liftingHistory === "returning";
  const hasBaseline = Object.entries(state.liftingBaseline).some(([key, value]) => key !== "note" && value !== null);
  const maxExercises = minutes <= 20 ? 3 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;
  const desiredPatterns = patternsForWorkout(split, olderBeginner);
  const chosen: Exercise[] = [];

  for (const pattern of desiredPatterns) {
    const candidates = EXERCISES.filter((exercise) =>
      exercise.pattern === pattern &&
      equipmentMatches(exercise, equipment) &&
      !exerciseBlocked(exercise, state) &&
      (!nervousBeginner || exercise.beginnerFriendly) &&
      (!olderBeginner || exercise.stable) &&
      !chosen.some((item) => item.id === exercise.id),
    ).sort((a, b) => exercisePlanScore(b, state, variant) - exercisePlanScore(a, state, variant));
    const exercise = candidates[0];
    if (exercise) chosen.push(exercise);
    if (chosen.length >= maxExercises) break;
  }

  if (chosen.length < maxExercises) {
    const fallbackCandidates = EXERCISES
      .filter((exercise) =>
        equipmentMatches(exercise, equipment) &&
        patternFitsSplit(exercise.pattern, split) &&
        !exerciseBlocked(exercise, state) &&
        (!nervousBeginner || exercise.beginnerFriendly) &&
        (!olderBeginner || exercise.stable) &&
        !chosen.some((item) => item.id === exercise.id),
      )
      .sort((a, b) => exercisePlanScore(b, state, variant) - exercisePlanScore(a, state, variant));
    for (const exercise of fallbackCandidates) {
      chosen.push(exercise);
      if (chosen.length >= maxExercises) break;
    }
  }

  const baseSets = minutes <= 20 ? 2 : consistentlyTrained || returning ? 3 : 2;
  const repTarget = consistentlyTrained ? "6–10 reps" : "8–12 reps";
  const defaultName = split === "full-body"
    ? `Full Body ${variant}`
    : `${split === "upper" ? "Upper Body" : "Lower Body"} ${variant}`;
  const name = options.name ?? defaultName;
  const splitFocus = split === "full-body" ? "Full body" : split === "upper" ? "Upper body" : "Lower body";
  const rotationNote = split === "full-body"
    ? `${name} alternates with the other full-body session so the week stays repeatable without being identical.`
    : `${name} is one part of your rotating upper/lower week.`;

  return {
    name,
    minutes,
    equipment,
    focus: state.focusAreas.length ? `${splitFocus} · ${state.focusAreas.join(" + ")}` : splitFocus,
    exercises: chosen.slice(0, maxExercises).map((exercise, index) => ({
      sourceExerciseId: exercise.id,
      exercise,
      sets: index >= 4 ? 2 : baseSets + (consistentlyTrained && index < 2 && minutes >= 60 ? 1 : 0),
      reps: exercise.pattern === "core" || exercise.pattern === "balance" ? "8–12 controlled reps" : repTarget,
      previous: exercisePreviousPerformance(state, exercise.id),
      progression: progressionCue(state, exercise.id),
    })),
    note: olderBeginner
      ? `${rotationNote} Stable movements, lower starting volume, and a little balance work keep the emphasis on confidence and capability.`
      : state.liftingHistory === "none"
        ? `${rotationNote} The first weeks stay conservative and leave 2–3 good reps in reserve.`
        : returning
          ? `${rotationNote} You have lifted before${hasBaseline ? " and gave us a rough strength baseline" : ""}, so volume starts moderate while consistency comes back.`
          : consistentlyTrained
            ? `${rotationNote} Your logged performance drives the progression cues instead of guessing loads.`
            : `${rotationNote} Keep the main movements repeatable so progression is easy to see.`,
  };
}
'''
text, count = re.subn(
    r'export function buildWorkout\(state: AppState\): WorkoutPlan \{.*?\n\}\n\nexport function alternativeExercises',
    new_builder + '\nexport function alternativeExercises',
    text,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f"Could not replace buildWorkout exactly once; count={count}")
plan.write_text(text)

# Adaptation: learn the weekdays that actually work before cutting frequency.
adaptation = "src/lib/startHereAdaptation.ts"
replace(
    adaptation,
    'import type { AppState, ReadinessCheckIn, WorkoutSessionLog } from "@/lib/startHereModels";\n',
    'import type { AppState, ReadinessCheckIn, WorkoutSessionLog } from "@/lib/startHereModels";\nimport { daysLabel, observedTrainingPattern } from "@/lib/startHereWeek";\n',
)
replace(
    adaptation,
    '''  const coolingDown = recentOngoingAdaptation(state, today);
  if (!coolingDown && lowReadinessRate !== null && lowReadinessRate >= 0.5 && workoutRate !== null && workoutRate < 0.8 && state.sessionMinutes > 20) {''',
    '''  const coolingDown = recentOngoingAdaptation(state, today);
  const observedDays = observedTrainingPattern(state, today);
  if (!coolingDown && observedDays) {
    recommendations.push({
      id: "schedule-observed-days",
      kind: "schedule",
      scope: "ongoing",
      title: `Move training to ${daysLabel(observedDays.days)}`,
      reason: `Across ${observedDays.sessions} recent sessions, those are the days you actually train most consistently. I would rather fit the plan to that pattern than keep marking a different weekday as missed.`,
      confidence: observedDays.confidence,
      patch: { preferredDays: observedDays.days },
    });
  } else if (!coolingDown && lowReadinessRate !== null && lowReadinessRate >= 0.5 && workoutRate !== null && workoutRate < 0.8 && state.sessionMinutes > 20) {''',
)

# Deterministic Coach schedule changes should keep preferred weekdays coherent.
coach = "src/lib/startHereCoach.ts"
replace(
    coach,
    'import type { AppState } from "@/lib/startHereModels";\n',
    'import type { AppState } from "@/lib/startHereModels";\nimport { defaultTrainingDays } from "@/lib/startHereWeek";\n',
)
replace(
    coach,
    '''        trainingDays: Math.min(state.trainingDays, 2),
        sessionMinutes: Math.min(state.sessionMinutes, 30),''',
    '''        trainingDays: Math.min(state.trainingDays, 2),
        preferredDays: defaultTrainingDays(Math.min(state.trainingDays, 2)),
        sessionMinutes: Math.min(state.sessionMinutes, 30),''',
)
replace(
    coach,
    '''        patch: { trainingDays: Math.max(1, Math.min(6, days)), sessionMinutes: Math.max(15, Math.min(90, minutes)), todayOverride: { minutes: null, equipment: null, note: null } },''',
    '''        patch: { trainingDays: Math.max(1, Math.min(6, days)), preferredDays: defaultTrainingDays(Math.max(1, Math.min(6, days))), sessionMinutes: Math.max(15, Math.min(90, minutes)), todayOverride: { minutes: null, equipment: null, note: null } },''',
)

# Give Coach live weekly-plan context.
client = "src/lib/startHereCoachClient.ts"
replace(
    client,
    'import type { currentTargets } from "@/lib/startHerePlan";\n',
    'import type { currentTargets } from "@/lib/startHerePlan";\nimport { buildTrainingWeek } from "@/lib/startHereWeek";\n',
)
replace(
    client,
    '''  const adaptation = buildAdaptationReview(state, state.currentDay || new Date().toISOString().slice(0, 10));
  const learnedBehavior = learnedBehaviorSignals(state);''',
    '''  const currentDate = state.currentDay || new Date().toISOString().slice(0, 10);
  const adaptation = buildAdaptationReview(state, currentDate);
  const learnedBehavior = learnedBehaviorSignals(state);
  const trainingWeek = buildTrainingWeek(state, currentDate);''',
)
replace(
    client,
    '''          learnedBehavior,
        },''',
    '''          learnedBehavior,
          trainingSchedule: trainingWeek.preferredDays,
          todayScheduled: trainingWeek.today.scheduled,
          todayTrainingComplete: trainingWeek.today.trained,
          nextTrainingDate: trainingWeek.nextTrainingDay.date,
          nextTrainingName: trainingWeek.nextTrainingDay.workoutName,
          weekTrainingCompleted: trainingWeek.completedScheduled,
          weekTrainingPlanned: trainingWeek.scheduledCount,
        },''',
)

route = "src/app/api/start-here-coach/route.ts"
replace(
    route,
    '''    learnedBehavior: z.array(z.string().max(180)).max(6),
  }),''',
    '''    learnedBehavior: z.array(z.string().max(180)).max(6),
    trainingSchedule: z.array(z.string().max(3)).max(6),
    todayScheduled: z.boolean(),
    todayTrainingComplete: z.boolean(),
    nextTrainingDate: z.string().max(10),
    nextTrainingName: z.string().max(80).nullable(),
    weekTrainingCompleted: z.number().int().min(0).max(7),
    weekTrainingPlanned: z.number().int().min(1).max(6),
  }),''',
)
replace(
    route,
    '''The context may include today's readiness, recent workout and meal adherence, a multi-day low-readiness rate, and learnedBehavior derived from repeated in-app choices.''',
    '''The context may include today's readiness, recent workout and meal adherence, a multi-day low-readiness rate, the actual current-week training schedule/status, and learnedBehavior derived from repeated in-app choices.''',
)

# Main UI: build the workout from the week's planned session and make rest days real.
app = "src/components/StartHereAppV2.tsx"
replace(
    app,
    '''} from "@/lib/startHereModels";

type IconName =''',
    '''} from "@/lib/startHereModels";
import {
  WEEKDAYS,
  buildTrainingWeek,
  daysLabel,
  defaultTrainingDays,
  normalizePreferredDays,
  type TrainingWeekPlan,
  type Weekday,
} from "@/lib/startHereWeek";

type IconName =''',
)
replace(
    app,
    '''  const targets = useMemo(() => currentTargets(state), [state]);
  const plannedMeals = useMemo(() => buildDayMeals(state, targets.calories, targets.proteinGrams), [state, targets.calories, targets.proteinGrams]);
  const rankedMeals = useMemo(() => rankMeals(state), [state]);
  const baseWorkout = useMemo(() => buildWorkout(state), [state]);''',
    '''  const targets = useMemo(() => currentTargets(state), [state]);
  const plannedMeals = useMemo(() => buildDayMeals(state, targets.calories, targets.proteinGrams), [state, targets.calories, targets.proteinGrams]);
  const rankedMeals = useMemo(() => rankMeals(state), [state]);
  const currentDate = state.currentDay || todayKey();
  const trainingWeek = useMemo(() => buildTrainingWeek(state, currentDate), [state, currentDate]);
  const plannedWorkoutDay = trainingWeek.today.scheduled && !trainingWeek.today.completed ? trainingWeek.today : trainingWeek.nextTrainingDay;
  const baseWorkout = useMemo(() => buildWorkout(state, {
    split: plannedWorkoutDay.split ?? "full-body",
    variant: plannedWorkoutDay.variant ?? "A",
    name: plannedWorkoutDay.workoutName ?? undefined,
  }), [state, plannedWorkoutDay.split, plannedWorkoutDay.variant, plannedWorkoutDay.workoutName]);''',
)
replace(
    app,
    '<TodayView state={state} targets={targets} meals={dayMeals} workout={effectiveWorkout} adaptation={adaptationReview}',
    '<TodayView state={state} targets={targets} meals={dayMeals} workout={effectiveWorkout} week={trainingWeek} adaptation={adaptationReview}',
)
replace(
    app,
    '<TrainView state={state} workout={effectiveWorkout} startWorkout={startWorkout} setTab={setTab} />',
    '<TrainView state={state} workout={effectiveWorkout} week={trainingWeek} startWorkout={startWorkout} setTab={setTab} />',
)
replace(
    app,
    '''<ChoiceGroup label="Days per week" hint="2–3 is a strong beginner starting point."><div className="chip-row">{[1,2,3,4,5,6].map((n) => <button key={n} onClick={() => patch({ trainingDays: n })} className={cx("number-chip", state.trainingDays === n && "chip-active")}>{n}</button>)}</div></ChoiceGroup>''',
    '''<TrainingScheduleControls state={state} patch={patch} />''',
)
replace(
    app,
    '''      <TrainingBaselineFields state={state} patch={patch} />
    </div>''',
    '''      <TrainingBaselineFields state={state} patch={patch} />
      <div className="mt-5 border-t border-[#E6E0D6] pt-5"><TrainingScheduleControls state={state} patch={patch} /></div>
    </div>''',
)
replace(
    app,
    '''<MiniCard label="Food" value={`${state.eatenMealIds.length} meals logged`} />''',
    '''<MiniCard label="Food" value={`${state.mealLogs.length} meals logged`} />''',
)

app_path = Path(app)
app_text = app_path.read_text()
schedule_controls = r'''function TrainingScheduleControls({ state, patch }: { state: AppState; patch: (update: Partial<AppState>) => void }) {
  const selected = normalizePreferredDays(state.preferredDays, state.trainingDays);
  function setFrequency(days: number) {
    patch({ trainingDays: days, preferredDays: defaultTrainingDays(days) });
  }
  function chooseDay(day: Weekday) {
    if (selected.includes(day)) return;
    const targetIndex = WEEKDAYS.indexOf(day);
    const nearest = [...selected].sort((a, b) => Math.abs(WEEKDAYS.indexOf(a) - targetIndex) - Math.abs(WEEKDAYS.indexOf(b) - targetIndex))[0];
    const next = [...selected.filter((item) => item !== nearest), day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    patch({ preferredDays: next });
  }
  return <div className="space-y-4">
    <ChoiceGroup label="Days per week" hint="2–3 is a strong beginner starting point."><div className="chip-row">{[1,2,3,4,5,6].map((n) => <button key={n} onClick={() => setFrequency(n)} className={cx("number-chip", state.trainingDays === n && "chip-active")}>{n}</button>)}</div></ChoiceGroup>
    <ChoiceGroup label="Preferred days" hint="Tap another day to swap it in."><div className="chip-row wrap">{WEEKDAYS.map((day) => <button key={day} onClick={() => chooseDay(day)} className={cx("text-chip", selected.includes(day) && "chip-active")}>{day}</button>)}</div></ChoiceGroup>
  </div>;
}

'''
marker = 'function OnboardingSection('
if marker not in app_text:
    raise SystemExit('OnboardingSection marker missing')
app_text = app_text.replace(marker, schedule_controls + marker, 1)

today_and_strip = r'''function TrainingWeekStrip({ week }: { week: TrainingWeekPlan }) {
  const extra = Math.max(0, week.completedTotal - week.completedScheduled);
  return <section className="dashboard-card mt-3">
    <div className="flex items-center justify-between gap-3"><div><p className="card-kicker">THIS WEEK</p><p className="mt-1 text-sm font-semibold">{week.completedScheduled} of {week.scheduledCount} planned sessions</p></div><span className="text-xs font-semibold text-[#6E7874]">{daysLabel(week.preferredDays)}</span></div>
    <div className="mt-4 grid grid-cols-7 gap-1.5">{week.days.map((day) => {
      const isToday = day.date === week.today.date;
      const done = day.trained;
      return <div key={day.date} className={cx("rounded-xl px-1 py-2 text-center", isToday ? "bg-[#ECF3EE]" : "bg-[#FCFAF6]")}><p className="text-[9px] font-bold uppercase text-[#8A938F]">{day.day}</p><div className={cx("mx-auto mt-1.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold", done ? "bg-[#17483F] text-white" : day.scheduled ? "border border-[#9AB2A8] text-[#17483F]" : "text-[#B3B9B6]")}>{done ? "✓" : day.scheduled ? "•" : "–"}</div></div>;
    })}</div>
    <p className="mt-3 text-xs leading-5 text-[#7B8581]">Next: {week.nextTrainingDay.day} · {week.nextTrainingDay.workoutName}{extra ? ` · ${extra} extra session${extra === 1 ? "" : "s"} also counted` : ""}</p>
  </section>;
}

function TodayView({ state, targets, meals, workout, week, adaptation, setReadiness, applyAdaptation, setTab, onStartWorkout, onMeal, onSwap, openProfile }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; workout: WorkoutPlan; week: TrainingWeekPlan; adaptation: ReturnType<typeof buildAdaptationReview>; setReadiness: (value: Readiness) => void; applyAdaptation: (recommendation: AdaptationRecommendation) => void; setTab: (tab: AppTab) => void; onStartWorkout: () => void; onMeal: (id: string) => void; onSwap: (id: string) => void; openProfile: () => void }) {
  const completedToday = week.today.trained;
  const proteinLogged = meals.filter((item) => state.eatenMealIds.includes(item.meal.id)).reduce((sum, item) => sum + item.protein, 0);
  const nextMeal = meals.find((item) => !state.eatenMealIds.includes(item.meal.id)) ?? meals[0];
  const overrideActive = Boolean(state.todayOverride.minutes || state.todayOverride.equipment || state.todayOverride.note);
  const workoutDueToday = week.today.scheduled && !week.today.completed;
  const nextIsWorkout = !completedToday && (workoutDueToday || overrideActive);
  const readiness = adaptation.latestReadiness?.readiness ?? null;
  const ongoingAdaptation = adaptation.recommendations.find((item) => item.scope === "ongoing");
  return <div>
    <PageHeader eyebrow={friendlyDate().toUpperCase()} title="Here’s your manageable plan." copy={week.today.scheduled ? "Today fits your normal training rhythm." : `No workout is scheduled today. Your next planned session is ${week.nextTrainingDay.day}.`} action={<button onClick={openProfile} className="avatar-button" aria-label="Profile"><Icon name="user" size={19} /></button>} />

    <section className="dashboard-card mb-3">
      <div className="flex items-start justify-between gap-3"><div><p className="card-kicker">10-SECOND CHECK-IN</p><p className="mt-1 text-sm font-semibold">How ready do you feel today?</p><p className="mt-1 text-xs leading-5 text-[#7D8582]">This only changes today unless a longer pattern shows up.</p></div><Icon name="spark" size={18} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2">{([['low','Running low'],['normal','Normal'],['high','Ready']] as const).map(([value, label]) => <button key={value} onClick={() => setReadiness(value)} className={cx("tiny-button justify-center", readiness === value && "tiny-active")}>{label}</button>)}</div>
      {state.todayOverride.note === "Adjusted from today's readiness check-in." && <p className="mt-3 rounded-xl bg-[#ECF3EE] p-3 text-xs leading-5 text-[#526860]">I shortened today’s workout from your check-in. Tomorrow starts fresh.</p>}
    </section>

    <section className="hero-card">
      <div className="flex items-center justify-between"><span className="hero-pill">NEXT STEP</span><span className="flex items-center gap-1.5 text-xs font-semibold text-[#68736F]"><Icon name="clock" size={15} />{nextIsWorkout ? workout.minutes : nextMeal?.meal.prepMinutes ?? 10} min</span></div>
      <h2 className="mt-5 text-[25px] font-semibold leading-tight tracking-[-.03em]">{nextIsWorkout ? `Do ${workout.name}.` : `Make ${nextMeal?.meal.name}.`}</h2>
      <p className="mt-2 text-[15px] leading-6 text-[#5E6C68]">{nextIsWorkout ? workout.note : nextMeal?.meal.why}</p>
      <div className="mt-5 flex gap-2"><button onClick={nextIsWorkout ? onStartWorkout : () => nextMeal && onMeal(nextMeal.meal.id)} className="start-primary flex-1">{nextIsWorkout ? "Start workout" : "View meal"}<Icon name="arrow" size={17} /></button><button onClick={() => setTab("coach")} className="icon-button" aria-label="Make this easier"><Icon name="coach" size={20} /></button></div>
    </section>

    <TrainingWeekStrip week={week} />

    <section className="dashboard-card mt-3">
      <div className="flex items-center justify-between"><div><div className="card-kicker">FOOD TODAY</div><p className="mt-1 text-sm text-[#68736F]">{state.eatenMealIds.length} logged · {proteinLogged}g protein so far</p></div><button onClick={() => setTab("eat")} className="text-link">See all</button></div>
      <div className="mt-4 space-y-2">{meals.slice(0, 3).map((item) => <TodayMealRow key={item.sourceMealId} item={item} eaten={state.eatenMealIds.includes(item.meal.id)} onOpen={() => onMeal(item.meal.id)} onSwap={() => onSwap(item.sourceMealId)} />)}</div>
    </section>

    <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="Protein" value={`${proteinLogged} / ${targets.proteinGrams}g`} /><MiniCard label="Weekly rhythm" value={`${week.completedScheduled} / ${week.scheduledCount} planned`} /></div>

    {ongoingAdaptation && <section className="mt-3 rounded-[24px] bg-[#ECF3EE] p-4"><div className="flex items-start gap-3"><span className="mt-0.5 text-[#17483F]"><Icon name="spark" size={20} /></span><div className="flex-1"><p className="text-sm font-semibold">Your plan noticed a pattern</p><p className="mt-1 text-sm leading-5 text-[#596963]">{ongoingAdaptation.reason}</p><button onClick={() => applyAdaptation(ongoingAdaptation)} className="soft-button mt-3">Apply: {ongoingAdaptation.title}</button></div></div></section>}

    {state.detailLevel !== "simple" && <section className="dashboard-card mt-3"><div className="flex items-center justify-between"><div><div className="card-kicker">STARTING TARGET</div><p className="mt-2 text-xl font-semibold">{state.hideCalories ? "Calories hidden" : `${targets.calories.toLocaleString()} cal`}</p><p className="mt-1 text-xs text-[#818A87]">Maintenance estimate: {targets.maintenanceCalories.toLocaleString()}</p></div><button onClick={() => setTab("coach")} className="soft-button">Adjust</button></div></section>}

    <section className="mt-3 rounded-[24px] bg-[#EAE6F5] p-4"><div className="flex gap-3"><span className="mt-0.5 text-[#655F7D]"><Icon name="coach" size={20} /></span><button onClick={() => setTab("coach")} className="text-left"><p className="text-sm font-semibold">Something does not fit?</p><p className="mt-1 text-sm leading-5 text-[#64656B]">Tell Coach in normal words: “I only have 20 minutes today.”</p></button></div></section>
  </div>;
}
'''
app_text, count = re.subn(r'function TodayView\(.*?\n\}\n\nfunction EatView', today_and_strip + '\nfunction EatView', app_text, flags=re.S)
if count != 1:
    raise SystemExit(f"TodayView replacement count={count}")

train_view = r'''function TrainView({ state, workout, week, startWorkout, setTab }: { state: AppState; workout: WorkoutPlan; week: TrainingWeekPlan; startWorkout: () => void; setTab: (tab: AppTab) => void }) {
  const overrideActive = Boolean(state.todayOverride.minutes || state.todayOverride.equipment || state.todayOverride.note);
  const canStart = !week.today.trained && (week.today.scheduled || overrideActive);
  const todayDone = week.today.trained;
  const title = canStart ? "Today’s training." : todayDone ? "Today is handled." : "Your training week.";
  const copy = canStart
    ? `${workout.minutes} minutes · ${workout.equipment} · ${workout.focus}`
    : `Next planned session: ${week.nextTrainingDay.day} · ${week.nextTrainingDay.workoutName}`;
  return <div>
    <PageHeader eyebrow="TRAIN" title={title} copy={copy} />
    <TrainingWeekStrip week={week} />
    <section className="hero-card mt-3"><div className="flex items-center justify-between"><span className="hero-pill">{canStart ? "TODAY" : "NEXT SESSION"}</span><span className="text-xs text-[#68736F]">{workout.exercises.length} movements</span></div><h2 className="mt-4 text-[25px] font-semibold tracking-[-.03em]">{workout.name}</h2><p className="mt-2 text-sm leading-6 text-[#68736F]">{workout.note}</p>{state.todayOverride.note && <div className="mt-3 rounded-xl bg-[#EAE6F5] px-3 py-2 text-xs text-[#625F71]">Today-only override active. Your normal program is unchanged.</div>}{canStart ? <button onClick={startWorkout} className="start-primary mt-5 w-full">Start workout <Icon name="arrow" size={17} /></button> : <button onClick={() => setTab("coach")} className="start-secondary mt-5 w-full">Need to move the session? Ask Coach</button>}</section>
    <div className="mt-4 space-y-2.5">{workout.exercises.map((item, index) => <article key={item.sourceExerciseId} className="exercise-row"><span className="exercise-number">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.exercise.name}</h3><p className="mt-1 text-sm text-[#68736F]">{item.sets} sets · {item.reps}</p>{state.detailLevel === "detailed" && <><p className="mt-1 text-xs text-[#909895]">Previous: {item.previous}</p><p className="mt-1 text-xs leading-5 text-[#7A8581]">{item.exercise.cue}</p></>}</div><span className="text-[#AAB2AE]"><Icon name="chevron" size={17} /></span></article>)}</div>
    <div className="mt-3 grid grid-cols-2 gap-3"><MiniCard label="This week" value={`${week.completedScheduled} of ${week.scheduledCount} planned`} /><MiniCard label="Normal schedule" value={daysLabel(week.preferredDays)} /></div>
    <button onClick={() => setTab("coach")} className="coach-inline mt-3"><Icon name="coach" size={18} /><span><strong>Need to change today?</strong><small>“No equipment” · “Only 20 minutes”</small></span><Icon name="chevron" size={16} /></button>
  </div>;
}
'''
app_text, count = re.subn(r'function TrainView\(.*?\n\}\n\nfunction ProgressView', train_view + '\nfunction ProgressView', app_text, flags=re.S)
if count != 1:
    raise SystemExit(f"TrainView replacement count={count}")
app_path.write_text(app_text)

# Tests for split-specific workout generation and learned weekday adaptation.
plan_test = "src/lib/startHerePlan.test.ts"
replace(
    plan_test,
    '''  it("builds a shorter workout from a today-only time override", () => {''',
    '''  it("builds different upper and lower sessions from the weekly identity", () => {
    const state = { ...INITIAL_STATE, trainingDays: 4, liftingHistory: "consistent" as const, experience: "experienced" as const, confidence: "comfortable" as const };
    const upper = buildWorkout(state, { split: "upper", variant: "A", name: "Upper Body A" });
    const lower = buildWorkout(state, { split: "lower", variant: "A", name: "Lower Body A" });
    expect(upper.name).toBe("Upper Body A");
    expect(lower.name).toBe("Lower Body A");
    expect(upper.exercises.some((item) => item.exercise.pattern === "push")).toBe(true);
    expect(upper.exercises.some((item) => item.exercise.pattern === "pull")).toBe(true);
    expect(lower.exercises.some((item) => item.exercise.pattern === "squat")).toBe(true);
    expect(lower.exercises.some((item) => item.exercise.pattern === "hinge")).toBe(true);
  });

  it("builds a shorter workout from a today-only time override", () => {''',
)

adaptation_test = "src/lib/startHereAdaptation.test.ts"
replace(
    adaptation_test,
    '''  it("recognizes repeated top-of-range performance as a progression signal", () => {''',
    '''  it("suggests moving the weekly schedule when actual training days form a strong different pattern", () => {
    const actualDates = [
      "2026-07-27", "2026-07-29", "2026-08-01",
      "2026-08-03", "2026-08-05", "2026-08-08",
      "2026-08-10", "2026-08-12", "2026-08-15",
    ];
    const current = state({
      trainingDays: 3,
      preferredDays: ["Mon", "Wed", "Fri"],
      workoutLogs: actualDates.map((date, index) => ({ id: `d${index}`, date, workoutName: "Full Body A", minutes: 45, exercises: [], completed: true })),
    });
    const schedule = buildAdaptationReview(current, "2026-08-17").recommendations.find((item) => item.id === "schedule-observed-days");
    expect(schedule?.patch.preferredDays).toEqual(["Mon", "Wed", "Sat"]);
    expect(schedule?.confidence).toBe("strong");
  });

  it("recognizes repeated top-of-range performance as a progression signal", () => {''',
)
