"use client";

import { useState, type ReactNode } from "react";
import type { AppState, UnitSystem } from "@/lib/startHereModels";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/startHereUnits";

interface Props {
  state: AppState;
  patch: (update: Partial<AppState>) => void;
  onValidityChange?: (valid: boolean) => void;
}

interface ProfileDrafts {
  age: string;
  feet: string;
  inches: string;
  pounds: string;
  centimeters: string;
  kilograms: string;
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

function validDrafts(drafts: ProfileDrafts, unitSystem: UnitSystem) {
  const age = Number(drafts.age);
  const heightPrimary = Number(unitSystem === "imperial" ? drafts.feet : drafts.centimeters);
  const heightSecondary = Number(drafts.inches);
  const weight = Number(unitSystem === "imperial" ? drafts.pounds : drafts.kilograms);
  const ageValid = drafts.age.trim() !== "" && Number.isInteger(age) && age >= 13 && age <= 100;
  const heightValid = unitSystem === "imperial"
    ? drafts.feet.trim() !== "" && drafts.inches.trim() !== "" && Number.isInteger(heightPrimary) && Number.isInteger(heightSecondary) && heightPrimary >= 3 && heightPrimary <= 7 && heightSecondary >= 0 && heightSecondary <= 11
    : drafts.centimeters.trim() !== "" && Number.isFinite(heightPrimary) && heightPrimary >= 120 && heightPrimary <= 230;
  const weightValid = (unitSystem === "imperial" ? drafts.pounds : drafts.kilograms).trim() !== ""
    && Number.isFinite(weight)
    && weight >= (unitSystem === "imperial" ? 66 : 30)
    && weight <= (unitSystem === "imperial" ? 772 : 350);
  return ageValid && heightValid && weightValid;
}

export function BasicProfileFields({ state, patch, onValidityChange }: Props) {
  const height = cmToFeetInches(state.heightCm);
  const pounds = Math.round(kgToLb(state.weightKg) * 10) / 10;
  const [drafts, setDrafts] = useState<ProfileDrafts>(() => ({
    age: String(state.age),
    feet: String(height.feet),
    inches: String(height.inches),
    pounds: String(pounds),
    centimeters: String(Math.round(state.heightCm * 10) / 10),
    kilograms: String(Math.round(state.weightKg * 10) / 10),
  }));
  const valid = validDrafts(drafts, state.unitSystem);

  function updateDraft(key: keyof ProfileDrafts, value: string) {
    const next = { ...drafts, [key]: value };
    setDrafts(next);
    onValidityChange?.(validDrafts(next, state.unitSystem));
    return next;
  }

  function setUnits(unitSystem: UnitSystem) {
    onValidityChange?.(validBasicProfile(state));
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
            step={1}
            value={drafts.age}
            onChange={(event) => {
              const raw = event.target.value;
              updateDraft("age", raw);
              if (raw.trim() !== "") patch({ age: Number(raw) });
            }}
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
                  step={1}
                  value={drafts.feet}
                  onChange={(event) => {
                    const next = updateDraft("feet", event.target.value);
                    if (next.feet.trim() !== "" && next.inches.trim() !== "") patch({ heightCm: feetInchesToCm(Number(next.feet), Number(next.inches)) });
                  }}
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
                  step={1}
                  value={drafts.inches}
                  onChange={(event) => {
                    const next = updateDraft("inches", event.target.value);
                    if (next.feet.trim() !== "" && next.inches.trim() !== "") patch({ heightCm: feetInchesToCm(Number(next.feet), Math.max(0, Math.min(11, Number(next.inches)))) });
                  }}
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
                value={drafts.pounds}
                onChange={(event) => {
                  const raw = event.target.value;
                  updateDraft("pounds", raw);
                  if (raw.trim() !== "") patch({ weightKg: lbToKg(Number(raw)) });
                }}
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
                step="0.1"
                value={drafts.centimeters}
                onChange={(event) => {
                  const raw = event.target.value;
                  updateDraft("centimeters", raw);
                  if (raw.trim() !== "") patch({ heightCm: Number(raw) });
                }}
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
                value={drafts.kilograms}
                onChange={(event) => {
                  const raw = event.target.value;
                  updateDraft("kilograms", raw);
                  if (raw.trim() !== "") patch({ weightKg: Number(raw) });
                }}
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
