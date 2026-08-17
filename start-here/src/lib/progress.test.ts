import { describe, expect, it } from "vitest";

import {
  addDays,
  computeTrend,
  diffDays,
  monthlySummaries,
  RECOMPUTE_THRESHOLD_KG,
  shouldRecomputeTarget,
  weekOutlook,
  weeklyTrendChange,
  type DayLog,
  type WeighInPoint,
} from "./progress";

const w = (date: string, weightKg: number): WeighInPoint => ({ date, weightKg });

describe("date helpers", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-07-01", -1)).toBe("2026-06-30");
  });
  it("diffs days", () => {
    expect(diffDays("2026-07-21", "2026-07-14")).toBe(7);
  });
});

describe("computeTrend", () => {
  it("smooths daily fluctuations", () => {
    // A 2kg water-weight spike should barely move the trend.
    const trend = computeTrend([
      w("2026-07-01", 85),
      w("2026-07-02", 85),
      w("2026-07-03", 87), // spike
      w("2026-07-04", 85),
    ]);
    const spike = trend[2];
    expect(spike.trendKg).toBeLessThan(85.7); // moved < a third of the spike
    expect(trend[3].trendKg).toBeLessThan(spike.trendKg);
  });

  it("starts at the first reading and sorts by date", () => {
    const trend = computeTrend([w("2026-07-02", 90), w("2026-07-01", 84)]);
    expect(trend[0].date).toBe("2026-07-01");
    expect(trend[0].trendKg).toBe(84);
  });

  it("converges toward a sustained new weight", () => {
    const readings = [w("2026-07-01", 85)];
    for (let i = 1; i <= 14; i++) readings.push(w(addDays("2026-07-01", i), 83));
    const trend = computeTrend(readings);
    expect(trend[trend.length - 1].trendKg).toBeLessThan(83.2);
  });
});

describe("weeklyTrendChange", () => {
  it("is null with too little history", () => {
    expect(weeklyTrendChange(computeTrend([w("2026-07-01", 85)]))).toBeNull();
    expect(
      weeklyTrendChange(
        computeTrend([w("2026-07-01", 85), w("2026-07-03", 84.5)]),
      ),
    ).toBeNull();
  });

  it("reports the change over about a week", () => {
    const readings: WeighInPoint[] = [];
    for (let i = 0; i <= 14; i++) {
      readings.push(w(addDays("2026-07-01", i), 85 - i * 0.1));
    }
    const change = weeklyTrendChange(computeTrend(readings));
    expect(change).not.toBeNull();
    expect(change!).toBeLessThan(0);
    expect(Math.abs(change! + 0.7)).toBeLessThan(0.35); // ~ -0.7kg/week pace
  });
});

describe("weekOutlook", () => {
  const day = (date: string, eaten: number, planned = 4): DayLog => ({
    date,
    mealsPlanned: planned,
    mealsEaten: eaten,
    plannedKcal: 2100,
    eatenKcal: (2100 / planned) * eaten,
  });

  it("counts logged and on-track days in the last 7 days only", () => {
    const outlook = weekOutlook(
      "2026-07-21",
      [
        day("2026-07-21", 4), // on track
        day("2026-07-20", 3), // 75% — on track
        day("2026-07-19", 1), // logged, not on track
        day("2026-07-10", 4), // outside window
      ],
      [w("2026-07-18", 85), w("2026-07-01", 86)],
    );
    expect(outlook.daysLogged).toBe(4); // 3 meal days + 1 weigh-in day
    expect(outlook.onTrackDays).toBe(2);
    expect(outlook.weighIns).toBe(1);
  });

  it("does not double count a day with meals and a weigh-in", () => {
    const outlook = weekOutlook("2026-07-21", [day("2026-07-21", 2)], [
      w("2026-07-21", 85),
    ]);
    expect(outlook.daysLogged).toBe(1);
  });
});

describe("monthlySummaries", () => {
  it("aggregates per month, most recent first", () => {
    const trend = computeTrend([
      w("2026-06-01", 87),
      w("2026-06-30", 86),
      w("2026-07-05", 85.5),
      w("2026-07-20", 85),
    ]);
    const days: DayLog[] = [
      { date: "2026-07-05", mealsPlanned: 4, mealsEaten: 4, plannedKcal: 2100, eatenKcal: 2100 },
      { date: "2026-07-06", mealsPlanned: 4, mealsEaten: 0, plannedKcal: 2100, eatenKcal: 0 },
    ];
    const months = monthlySummaries(trend, days);
    expect(months.map((m) => m.month)).toEqual(["2026-07", "2026-06"]);
    const july = months[0];
    expect(july.daysWeighed).toBe(2);
    expect(july.daysLogged).toBe(1);
    expect(july.mealsEaten).toBe(4);
    expect(july.mealsPlanned).toBe(8);
    expect(july.changeKg).toBeLessThan(0);
  });
});

describe("shouldRecomputeTarget", () => {
  it("ignores small trend movements", () => {
    expect(shouldRecomputeTarget(85, 85 + RECOMPUTE_THRESHOLD_KG - 0.1)).toBe(false);
  });
  it("triggers once the trend genuinely moves", () => {
    expect(shouldRecomputeTarget(85, 85 - RECOMPUTE_THRESHOLD_KG)).toBe(true);
    expect(shouldRecomputeTarget(85, 85 + 1.4)).toBe(true);
  });
});
