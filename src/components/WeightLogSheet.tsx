"use client";

import { FormEvent, useState } from "react";
import type { UnitSystem } from "@/lib/startHereModels";
import { inputWeightToKg, kgToInputWeight } from "@/lib/startHereUnits";

interface Props {
  currentKg: number;
  unitSystem: UnitSystem;
  onClose: () => void;
  onSave: (kg: number) => void;
}

export function WeightLogSheet({ currentKg, unitSystem, onClose, onSave }: Props) {
  const initial = kgToInputWeight(currentKg, unitSystem);
  const [value, setValue] = useState(initial.toFixed(1));
  const parsed = Number(value);
  const min = unitSystem === "imperial" ? 55 : 25;
  const max = unitSystem === "imperial" ? 772 : 350;
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;
  const unit = unitSystem === "imperial" ? "lb" : "kg";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    onSave(inputWeightToKg(parsed, unitSystem));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16221E]/25 px-2 backdrop-blur-[2px]" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="sheet w-full max-w-[430px]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8D5CF]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.14em] text-[#6E9084]">NORMAL DATA, NOT A TEST</p>
            <h2 className="mt-1 text-[26px] font-semibold tracking-[-.035em]">Log today’s weight</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736F]">One reading never changes the plan. We use the smoothed trend after enough data.</p>
          </div>
          <button onClick={onClose} className="round-button" aria-label="Close weight entry">×</button>
        </div>

        <form onSubmit={submit} className="mt-6">
          <label className="start-field">
            <span>Weight</span>
            <div className="unit-input">
              <input autoFocus inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Weight in ${unit}`} />
              <span>{unit}</span>
            </div>
          </label>
          {!valid && value.length > 0 && <p className="mt-2 text-xs leading-5 text-[#B47B3F]">Enter a weight between {min} and {max} {unit}.</p>}
          <button disabled={!valid} className="start-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40">Save reading</button>
        </form>
      </section>
    </div>
  );
}
