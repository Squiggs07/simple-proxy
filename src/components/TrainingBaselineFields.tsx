"use client";

import type { AppState, LiftingHistory } from "@/lib/startHereModels";
import { inputWeightToKg, kgToInputWeight } from "@/lib/startHereUnits";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function displayInput(valueKg: number | null, state: AppState) {
  if (valueKg === null) return "";
  const converted = kgToInputWeight(valueKg, state.unitSystem);
  return String(Math.round(converted * 2) / 2);
}

export function TrainingBaselineFields({ state, patch }: { state: AppState; patch: (update: Partial<AppState>) => void }) {
  const setHistory = (value: LiftingHistory) => {
    patch({
      liftingHistory: value,
      experience: value === "none" ? "new" : value === "returning" ? "some" : "experienced",
    });
  };

  const setLoad = (key: "benchKg" | "squatKg" | "deadliftKg", raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw);
    patch({
      liftingBaseline: {
        ...state.liftingBaseline,
        [key]: value === null || Number.isNaN(value) ? null : inputWeightToKg(value, state.unitSystem),
      },
    });
  };

  const setPushups = (raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw);
    patch({
      liftingBaseline: {
        ...state.liftingBaseline,
        pushups: value === null || Number.isNaN(value) ? null : Math.max(0, Math.round(value)),
      },
    });
  };

  const unit = state.unitSystem === "imperial" ? "lb" : "kg";

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <p className="start-label !mb-0">Your lifting starting point</p>
          <span className="text-right text-[10px] text-[#8A928F]">This changes starting volume, not your worth.</span>
        </div>
        <div className="space-y-2">
          {([
            ["none", "New to lifting", "I have little or no consistent strength-training history."],
            ["returning", "I’ve lifted before", "I know the basics but I’m rebuilding consistency."],
            ["consistent", "I train consistently", "I already lift regularly and know my normal working sets."],
          ] as const).map(([value, title, copy]) => (
            <button
              key={value}
              type="button"
              onClick={() => setHistory(value)}
              className={cx("start-choice w-full text-left", state.liftingHistory === value && "selected-choice")}
            >
              <span className="activity-dot" />
              <span className="flex-1"><strong>{title}</strong><small>{copy}</small></span>
              {state.liftingHistory === value && <span className="text-sm font-bold text-[#17483F]">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {state.liftingHistory !== "none" && (
        <div className="rounded-[20px] border border-[#E6E0D6] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Optional strength baseline</p>
              <p className="mt-1 text-xs leading-5 text-[#7D8582]">Use a rough normal working-set weight, not a one-rep max. Leave anything blank if you do not know it.</p>
            </div>
            <span className="rounded-full bg-[#ECF3EE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#49655C]">{unit}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="start-field"><span>Bench / chest press</span><input inputMode="decimal" placeholder="Optional" value={displayInput(state.liftingBaseline.benchKg, state)} onChange={(e) => setLoad("benchKg", e.target.value)} /></label>
            <label className="start-field"><span>Squat / leg press</span><input inputMode="decimal" placeholder="Optional" value={displayInput(state.liftingBaseline.squatKg, state)} onChange={(e) => setLoad("squatKg", e.target.value)} /></label>
            <label className="start-field"><span>Deadlift / hinge</span><input inputMode="decimal" placeholder="Optional" value={displayInput(state.liftingBaseline.deadliftKg, state)} onChange={(e) => setLoad("deadliftKg", e.target.value)} /></label>
            <label className="start-field"><span>Comfortable push-ups</span><input inputMode="numeric" placeholder="Optional" value={state.liftingBaseline.pushups ?? ""} onChange={(e) => setPushups(e.target.value)} /></label>
          </div>
        </div>
      )}
    </div>
  );
}
