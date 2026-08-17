from pathlib import Path
import re


def replace(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old[:220]!r}")
    p.write_text(text.replace(old, new, 1))


# Adaptation engine: recovery reasons affect today's volume, long-term time-fit suggestions,
# and whether old performance should trigger progression today.
adaptation = "src/lib/startHereAdaptation.ts"
replace(
    adaptation,
    'import { buildTrainingWeek, daysLabel, mondayOf, observedTrainingPattern } from "@/lib/startHereWeek";\n',
    'import { buildTrainingWeek, daysLabel, mondayOf, observedTrainingPattern } from "@/lib/startHereWeek";\nimport { progressionRecoveryHold, recoveryReasonRate } from "@/lib/startHereRecovery";\n',
)
replace(
    adaptation,
    '''  const mealRate = mealAdherence(state, today);
  const lowReadinessRate = readinessLowRate(state, today);
  const recommendations: AdaptationRecommendation[] = [];''',
    '''  const mealRate = mealAdherence(state, today);
  const lowReadinessRate = readinessLowRate(state, today);
  const shortTimeRate = recoveryReasonRate(state, today, "short-on-time");
  const recommendations: AdaptationRecommendation[] = [];''',
)
replace(
    adaptation,
    '''  if (readiness?.readiness === "low") {
    const reducedMinutes = Math.max(15, Math.round((state.sessionMinutes * 0.75) / 5) * 5);
    if ((state.todayOverride.minutes ?? state.sessionMinutes) > reducedMinutes) {
      recommendations.push({
        id: "recovery-easier-today",
        kind: "recovery",
        scope: "today",
        title: `Make today a ${reducedMinutes}-minute session`,
        reason: "You marked today as low readiness. Keeping the habit while trimming volume is usually more useful than forcing the normal session.",
        confidence: "moderate",
        patch: { todayOverride: { ...state.todayOverride, minutes: reducedMinutes, note: "Adjusted from today's readiness check-in." } },
      });
    }
  }''',
    '''  if (readiness?.readiness === "low") {
    const reasons = readiness.reasons ?? [];
    const reducedMinutes = Math.max(15, Math.round((state.sessionMinutes * 0.75) / 5) * 5);
    const reason = reasons.includes("short-on-time")
      ? "You are short on time today. Keeping the habit with less volume is more useful than forcing the normal session."
      : reasons.includes("poor-sleep")
        ? "Sleep was rough, so today stays useful without asking for normal training volume."
        : reasons.includes("sore")
          ? "You flagged soreness today, so the plan trims volume instead of treating every session like a test."
          : reasons.includes("stressed")
            ? "You flagged a high-stress day, so the plan trims volume while keeping the routine intact."
            : "You marked today as low readiness. Keeping the habit while trimming volume is usually more useful than forcing the normal session.";
    if ((state.todayOverride.minutes ?? state.sessionMinutes) > reducedMinutes) {
      recommendations.push({
        id: "recovery-easier-today",
        kind: "recovery",
        scope: "today",
        title: `Make today a ${reducedMinutes}-minute session`,
        reason,
        confidence: "moderate",
        patch: { todayOverride: { ...state.todayOverride, minutes: reducedMinutes, note: "Adjusted from today's recovery check-in." } },
      });
    }
  }''',
)
replace(
    adaptation,
    '''  if (!coolingDown && observedDays) {
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
    '''  if (!coolingDown && observedDays) {
    recommendations.push({
      id: "schedule-observed-days",
      kind: "schedule",
      scope: "ongoing",
      title: `Move training to ${daysLabel(observedDays.days)}`,
      reason: `Across ${observedDays.sessions} recent sessions, those are the days you actually train most consistently. I would rather fit the plan to that pattern than keep marking a different weekday as missed.`,
      confidence: observedDays.confidence,
      patch: { preferredDays: observedDays.days },
    });
  } else if (!coolingDown && shortTimeRate !== null && shortTimeRate >= 0.45 && workoutRate !== null && workoutRate < 0.9 && state.sessionMinutes > 20) {
    const shorter = Math.max(20, state.sessionMinutes - 10);
    recommendations.push({
      id: "recovery-time-fit",
      kind: "recovery",
      scope: "ongoing",
      title: `Make normal sessions ${shorter} minutes`,
      reason: "Being short on time is showing up repeatedly, and workout completion is also below the plan. I would rather make the normal session fit your life than keep treating the same time conflict as a one-off.",
      confidence: "moderate",
      patch: { sessionMinutes: shorter },
    });
  } else if (!coolingDown && lowReadinessRate !== null && lowReadinessRate >= 0.5 && workoutRate !== null && workoutRate < 0.8 && state.sessionMinutes > 20) {''',
)
replace(
    adaptation,
    '''  if (recentAvg >= 10 && priorAvg >= 9 && comparableLoad) return "You handled the top of the rep range twice at a comparable load. If warm-ups feel normal, try a small load increase today.";''',
    '''  if (recentAvg >= 10 && priorAvg >= 9 && comparableLoad) {
    const hold = progressionRecoveryHold(state, state.currentDay || new Date().toISOString().slice(0, 10));
    if (hold) return `${hold}. Your performance still supports progression, but repeat the last successful load today instead of forcing an increase.`;
    return "You handled the top of the rep range twice at a comparable load. If warm-ups feel normal, try a small load increase today.";
  }''',
)

# Main app: v10 persistence, optional one-tap reasons, and Coach conversation extraction.
app = "src/components/StartHereAppV2.tsx"
replace(
    app,
    'import { askCoach } from "@/lib/startHereCoachClient";\n',
    'import { askCoach } from "@/lib/startHereCoachClient";\nimport { RECOVERY_REASON_LABELS, mergeRecoverySignalFromText } from "@/lib/startHereRecovery";\n',
)
replace(
    app,
    '''  type Readiness,
  type Variety,''',
    '''  type Readiness,
  type RecoveryReason,
  type Variety,''',
)
replace(
    app,
    '''const saved = localStorage.getItem("start-here-state-v9") ?? localStorage.getItem("start-here-state-v8")''',
    '''const saved = localStorage.getItem("start-here-state-v10") ?? localStorage.getItem("start-here-state-v9") ?? localStorage.getItem("start-here-state-v8")''',
)
replace(
    app,
    '''if (ready) localStorage.setItem("start-here-state-v9", JSON.stringify(state));''',
    '''if (ready) localStorage.setItem("start-here-state-v10", JSON.stringify(state));''',
)
replace(
    app,
    '''  function saveReadiness(readiness: Readiness) {
    const date = todayKey();
    setState((current) => {
      const readinessCheckIns = [...current.readinessCheckIns.filter((item) => item.date !== date), { date, readiness }];
      let next: AppState = { ...current, readinessCheckIns };''',
    '''  function saveReadiness(readiness: Readiness) {
    const date = todayKey();
    setState((current) => {
      const existing = [...current.readinessCheckIns].reverse().find((item) => item.date === date);
      const existingReasons = existing?.reasons ?? [];
      const reasons = readiness === "high"
        ? existingReasons.filter((reason) => reason === "feeling-good")
        : readiness === "low"
          ? existingReasons.filter((reason) => reason !== "feeling-good")
          : [];
      const readinessCheckIns = [...current.readinessCheckIns.filter((item) => item.date !== date), { date, readiness, reasons, source: "check-in" as const }];
      let next: AppState = { ...current, readinessCheckIns };''',
)
replace(
    app,
    '''      } else if (current.todayOverride.note === "Adjusted from today's readiness check-in.") {
        next = { ...next, todayOverride: { ...current.todayOverride, minutes: null, note: null } };''',
    '''      } else if (current.todayOverride.note === "Adjusted from today's readiness check-in." || current.todayOverride.note === "Adjusted from today's recovery check-in.") {
        next = { ...next, todayOverride: { ...current.todayOverride, minutes: null, note: null } };''',
)
replace(
    app,
    '''  function applyAdaptiveRecommendation(recommendation: AdaptationRecommendation) {''',
    '''  function toggleRecoveryReason(reason: RecoveryReason) {
    const date = todayKey();
    setState((current) => {
      const existing = [...current.readinessCheckIns].reverse().find((item) => item.date === date);
      if (!existing) return current;
      const reasons = existing.reasons ?? [];
      const nextReasons = reasons.includes(reason) ? reasons.filter((item) => item !== reason) : [...reasons, reason];
      const readinessCheckIns = [
        ...current.readinessCheckIns.filter((item) => item.date !== date),
        { ...existing, reasons: nextReasons, source: "check-in" as const },
      ];
      return { ...current, readinessCheckIns };
    });
  }

  function applyAdaptiveRecommendation(recommendation: AdaptationRecommendation) {''',
)

p = Path(app)
text = p.read_text()
handle_pattern = re.compile(r'''  async function handleCoach\(event: FormEvent\) \{.*?\n  \}\n\n  function undoCoach''', re.S)
new_handle = r'''  async function handleCoach(event: FormEvent) {
    event.preventDefault();
    const raw = coachText.trim();
    if (!raw || coachBusy) return;

    const snapshot = state;
    const date = todayKey();
    const recoverySignal = mergeRecoverySignalFromText(snapshot, raw, date);
    const now = new Date().toISOString();
    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, text: raw, createdAt: now };
    setCoachText("");
    setCoachBusy(true);
    setState((current) => ({ ...current, coachHistory: [...current.coachHistory, userMessage] }));

    function applyResult(result: ReturnType<typeof interpretCoachRequest>, aiAnswer?: string) {
      let resultPatch: Partial<AppState> = { ...result.patch, ...(recoverySignal?.patch ?? {}) };
      let recoveryAdjustment: AdaptationRecommendation | undefined;
      if (recoverySignal?.signal.inferredReadiness === "low" && !result.patch.todayOverride) {
        const recoveryState = { ...snapshot, ...resultPatch };
        recoveryAdjustment = buildAdaptationReview(recoveryState, date).recommendations.find((item) => item.kind === "recovery" && item.scope === "today");
        if (recoveryAdjustment) resultPatch = { ...resultPatch, ...recoveryAdjustment.patch };
      }

      const changed = Object.keys(resultPatch).length > 0;
      if (changed) setUndoSnapshot(snapshot);

      let reply = result.reply;
      if (aiAnswer) {
        if (Object.keys(result.patch).length > 0) reply = `${aiAnswer}\n\n${result.reply}`;
        else if (result.clarification === "safety") reply = `${aiAnswer}\n\n${result.reply}`;
        else reply = aiAnswer;
      } else if (recoverySignal && Object.keys(result.patch).length === 0) {
        reply = "Got it. I’ll use that as today’s recovery context rather than treating it like a permanent change.";
      }

      if (recoverySignal) reply = `${reply}\n\n${recoverySignal.summary}`;
      if (recoveryAdjustment) reply = `${reply} ${recoveryAdjustment.title}.`;

      const recoveryLabels = recoverySignal?.signal.reasons.map((reason) => RECOVERY_REASON_LABELS[reason]).join(" + ");
      const changeSummary = [result.changeSummary, recoveryLabels ? `Recovery: ${recoveryLabels}` : undefined, recoveryAdjustment?.title]
        .filter(Boolean)
        .join(" · ") || undefined;
      const coachMessage = {
        id: `coach-${Date.now() + 1}`,
        role: "coach" as const,
        text: reply,
        changeSummary,
        createdAt: new Date().toISOString(),
      };
      setState((current) => ({ ...current, ...resultPatch, coachHistory: [...current.coachHistory, coachMessage] }));
    }

    try {
      const ai = await askCoach(raw, snapshot, targets);
      const command = ai.canonicalCommand?.trim() || raw;
      applyResult(interpretCoachRequest(command, snapshot), ai.available ? ai.answer : undefined);
    } catch {
      applyResult(interpretCoachRequest(raw, snapshot));
    } finally {
      setCoachBusy(false);
    }
  }

  function undoCoach'''
text, count = handle_pattern.subn(new_handle, text, count=1)
if count != 1:
    raise SystemExit(f"handleCoach replacement count={count}")
text = text.replace(
    '''<TodayView state={state} targets={targets} meals={dayMeals} workout={effectiveWorkout} week={trainingWeek} adaptation={adaptationReview} setReadiness={saveReadiness} applyAdaptation={applyAdaptiveRecommendation}''',
    '''<TodayView state={state} targets={targets} meals={dayMeals} workout={effectiveWorkout} week={trainingWeek} adaptation={adaptationReview} setReadiness={saveReadiness} toggleRecoveryReason={toggleRecoveryReason} applyAdaptation={applyAdaptiveRecommendation}''',
    1,
)
text = text.replace(
    '''reset={() => { localStorage.removeItem("start-here-state-v9");''',
    '''reset={() => { localStorage.removeItem("start-here-state-v10"); localStorage.removeItem("start-here-state-v9");''',
    1,
)
text = text.replace(
    '''function TodayView({ state, targets, meals, workout, week, adaptation, setReadiness, applyAdaptation, setTab, onStartWorkout, onMeal, onSwap, openProfile }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; workout: WorkoutPlan; week: TrainingWeekPlan; adaptation: ReturnType<typeof buildAdaptationReview>; setReadiness: (value: Readiness) => void; applyAdaptation: (recommendation: AdaptationRecommendation) => void; setTab: (tab: AppTab) => void; onStartWorkout: () => void; onMeal: (id: string) => void; onSwap: (id: string) => void; openProfile: () => void }) {''',
    '''function TodayView({ state, targets, meals, workout, week, adaptation, setReadiness, toggleRecoveryReason, applyAdaptation, setTab, onStartWorkout, onMeal, onSwap, openProfile }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; workout: WorkoutPlan; week: TrainingWeekPlan; adaptation: ReturnType<typeof buildAdaptationReview>; setReadiness: (value: Readiness) => void; toggleRecoveryReason: (reason: RecoveryReason) => void; applyAdaptation: (recommendation: AdaptationRecommendation) => void; setTab: (tab: AppTab) => void; onStartWorkout: () => void; onMeal: (id: string) => void; onSwap: (id: string) => void; openProfile: () => void }) {''',
    1,
)
text = text.replace(
    '''  const readiness = adaptation.latestReadiness?.readiness ?? null;
  const ongoingAdaptation''',
    '''  const readiness = adaptation.latestReadiness?.readiness ?? null;
  const recoveryReasons = adaptation.latestReadiness?.reasons ?? [];
  const recoveryOptions: RecoveryReason[] = readiness === "low" ? ["poor-sleep", "sore", "stressed", "short-on-time"] : readiness === "high" ? ["feeling-good"] : [];
  const ongoingAdaptation''',
    1,
)
old_buttons = '''      <div className="mt-3 grid grid-cols-3 gap-2">{([['low','Running low'],['normal','Normal'],['high','Ready']] as const).map(([value, label]) => <button key={value} onClick={() => setReadiness(value)} className={cx("tiny-button justify-center", readiness === value && "tiny-active")}>{label}</button>)}</div>
      {state.todayOverride.note === "Adjusted from today's readiness check-in." && <p className="mt-3 rounded-xl bg-[#ECF3EE] p-3 text-xs leading-5 text-[#526860]">I shortened today’s workout from your check-in. Tomorrow starts fresh.</p>}'''
new_buttons = '''      <div className="mt-3 grid grid-cols-3 gap-2">{([['low','Running low'],['normal','Normal'],['high','Ready']] as const).map(([value, label]) => <button key={value} onClick={() => setReadiness(value)} className={cx("tiny-button justify-center", readiness === value && "tiny-active")}>{label}</button>)}</div>
      {recoveryOptions.length > 0 && <div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#929996]">Optional · what’s behind that?</p><div className="mt-2 flex flex-wrap gap-2">{recoveryOptions.map((reason) => <button key={reason} onClick={() => toggleRecoveryReason(reason)} className={cx("tiny-button", recoveryReasons.includes(reason) && "tiny-active")}>{recoveryReasons.includes(reason) && <Icon name="check" size={12} />}{RECOVERY_REASON_LABELS[reason]}</button>)}</div></div>}
      {(state.todayOverride.note === "Adjusted from today's readiness check-in." || state.todayOverride.note === "Adjusted from today's recovery check-in.") && <p className="mt-3 rounded-xl bg-[#ECF3EE] p-3 text-xs leading-5 text-[#526860]">I shortened today’s workout from your recovery check-in. Tomorrow starts fresh.</p>}'''
if old_buttons not in text:
    raise SystemExit("readiness button block not found")
text = text.replace(old_buttons, new_buttons, 1)
p.write_text(text)

# Adaptation tests: repeated time pressure can reshape the baseline; bad recovery blocks load progression.
adaptation_test = "src/lib/startHereAdaptation.test.ts"
p = Path(adaptation_test)
text = p.read_text()
marker = '''  it("recognizes repeated top-of-range performance as a progression signal", () => {'''
insert = '''  it("uses repeated time pressure plus imperfect completion to suggest a shorter normal session", () => {
    const current = state({
      trainingDays: 3,
      sessionMinutes: 45,
      readinessCheckIns: [
        { date: "2026-08-07", readiness: "normal", reasons: ["short-on-time"] },
        { date: "2026-08-09", readiness: "normal", reasons: [] },
        { date: "2026-08-11", readiness: "normal", reasons: ["short-on-time"] },
        { date: "2026-08-13", readiness: "normal", reasons: [] },
        { date: "2026-08-15", readiness: "normal", reasons: ["short-on-time"] },
        { date: "2026-08-17", readiness: "normal", reasons: ["short-on-time"] },
      ],
      workoutLogs: [
        { id: "a", date: "2026-08-05", workoutName: "A", minutes: 45, exercises: [], completed: true },
        { id: "b", date: "2026-08-10", workoutName: "B", minutes: 45, exercises: [], completed: true },
        { id: "c", date: "2026-08-14", workoutName: "A", minutes: 45, exercises: [], completed: true },
      ],
    });
    const recommendation = buildAdaptationReview(current, "2026-08-17").recommendations.find((item) => item.id === "recovery-time-fit");
    expect(recommendation?.patch.sessionMinutes).toBe(35);
  });

  it("holds an otherwise-valid progression cue on a poor-sleep day", () => {
    const current = state({
      readinessCheckIns: [{ date: "2026-08-17", readiness: "low", reasons: ["poor-sleep"] }],
      workoutLogs: [
        { id: "w1", date: "2026-08-10", workoutName: "A", minutes: 45, completed: true, exercises: [{ exerciseId: "leg-press", sets: [{ weight: 90, reps: 10, complete: true }, { weight: 90, reps: 10, complete: true }] }] },
        { id: "w2", date: "2026-08-14", workoutName: "A", minutes: 45, completed: true, exercises: [{ exerciseId: "leg-press", sets: [{ weight: 90, reps: 11, complete: true }, { weight: 90, reps: 10, complete: true }] }] },
      ],
    });
    const cue = progressionCue(current, "leg-press");
    expect(cue).toContain("sleep was rough");
    expect(cue).toContain("repeat the last successful load");
  });

'''
if marker not in text:
    raise SystemExit("adaptation test marker missing")
p.write_text(text.replace(marker, insert + marker, 1))
