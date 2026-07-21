/**
 * Progress & habit-loop math. Pure functions, unit tested.
 *
 * Design notes, grounded in how good trackers work:
 * - Daily scale weight swings up to ~2 kg from water/digestion, so every
 *   decision (display, target recomputation) uses a smoothed TREND weight
 *   (exponential moving average, the Happy Scale / Libra approach), never a
 *   single reading.
 * - Logging is celebrated, never shamed: we count days logged, we don't
 *   break streaks.
 */

export interface WeighInPoint {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface TrendPoint extends WeighInPoint {
  trendKg: number;
}

export interface DayLog {
  date: string;
  mealsPlanned: number;
  mealsEaten: number;
  plannedKcal: number;
  eatenKcal: number;
}

/** Smoothing factor for the weight trend EWMA. */
export const TREND_ALPHA = 0.3;

/** Trend must move this far from the profile weight before targets recompute. */
export const RECOMPUTE_THRESHOLD_KG = 1.0;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );
}

/** Exponential moving average over weigh-ins, in date order. */
export function computeTrend(
  weighIns: WeighInPoint[],
  alpha: number = TREND_ALPHA,
): TrendPoint[] {
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  let trend: number | null = null;
  return sorted.map((w) => {
    trend = trend === null ? w.weightKg : trend + alpha * (w.weightKg - trend);
    return { ...w, trendKg: Math.round(trend * 100) / 100 };
  });
}

/**
 * Change in trend weight over the last ~week. Null until there's at least
 * five days of history — early numbers would just be noise.
 */
export function weeklyTrendChange(trend: TrendPoint[]): number | null {
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1];
  const weekAgoCutoff = addDays(latest.date, -7);
  const reference =
    [...trend].reverse().find((p) => p.date <= weekAgoCutoff) ?? trend[0];
  if (diffDays(latest.date, reference.date) < 5) return null;
  return Math.round((latest.trendKg - reference.trendKg) * 100) / 100;
}

export interface WeekOutlook {
  daysElapsed: number;
  daysLogged: number; // days with any meal marked eaten or a weigh-in
  onTrackDays: number; // days where most of the plan was eaten
  weighIns: number;
}

/**
 * The "this week at a glance" numbers, for the 7 days ending `today`
 * (inclusive). A day is on track when most of its plan was actually eaten.
 */
export function weekOutlook(
  today: string,
  days: DayLog[],
  weighIns: WeighInPoint[],
): WeekOutlook {
  const start = addDays(today, -6);
  const inWeek = (date: string) => date >= start && date <= today;

  const weekDays = days.filter((d) => inWeek(d.date));
  const weekWeighIns = weighIns.filter((w) => inWeek(w.date));
  const weighDates = new Set(weekWeighIns.map((w) => w.date));

  const loggedDates = new Set<string>(weighDates);
  let onTrackDays = 0;
  for (const day of weekDays) {
    if (day.mealsEaten > 0) loggedDates.add(day.date);
    if (day.mealsPlanned > 0 && day.mealsEaten / day.mealsPlanned >= 0.75) {
      onTrackDays++;
    }
  }

  return {
    daysElapsed: 7,
    daysLogged: loggedDates.size,
    onTrackDays,
    weighIns: weekWeighIns.length,
  };
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  startTrendKg: number;
  endTrendKg: number;
  changeKg: number;
  daysWeighed: number;
  daysLogged: number;
  mealsEaten: number;
  mealsPlanned: number;
}

/** One row per month with any activity, most recent first. */
export function monthlySummaries(
  trend: TrendPoint[],
  days: DayLog[],
): MonthlySummary[] {
  const months = new Map<string, MonthlySummary>();

  const monthOf = (date: string) => date.slice(0, 7);
  const ensure = (month: string): MonthlySummary => {
    let m = months.get(month);
    if (!m) {
      m = {
        month,
        startTrendKg: 0,
        endTrendKg: 0,
        changeKg: 0,
        daysWeighed: 0,
        daysLogged: 0,
        mealsEaten: 0,
        mealsPlanned: 0,
      };
      months.set(month, m);
    }
    return m;
  };

  for (const point of trend) {
    const m = ensure(monthOf(point.date));
    if (m.daysWeighed === 0) m.startTrendKg = point.trendKg;
    m.endTrendKg = point.trendKg;
    m.daysWeighed++;
  }
  for (const day of days) {
    if (day.mealsPlanned === 0) continue;
    const m = ensure(monthOf(day.date));
    m.mealsPlanned += day.mealsPlanned;
    m.mealsEaten += day.mealsEaten;
    if (day.mealsEaten > 0) m.daysLogged++;
  }

  for (const m of months.values()) {
    m.changeKg = Math.round((m.endTrendKg - m.startTrendKg) * 100) / 100;
  }

  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Targets follow the trend, gently: only recompute once the smoothed weight
 * has genuinely moved (≥1 kg), never off a single reading.
 */
export function shouldRecomputeTarget(
  profileWeightKg: number,
  trendWeightKg: number,
): boolean {
  return Math.abs(trendWeightKg - profileWeightKg) >= RECOMPUTE_THRESHOLD_KG;
}
