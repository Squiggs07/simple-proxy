"use client";

import { FormEvent, useState } from "react";

interface Props {
  currentKg: number;
  onClose: () => void;
  onSave: (kg: number) => void;
}

export function WeightLogSheet({ currentKg, onClose, onSave }: Props) {
  const [value, setValue] = useState(currentKg.toFixed(1));
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 25 && parsed <= 350;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    onSave(Math.round(parsed * 10) / 10);
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
              <input autoFocus inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} aria-label="Weight in kilograms" />
              <span>kg</span>
            </div>
          </label>
          {!valid && value.length > 0 && <p className="mt-2 text-xs leading-5 text-[#B47B3F]">Enter a weight between 25 and 350 kg.</p>}
          <button disabled={!valid} className="start-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40">Save reading</button>
        </form>
      </section>
    </div>
  );
}
