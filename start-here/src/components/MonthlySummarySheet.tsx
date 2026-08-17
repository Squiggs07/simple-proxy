"use client";

import { smoothedWeightTrend } from "@/lib/startHereEngine";
import type { AppState } from "@/lib/startHereModels";

interface Props {
  state: AppState;
  onClose: () => void;
}

export function MonthlySummarySheet({ state, onClose }: Props) {
  const trend = smoothedWeightTrend(state.weightLog, 7);
  const trendChange = trend.length >= 2 ? trend[trend.length - 1].trend - trend[0].trend : null;
  const workouts = state.workoutLogs.filter((item) => item.completed).length;
  const loggedSets = state.workoutLogs.reduce((sum, session) => sum + session.exercises.reduce((setSum, exercise) => setSum + exercise.sets.filter((set) => set.complete).length, 0), 0);
  const readings = state.weightLog.length;
  const meals = state.eatenMealIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16221E]/25 px-2 backdrop-blur-[2px]" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="sheet w-full max-w-[430px]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8D5CF]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.14em] text-[#6E9084]">MONTHLY SUMMARY</p>
            <h2 className="mt-1 text-[26px] font-semibold tracking-[-.035em]">What actually happened.</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736F]">No score. Just the useful signals worth carrying into the next month.</p>
          </div>
          <button onClick={onClose} className="round-button" aria-label="Close monthly summary">×</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <SummaryMetric label="Workouts" value={`${workouts}`} copy={`${loggedSets} completed sets logged`} />
          <SummaryMetric label="Meals logged" value={`${meals}`} copy="Useful preference feedback, not a streak" />
          <SummaryMetric label="Weight readings" value={`${readings}`} copy="Used only through the smoothed trend" />
          <SummaryMetric
            label="Trend movement"
            value={trendChange === null ? "—" : `${trendChange > 0 ? "+" : ""}${trendChange.toFixed(1)} kg`}
            copy="Direction, not a judgment"
          />
        </div>

        <div className="mt-4 rounded-[22px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#526860]">
          <strong className="text-[#17483F]">What to carry forward:</strong>
          <p className="mt-1">Keep the meals and exercises that felt easy to repeat. Change friction before trying to add more effort.</p>
        </div>

        <div className="mt-3 rounded-[22px] bg-[#FCFAF6] p-4 text-xs leading-5 text-[#727C78]">
          Progress can also show up as better exercise performance, more comfortable sessions, steadier protein intake, better energy, or simply needing less mental effort to follow the plan.
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <div className="rounded-[20px] border border-[#E6E0D6] bg-white p-4">
      <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#8A928F]">{label}</p>
      <p className="mt-2 text-[24px] font-semibold tracking-[-.03em] text-[#1D2926]">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#7D8582]">{copy}</p>
    </div>
  );
}
