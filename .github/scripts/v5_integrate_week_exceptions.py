from pathlib import Path
import re


def replace(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old[:220]!r}")
    p.write_text(text.replace(old, new, 1))


# Main deterministic Coach: let week-only schedule actions resolve before generic training changes.
coach = "src/lib/startHereCoach.ts"
replace(
    coach,
    'import { defaultTrainingDays } from "@/lib/startHereWeek";\n',
    'import { defaultTrainingDays, mondayOf } from "@/lib/startHereWeek";\nimport { interpretWeekScheduleRequest } from "@/lib/startHereWeekCoach";\n',
)
replace(
    coach,
    '''  if (!text) {
    return { patch: {}, reply: "Tell me what does not fit. I can change meals, targets, training, or how much detail the app shows." };
  }

  if (/lean bulk|lean gain/.test(text)''',
    '''  if (!text) {
    return { patch: {}, reply: "Tell me what does not fit. I can change meals, targets, training, or how much detail the app shows." };
  }

  const weekScheduleAction = interpretWeekScheduleRequest(raw, state);
  if (weekScheduleAction) return weekScheduleAction;

  if (/lean bulk|lean gain/.test(text)''',
)
replace(
    coach,
    '''        preferredDays: defaultTrainingDays(Math.min(state.trainingDays, 2)),
        sessionMinutes: Math.min(state.sessionMinutes, 30),''',
    '''        preferredDays: defaultTrainingDays(Math.min(state.trainingDays, 2)),
        weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== mondayOf(state.currentDay || new Date().toISOString().slice(0, 10))),
        sessionMinutes: Math.min(state.sessionMinutes, 30),''',
)
replace(
    coach,
    '''patch: { trainingDays: Math.max(1, Math.min(6, days)), preferredDays: defaultTrainingDays(Math.max(1, Math.min(6, days))), sessionMinutes: Math.max(15, Math.min(90, minutes)), todayOverride: { minutes: null, equipment: null, note: null } },''',
    '''patch: { trainingDays: Math.max(1, Math.min(6, days)), preferredDays: defaultTrainingDays(Math.max(1, Math.min(6, days))), weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== mondayOf(state.currentDay || new Date().toISOString().slice(0, 10))), sessionMinutes: Math.max(15, Math.min(90, minutes)), todayOverride: { minutes: null, equipment: null, note: null } },''',
)

# Week planner: do not surface stale exceptions if the underlying normal schedule changed.
week = "src/lib/startHereWeek.ts"
replace(
    week,
    '''  const exceptions = activeWeekExceptions(state, start);
  const schedule = effectiveSchedule(baseSequenceByDate, exceptions, start, end);''',
    '''  const exceptions = activeWeekExceptions(state, start).filter((item) => baseSequenceByDate.has(item.fromDate));
  const schedule = effectiveSchedule(baseSequenceByDate, exceptions, start, end);''',
)

# Adherence should respect excused/skipped week-only sessions rather than penalizing them.
adaptation = "src/lib/startHereAdaptation.ts"
replace(
    adaptation,
    'import { daysLabel, observedTrainingPattern } from "@/lib/startHereWeek";\n',
    'import { buildTrainingWeek, daysLabel, mondayOf, observedTrainingPattern } from "@/lib/startHereWeek";\n',
)
pattern = re.compile(r'''export function workoutAdherence\(state: AppState, today: string, windowDays = 14\): number \| null \{.*?\n\}''', re.S)
p = Path(adaptation)
text = p.read_text()
replacement = '''export function workoutAdherence(state: AppState, today: string, windowDays = 14): number | null {
  if (!state.onboardingCompletedAt) return null;
  const onboardingDate = state.onboardingCompletedAt.slice(0, 10);
  const start = onboardingDate > daysAgo(today, windowDays - 1) ? onboardingDate : daysAgo(today, windowDays - 1);
  const elapsed = diffDays(today, start) + 1;
  if (elapsed < 7) return null;

  const expectedDates = new Set<string>();
  for (let weekStart = mondayOf(start); weekStart <= today; weekStart = daysAgo(weekStart, -7)) {
    const week = buildTrainingWeek(state, weekStart);
    for (const day of week.days) {
      if (day.scheduled && day.date >= start && day.date <= today) expectedDates.add(day.date);
    }
  }
  const expected = expectedDates.size;
  if (!expected) return null;
  const completedDates = new Set(
    state.workoutLogs
      .filter((log) => log.completed && log.date >= start && log.date <= today)
      .map((log) => log.date),
  );
  return Math.min(1.5, completedDates.size / expected);
}'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"workoutAdherence replacement count={count}")
p.write_text(text)

# UI/persistence: migrate storage and show temporary weekly changes in the existing calm weekly strip.
app = "src/components/StartHereAppV2.tsx"
replace(
    app,
    '''  normalizePreferredDays,
  type TrainingWeekPlan,''',
    '''  normalizePreferredDays,
  mondayOf,
  type TrainingWeekPlan,''',
)
replace(
    app,
    '''const saved = localStorage.getItem("start-here-state-v8") ?? localStorage.getItem("start-here-state-v7")''',
    '''const saved = localStorage.getItem("start-here-state-v9") ?? localStorage.getItem("start-here-state-v8") ?? localStorage.getItem("start-here-state-v7")''',
)
replace(
    app,
    '''if (ready) localStorage.setItem("start-here-state-v8", JSON.stringify(state));''',
    '''if (ready) localStorage.setItem("start-here-state-v9", JSON.stringify(state));''',
)
replace(
    app,
    '''reset={() => { localStorage.removeItem("start-here-state-v8");''',
    '''reset={() => { localStorage.removeItem("start-here-state-v9"); localStorage.removeItem("start-here-state-v8");''',
)
replace(
    app,
    '''  function setFrequency(days: number) {
    patch({ trainingDays: days, preferredDays: defaultTrainingDays(days) });
  }''',
    '''  function setFrequency(days: number) {
    const weekStart = mondayOf(state.currentDay || todayKey());
    patch({ trainingDays: days, preferredDays: defaultTrainingDays(days), weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== weekStart) });
  }''',
)
replace(
    app,
    '''    patch({ preferredDays: next });
  }''',
    '''    const weekStart = mondayOf(state.currentDay || todayKey());
    patch({ preferredDays: next, weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== weekStart) });
  }''',
)

p = Path(app)
text = p.read_text()
old_strip = '''function TrainingWeekStrip({ week }: { week: TrainingWeekPlan }) {
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
}'''
new_strip = '''function TrainingWeekStrip({ week }: { week: TrainingWeekPlan }) {
  const extra = Math.max(0, week.completedTotal - week.completedScheduled);
  return <section className="dashboard-card mt-3">
    <div className="flex items-center justify-between gap-3"><div><p className="card-kicker">THIS WEEK</p><p className="mt-1 text-sm font-semibold">{week.completedScheduled} of {week.scheduledCount} planned sessions</p></div><span className="text-xs font-semibold text-[#6E7874]">{daysLabel(week.preferredDays)}</span></div>
    <div className="mt-4 grid grid-cols-7 gap-1.5">{week.days.map((day) => {
      const isToday = day.date === week.today.date;
      const done = day.trained;
      const marker = done ? "✓" : day.adjustment === "moved-from" ? "→" : day.adjustment === "skipped" ? "×" : day.scheduled ? "•" : "–";
      return <div key={day.date} className={cx("rounded-xl px-1 py-2 text-center", isToday ? "bg-[#ECF3EE]" : day.excused ? "bg-[#EAE6F5]/55" : "bg-[#FCFAF6]")}><p className="text-[9px] font-bold uppercase text-[#8A938F]">{day.day}</p><div className={cx("mx-auto mt-1.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold", done ? "bg-[#17483F] text-white" : day.adjustment === "moved-to" ? "border border-[#6E9084] bg-[#ECF3EE] text-[#17483F]" : day.excused ? "text-[#777187]" : day.scheduled ? "border border-[#9AB2A8] text-[#17483F]" : "text-[#B3B9B6]")}>{marker}</div></div>;
    })}</div>
    <p className="mt-3 text-xs leading-5 text-[#7B8581]">Next: {week.nextTrainingDay.day} · {week.nextTrainingDay.workoutName}{extra ? ` · ${extra} extra session${extra === 1 ? "" : "s"} also counted` : ""}</p>
    {week.adjustmentSummary.length > 0 && <div className="mt-3 rounded-xl bg-[#EAE6F5]/60 px-3 py-2.5">{week.adjustmentSummary.map((item) => <p key={item} className="text-[11px] leading-5 text-[#666276]">{item}</p>)}</div>}
  </section>;
}'''
if old_strip not in text:
    raise SystemExit("TrainingWeekStrip exact block not found")
text = text.replace(old_strip, new_strip, 1)
text = text.replace(
    '''<PageHeader eyebrow={friendlyDate().toUpperCase()} title="Here’s your manageable plan." copy={week.today.scheduled ? "Today fits your normal training rhythm." : `No workout is scheduled today. Your next planned session is ${week.nextTrainingDay.day}.`}''',
    '''<PageHeader eyebrow={friendlyDate().toUpperCase()} title="Here’s your manageable plan." copy={week.today.adjustment === "moved-to" ? "This workout was moved here for this week only." : week.today.excused ? `Today’s normal workout is excused for this week. Your next planned session is ${week.nextTrainingDay.day}.` : week.today.scheduled ? "Today fits your normal training rhythm." : `No workout is scheduled today. Your next planned session is ${week.nextTrainingDay.day}.`}''',
    1,
)
p.write_text(text)

# Extra regression: an excused session must not lower adherence.
adaptation_test = "src/lib/startHereAdaptation.test.ts"
p = Path(adaptation_test)
text = p.read_text()
marker = '''  it("recognizes repeated top-of-range performance as a progression signal", () => {'''
insert = '''  it("does not penalize workout adherence for a session Coach excused this week", () => {
    const current = state({
      trainingDays: 3,
      preferredDays: ["Mon", "Wed", "Fri"],
      onboardingCompletedAt: "2026-08-03T12:00:00.000Z",
      weekTrainingExceptions: [{ id: "skip", weekStart: "2026-08-10", kind: "skip", fromDate: "2026-08-14", toDate: null, createdAt: "2026-08-10T10:00:00.000Z", note: null }],
      workoutLogs: [
        { id: "a", date: "2026-08-03", workoutName: "A", minutes: 45, exercises: [], completed: true },
        { id: "b", date: "2026-08-05", workoutName: "B", minutes: 45, exercises: [], completed: true },
        { id: "c", date: "2026-08-07", workoutName: "A", minutes: 45, exercises: [], completed: true },
        { id: "d", date: "2026-08-10", workoutName: "B", minutes: 45, exercises: [], completed: true },
        { id: "e", date: "2026-08-12", workoutName: "A", minutes: 45, exercises: [], completed: true },
        { id: "f", date: "2026-08-17", workoutName: "B", minutes: 45, exercises: [], completed: true },
      ],
    });
    expect(workoutAdherence(current, "2026-08-17")).toBe(1);
  });

'''
if marker not in text:
    raise SystemExit("adaptation test marker missing")
p.write_text(text.replace(marker, insert + marker, 1))

# Permanent CI includes the new deterministic week-schedule parser.
ci = ".github/workflows/start-here-ci.yml"
replace(
    ci,
    '''src/lib/startHereBehavior.ts src/lib/startHereWeek.ts src/lib/startHereCoach.ts''',
    '''src/lib/startHereBehavior.ts src/lib/startHereWeek.ts src/lib/startHereWeekCoach.ts src/lib/startHereCoach.ts''',
)
