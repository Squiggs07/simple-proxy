from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str):
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing integration anchor: {label}")
    return text.replace(old, new, 1)


# ----- StartHereAppV2 -------------------------------------------------------
app = "src/components/StartHereAppV2.tsx"
text = read(app)

text = replace_once(
    text,
    'import { askCoach } from "@/lib/startHereCoachClient";\n',
    'import { askCoach } from "@/lib/startHereCoachClient";\nimport { RECOVERY_REASON_LABELS, mergeRecoverySignalFromText } from "@/lib/startHereRecovery";\n',
    "recovery import",
)

if 'type RecoveryReason,' not in text:
    text, count = re.subn(r'(\n\s*type Readiness,\n)', r'\1  type RecoveryReason,\n', text, count=1)
    if count != 1:
        raise SystemExit("Missing integration anchor: RecoveryReason type import")

if 'localStorage.getItem("start-here-state-v10")' not in text:
    text = text.replace(
        'localStorage.getItem("start-here-state-v9") ??',
        'localStorage.getItem("start-here-state-v10") ?? localStorage.getItem("start-here-state-v9") ??',
        1,
    )
if 'localStorage.setItem("start-here-state-v10"' not in text:
    text = text.replace(
        'localStorage.setItem("start-here-state-v9", JSON.stringify(state))',
        'localStorage.setItem("start-here-state-v10", JSON.stringify(state))',
        1,
    )
if 'localStorage.removeItem("start-here-state-v10")' not in text:
    text = text.replace(
        'reset={() => { localStorage.removeItem("start-here-state-v9");',
        'reset={() => { localStorage.removeItem("start-here-state-v10"); localStorage.removeItem("start-here-state-v9");',
        1,
    )

save_block = r'''  function saveReadiness(readiness: Readiness) {
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
      let next: AppState = { ...current, readinessCheckIns };
      if (readiness === "low") {
        const recovery = buildAdaptationReview(next, date).recommendations.find((item) => item.kind === "recovery" && item.scope === "today");
        if (recovery) next = { ...next, ...recovery.patch };
      } else if (current.todayOverride.note === "Adjusted from today's readiness check-in." || current.todayOverride.note === "Adjusted from today's recovery check-in.") {
        next = { ...next, todayOverride: { ...current.todayOverride, minutes: null, note: null } };
      }
      return next;
    });
  }

  function toggleRecoveryReason(reason: RecoveryReason) {
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
'''

if 'function toggleRecoveryReason(reason: RecoveryReason)' not in text:
    pattern = re.compile(r'  function saveReadiness\(readiness: Readiness\) \{.*?\n  \}\n\n(?=  function applyAdaptiveRecommendation)', re.S)
    text, count = pattern.subn(save_block + '\n', text, count=1)
    if count != 1:
        raise SystemExit("Missing integration anchor: saveReadiness function")

handle_block = r'''  async function handleCoach(event: FormEvent) {
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
'''

if 'const recoverySignal = mergeRecoverySignalFromText' not in text:
    pattern = re.compile(r'  async function handleCoach\(event: FormEvent\) \{.*?\n  \}\n\n(?=  function undoCoach)', re.S)
    text, count = pattern.subn(handle_block + '\n', text, count=1)
    if count != 1:
        raise SystemExit("Missing integration anchor: handleCoach function")

if 'toggleRecoveryReason={toggleRecoveryReason}' not in text:
    text, count = re.subn(
        r'(<TodayView\b[^>]*?\bsetReadiness=\{saveReadiness\})(\s+applyAdaptation=)',
        r'\1 toggleRecoveryReason={toggleRecoveryReason}\2',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit("Missing integration anchor: TodayView invocation")

if 'toggleRecoveryReason, applyAdaptation' not in text:
    old = 'function TodayView({ state, targets, meals, workout, week, adaptation, setReadiness, applyAdaptation, setTab, onStartWorkout, onMeal, onSwap, openProfile }:'
    new = 'function TodayView({ state, targets, meals, workout, week, adaptation, setReadiness, toggleRecoveryReason, applyAdaptation, setTab, onStartWorkout, onMeal, onSwap, openProfile }:'
    text = replace_once(text, old, new, "TodayView destructuring")
    old_type = 'setReadiness: (value: Readiness) => void; applyAdaptation:'
    new_type = 'setReadiness: (value: Readiness) => void; toggleRecoveryReason: (reason: RecoveryReason) => void; applyAdaptation:'
    text = replace_once(text, old_type, new_type, "TodayView callback type")

if 'const recoveryOptions: RecoveryReason[]' not in text:
    text, count = re.subn(
        r'(\s+const readiness = adaptation\.latestReadiness\?\.readiness \?\? null;\n)',
        r'\1  const recoveryReasons = adaptation.latestReadiness?.reasons ?? [];\n  const recoveryOptions: RecoveryReason[] = readiness === "low" ? ["poor-sleep", "sore", "stressed", "short-on-time"] : readiness === "high" ? ["feeling-good"] : [];\n',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit("Missing integration anchor: TodayView readiness declaration")

if 'Optional · what’s behind that?' not in text:
    button_anchor = '''      <div className="mt-3 grid grid-cols-3 gap-2">{([["low","Running low"],["normal","Normal"],["high","Ready"]] as const).map(([value, label]) => <button key={value} onClick={() => setReadiness(value)} className={cx("tiny-button justify-center", readiness === value && "tiny-active")}>{label}</button>)}</div>'''
    # Older source used single-quoted tuple literals. Match the whole one-line block by structure instead.
    match = re.search(r'\s+<div className="mt-3 grid grid-cols-3 gap-2">\{\(\[\[.*?Running low.*?Ready.*?</div>', text)
    if not match:
        raise SystemExit("Missing integration anchor: readiness buttons")
    chips = match.group(0) + '''
      {recoveryOptions.length > 0 && <div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#929996]">Optional · what’s behind that?</p><div className="mt-2 flex flex-wrap gap-2">{recoveryOptions.map((reason) => <button key={reason} onClick={() => toggleRecoveryReason(reason)} className={cx("tiny-button", recoveryReasons.includes(reason) && "tiny-active")}>{recoveryReasons.includes(reason) && <Icon name="check" size={12} />}{RECOVERY_REASON_LABELS[reason]}</button>)}</div></div>}'''
    text = text[:match.start()] + chips + text[match.end():]

text = text.replace(
    'state.todayOverride.note === "Adjusted from today\'s readiness check-in."',
    '(state.todayOverride.note === "Adjusted from today\'s readiness check-in." || state.todayOverride.note === "Adjusted from today\'s recovery check-in.")',
)
text = text.replace(
    'I shortened today’s workout from your check-in. Tomorrow starts fresh.',
    'I shortened today’s workout from your recovery check-in. Tomorrow starts fresh.',
)

write(app, text)


# ----- Adaptation engine ----------------------------------------------------
adaptation = "src/lib/startHereAdaptation.ts"
text = read(adaptation)
if 'from "@/lib/startHereRecovery"' not in text:
    text = text.replace(
        'import { buildTrainingWeek, daysLabel, mondayOf, observedTrainingPattern } from "@/lib/startHereWeek";\n',
        'import { buildTrainingWeek, daysLabel, mondayOf, observedTrainingPattern } from "@/lib/startHereWeek";\nimport { progressionRecoveryHold, recoveryReasonRate } from "@/lib/startHereRecovery";\n',
        1,
    )
if 'const shortTimeRate = recoveryReasonRate' not in text:
    text = text.replace(
        '  const lowReadinessRate = readinessLowRate(state, today);\n',
        '  const lowReadinessRate = readinessLowRate(state, today);\n  const shortTimeRate = recoveryReasonRate(state, today, "short-on-time");\n',
        1,
    )
# The feature branch may already have the richer recovery logic. Fail loudly only if it has neither old nor new behavior.
if 'id: "recovery-time-fit"' not in text:
    anchor = '  } else if (!coolingDown && lowReadinessRate !== null && lowReadinessRate >= 0.5 && workoutRate !== null && workoutRate < 0.8 && state.sessionMinutes > 20) {'
    if anchor not in text:
        raise SystemExit("Missing integration anchor: ongoing recovery recommendation")
    time_fit = '''  } else if (!coolingDown && shortTimeRate !== null && shortTimeRate >= 0.45 && workoutRate !== null && workoutRate < 0.9 && state.sessionMinutes > 20) {
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
'''
    text = text.replace(anchor, time_fit + anchor[len('  }'):], 1)

if 'const hold = progressionRecoveryHold' not in text:
    old = '  if (recentAvg >= 10 && priorAvg >= 9 && comparableLoad) return "You handled the top of the rep range twice at a comparable load. If warm-ups feel normal, try a small load increase today.";'
    new = '''  if (recentAvg >= 10 && priorAvg >= 9 && comparableLoad) {
    const hold = progressionRecoveryHold(state, state.currentDay || new Date().toISOString().slice(0, 10));
    if (hold) return `${hold}. Your performance still supports progression, but repeat the last successful load today instead of forcing an increase.`;
    return "You handled the top of the rep range twice at a comparable load. If warm-ups feel normal, try a small load increase today.";
  }'''
    text = replace_once(text, old, new, "progression recovery hold")
write(adaptation, text)

print("Recovery integration applied successfully.")
