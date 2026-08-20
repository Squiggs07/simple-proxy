import type { AppState, WeekTrainingException } from "@/lib/startHereModels";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type TrainingSplit = "full-body" | "upper" | "lower";
export type WorkoutVariant = "A" | "B";
export type TrainingDayAdjustment = "moved-from" | "moved-to" | "skipped" | null;

export interface TrainingDayPlan {
  date: string;
  day: Weekday;
  baseScheduled: boolean;
  scheduled: boolean;
  completed: boolean;
  trained: boolean;
  excused: boolean;
  adjustment: TrainingDayAdjustment;
  movedFromDate: string | null;
  movedToDate: string | null;
  split: TrainingSplit | null;
  variant: WorkoutVariant | null;
  workoutName: string | null;
  actualWorkoutName: string | null;
  sequence: number | null;
}

export interface TrainingWeekPlan {
  start: string;
  end: string;
  preferredDays: Weekday[];
  days: TrainingDayPlan[];
  scheduledCount: number;
  completedScheduled: number;
  completedTotal: number;
  today: TrainingDayPlan;
  nextTrainingDay: TrainingDayPlan;
  activeExceptions: WeekTrainingException[];
  adjustmentSummary: string[];
}

export interface ObservedTrainingPattern {
  days: Weekday[];
  sessions: number;
  coverage: number;
  confidence: "moderate" | "strong";
}

interface EffectiveSlot {
  sequence: number;
  movedFromDate: string | null;
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(date: string, days: number) {
  const next = parseDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return dateKey(next);
}

export function weekdayForDate(date: string): Weekday {
  const jsDay = parseDate(date).getUTCDay();
  return WEEKDAYS[(jsDay + 6) % 7];
}

export function mondayOf(date: string) {
  const day = weekdayForDate(date);
  return addCalendarDays(date, -WEEKDAYS.indexOf(day));
}

export function defaultTrainingDays(count: number): Weekday[] {
  const clamped = Math.max(1, Math.min(6, Math.round(count)));
  const presets: Record<number, Weekday[]> = {
    1: ["Wed"],
    2: ["Tue", "Fri"],
    3: ["Mon", "Wed", "Fri"],
    4: ["Mon", "Tue", "Thu", "Sat"],
    5: ["Mon", "Tue", "Wed", "Fri", "Sat"],
    6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };
  return presets[clamped];
}

export function preferredDaySelection(days: string[]): Weekday[] {
  return [...new Set(days.filter((day): day is Weekday => WEEKDAYS.includes(day as Weekday)))]
    .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

export function togglePreferredDaySelection(days: string[], day: Weekday, trainingDays: number): Weekday[] {
  const target = Math.max(1, Math.min(6, Math.round(trainingDays)));
  const selected = preferredDaySelection(days);
  if (selected.includes(day)) return selected.filter((item) => item !== day);
  if (selected.length >= target) return selected;
  return [...selected, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

export function normalizePreferredDays(days: string[], trainingDays: number): Weekday[] {
  const target = Math.max(1, Math.min(6, Math.round(trainingDays)));
  const valid = preferredDaySelection(days);
  const defaults = defaultTrainingDays(target);
  const filled = [...valid];
  for (const day of defaults) {
    if (filled.length >= target) break;
    if (!filled.includes(day)) filled.push(day);
  }
  for (const day of WEEKDAYS) {
    if (filled.length >= target) break;
    if (!filled.includes(day)) filled.push(day);
  }
  return filled.slice(0, target).sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

export function workoutIdentity(sequence: number, trainingDays: number) {
  if (trainingDays <= 3) {
    const variant: WorkoutVariant = sequence % 2 === 0 ? "A" : "B";
    return { split: "full-body" as const, variant, name: `Full Body ${variant}` };
  }
  const split: TrainingSplit = sequence % 2 === 0 ? "upper" : "lower";
  const variant: WorkoutVariant = Math.floor(sequence / 2) % 2 === 0 ? "A" : "B";
  return {
    split,
    variant,
    name: `${split === "upper" ? "Upper Body" : "Lower Body"} ${variant}`,
  };
}

function latestWorkoutNameOn(state: AppState, date: string) {
  return [...state.workoutLogs].reverse().find((log) => log.completed && log.date === date)?.workoutName ?? null;
}

function completedBefore(state: AppState, date: string) {
  return state.workoutLogs.filter((log) => log.completed && log.date < date).length;
}

export function activeWeekExceptions(state: AppState, weekStart: string) {
  const latest = new Map<string, WeekTrainingException>();
  for (const exception of [...state.weekTrainingExceptions]
    .filter((item) => item.weekStart === weekStart)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    latest.set(exception.fromDate, exception);
  }
  return [...latest.values()].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
}

function dateLabel(date: string) {
  const value = parseDate(date);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(value);
}

function adjustmentSummaries(exceptions: WeekTrainingException[]) {
  return exceptions.map((exception) => exception.kind === "move" && exception.toDate
    ? `Moved ${dateLabel(exception.fromDate)} → ${dateLabel(exception.toDate)} for this week.`
    : `Skipped ${dateLabel(exception.fromDate)} for this week.`);
}

function effectiveSchedule(
  baseSequenceByDate: Map<string, number>,
  exceptions: WeekTrainingException[],
  weekStart: string,
  weekEnd: string,
) {
  const schedule = new Map<string, EffectiveSlot>(
    [...baseSequenceByDate.entries()].map(([date, sequence]) => [date, { sequence, movedFromDate: null }]),
  );

  for (const exception of exceptions) {
    const sequence = baseSequenceByDate.get(exception.fromDate);
    if (sequence === undefined) continue;

    if (exception.kind === "move" && exception.toDate) {
      const target = exception.toDate;
      const targetInsideWeek = target >= weekStart && target <= weekEnd;
      const occupiedByAnotherSession = target !== exception.fromDate && schedule.has(target);
      if (!targetInsideWeek || occupiedByAnotherSession) continue;
      schedule.delete(exception.fromDate);
      schedule.set(target, { sequence, movedFromDate: exception.fromDate });
      continue;
    }

    if (exception.kind === "skip") schedule.delete(exception.fromDate);
  }
  return schedule;
}

function planDay(
  state: AppState,
  date: string,
  baseSequenceByDate: Map<string, number>,
  schedule: Map<string, EffectiveSlot>,
  exceptions: WeekTrainingException[],
): TrainingDayPlan {
  const day = weekdayForDate(date);
  const baseScheduled = baseSequenceByDate.has(date);
  const slot = schedule.get(date);
  const trained = state.workoutLogs.some((log) => log.completed && log.date === date);
  const sourceException = exceptions.find((item) => item.fromDate === date) ?? null;
  const targetException = exceptions.find((item) => item.kind === "move" && item.toDate === date) ?? null;
  const adjustment: TrainingDayAdjustment = targetException
    ? "moved-to"
    : sourceException?.kind === "move"
      ? "moved-from"
      : sourceException?.kind === "skip"
        ? "skipped"
        : null;
  const sequence = slot?.sequence ?? null;
  const identity = sequence === null ? null : workoutIdentity(sequence, state.trainingDays);
  const scheduled = Boolean(slot);
  return {
    date,
    day,
    baseScheduled,
    scheduled,
    completed: scheduled && trained,
    trained,
    excused: Boolean(sourceException && !scheduled),
    adjustment,
    movedFromDate: targetException?.fromDate ?? slot?.movedFromDate ?? null,
    movedToDate: sourceException?.kind === "move" ? sourceException.toDate : null,
    split: identity?.split ?? null,
    variant: identity?.variant ?? null,
    workoutName: identity?.name ?? null,
    actualWorkoutName: latestWorkoutNameOn(state, date),
    sequence,
  };
}

export function buildTrainingWeek(state: AppState, today: string): TrainingWeekPlan {
  const start = mondayOf(today);
  const end = addCalendarDays(start, 6);
  const preferred = normalizePreferredDays(state.preferredDays, state.trainingDays);
  const baseSequence = completedBefore(state, start);
  const baseScheduledDates = Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index))
    .filter((date) => preferred.includes(weekdayForDate(date)));
  const baseSequenceByDate = new Map(baseScheduledDates.map((date, index) => [date, baseSequence + index]));
  const exceptions = activeWeekExceptions(state, start).filter((item) => baseSequenceByDate.has(item.fromDate));
  const schedule = effectiveSchedule(baseSequenceByDate, exceptions, start, end);
  const days = Array.from({ length: 7 }, (_, index) => planDay(state, addCalendarDays(start, index), baseSequenceByDate, schedule, exceptions));
  const todayPlan = days.find((day) => day.date === today) ?? planDay(state, today, baseSequenceByDate, schedule, exceptions);

  let nextTrainingDay = days.find((day) => day.date >= today && day.scheduled && !day.completed) ?? null;
  if (!nextTrainingDay) {
    const nextWeekStart = addCalendarDays(start, 7);
    const nextWeekEnd = addCalendarDays(nextWeekStart, 6);
    const sequenceStart = baseSequence + schedule.size;
    const futureDates = Array.from({ length: 7 }, (_, index) => addCalendarDays(nextWeekStart, index))
      .filter((date) => preferred.includes(weekdayForDate(date)));
    const futureBase = new Map(futureDates.map((date, index) => [date, sequenceStart + index]));
    const futureSchedule = effectiveSchedule(futureBase, activeWeekExceptions(state, nextWeekStart), nextWeekStart, nextWeekEnd);
    const date = [...futureSchedule.keys()].sort()[0];
    nextTrainingDay = planDay(state, date, futureBase, futureSchedule, activeWeekExceptions(state, nextWeekStart));
  }

  return {
    start,
    end,
    preferredDays: preferred,
    days,
    scheduledCount: days.filter((day) => day.scheduled).length,
    completedScheduled: days.filter((day) => day.completed).length,
    completedTotal: state.workoutLogs.filter((log) => log.completed && log.date >= start && log.date <= end).length,
    today: todayPlan,
    nextTrainingDay,
    activeExceptions: exceptions,
    adjustmentSummary: adjustmentSummaries(exceptions),
  };
}

export function observedTrainingPattern(state: AppState, today: string, windowDays = 35): ObservedTrainingPattern | null {
  const cutoff = addCalendarDays(today, -(windowDays - 1));
  const uniqueDates = [...new Set(
    state.workoutLogs
      .filter((log) => log.completed && log.date >= cutoff && log.date <= today)
      .map((log) => log.date),
  )];
  const required = Math.max(6, state.trainingDays * 2);
  if (uniqueDates.length < required) return null;

  const counts = new Map<Weekday, number>(WEEKDAYS.map((day) => [day, 0]));
  for (const date of uniqueDates) {
    const day = weekdayForDate(date);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || WEEKDAYS.indexOf(a[0]) - WEEKDAYS.indexOf(b[0]))
    .slice(0, state.trainingDays);
  if (top.some(([, count]) => count < 2)) return null;
  const captured = top.reduce((sum, [, count]) => sum + count, 0);
  const coverage = captured / uniqueDates.length;
  if (coverage < 0.75) return null;
  const days = top.map(([day]) => day).sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  const current = normalizePreferredDays(state.preferredDays, state.trainingDays);
  if (days.length === current.length && days.every((day, index) => day === current[index])) return null;
  return {
    days,
    sessions: uniqueDates.length,
    coverage,
    confidence: coverage >= 0.85 ? "strong" : "moderate",
  };
}

export function daysLabel(days: string[]) {
  return days.join(" / ");
}
