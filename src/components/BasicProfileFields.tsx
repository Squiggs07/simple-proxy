"use client";

import type { ReactNode } from "react";
import type { AppState, UnitSystem } from "@/lib/startHereModels";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/startHereUnits";

interface Props {
  state: AppState;
  patch: (update: Partial<AppState>) => void;
}

export function validBasicProfile(state: AppState) {
  return (
    Number.isFinite(state.age) &&
    state.age >= 13 &&
    state.age <= 100 &&
    Number.isFinite(state.heightCm) &&
    state.heightCm >= 120 &&
    state.heightCm <= 230 &&
    Number.isFinite(state.weightKg) &&
    state.weightKg >= 30 &&
    state.weightKg <= 350
  );
}

export function BasicProfileFields({ state, patch }: Props) {
  const height = cmToFeetInches(state.heightCm);
  const pounds = Math.round(kgToLb(state.weightKg) * 10) / 10;
  const valid = validBasicProfile(state);

  function setUnits(unitSystem: UnitSystem) {
    patch({ unitSystem });
  }

  return (
    <div className="mt-6 space-y-3">
      <div>
        <p className="start-label">Units</p>
        <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-[#ECE8E0] p-1">
          <button
            type="button"
            onClick={() => setUnits("imperial")}
            className={`min-h-11 rounded-[12px] text-sm font-semibold ${state.unitSystem === "imperial" ? "bg-white text-[#17483F] shadow-sm" : "text-[#6E7874]"}`}
          >
            Imperial
          </button>
          <button
            type="button"
            onClick={() => setUnits("metric")}
            className={`min-h-11 rounded-[12px] text-sm font-semibold ${state.unitSystem === "metric" ? "bg-white text-[#17483F] shadow-sm" : "text-[#6E7874]"}`}
          >
            Metric
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BasicField label="Age">
          <input
            inputMode="numeric"
            type="number"
            min={13}
            max={100}
            value={state.age}
            onChange={(event) => patch({ age: Number(event.target.value) })}
          />
        </BasicField>
        <BasicField label="Equation used">
          <select value={state.sexEquation} onChange={(event) => patch({ sexEquation: event.target.value as "male" | "female" })}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </BasicField>
      </div>

      {state.unitSystem === "imperial" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <BasicField label="Height — feet">
              <div className="unit-input">
                <input
                  inputMode="numeric"
                  type="number"
                  min={3}
                  max={7}
                  value={height.feet}
                  onChange={(event) => patch({ heightCm: feetInchesToCm(Number(event.target.value), height.inches) })}
                />
                <span>ft</span>
              </div>
            </BasicField>
            <BasicField label="Height — inches">
              <div className="unit-input">
                <input
                  inputMode="numeric"
                  type="number"
                  min={0}
                  max={11}
                  value={height.inches}
                  onChange={(event) => patch({ heightCm: feetInchesToCm(height.feet, Math.max(0, Math.min(11, Number(event.target.value)))) })}
                />
                <span>in</span>
              </div>
            </BasicField>
          </div>
          <BasicField label="Current weight">
            <div className="unit-input">
              <input
                inputMode="decimal"
                type="number"
                min={66}
                max={772}
                step="0.1"
                value={pounds}
                onChange={(event) => patch({ weightKg: lbToKg(Number(event.target.value)) })}
              />
              <span>lb</span>
            </div>
          </BasicField>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <BasicField label="Height">
            <div className="unit-input">
              <input
                inputMode="decimal"
                type="number"
                min={120}
                max={230}
                value={Math.round(state.heightCm * 10) / 10}
                onChange={(event) => patch({ heightCm: Number(event.target.value) })}
              />
              <span>cm</span>
            </div>
          </BasicField>
          <BasicField label="Current weight">
            <div className="unit-input">
              <input
                inputMode="decimal"
                type="number"
                min={30}
                max={350}
                step="0.1"
                value={Math.round(state.weightKg * 10) / 10}
                onChange={(event) => patch({ weightKg: Number(event.target.value) })}
              />
              <span>kg</span>
            </div>
          </BasicField>
        </div>
      )}

      <div className="rounded-[20px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#49655C]">
        We use these only to make the starting estimate more sensible. No body-fat estimate, target photo, or advanced macro setup required.
      </div>

      {!valid && (
        <p className="rounded-2xl bg-[#FBF0E4] px-4 py-3 text-xs leading-5 text-[#8D6137]">
          Check age, height, and weight before continuing so the starting estimate is usable.
        </p>
      )}
    </div>
  );
}

function BasicField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="start-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
