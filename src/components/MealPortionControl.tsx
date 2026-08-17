"use client";

import type { MealPortion } from "@/lib/startHereModels";

interface Props {
  value: MealPortion;
  onChange: (value: MealPortion) => void;
}

const options: Array<{ value: MealPortion; label: string }> = [
  { value: "smaller", label: "Smaller" },
  { value: "standard", label: "Standard" },
  { value: "larger", label: "Larger" },
];

export function MealPortionControl({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#F4F1EB] p-1" aria-label="Meal portion size">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded-[10px] px-2 text-[10px] font-bold transition ${active ? "bg-white text-[#17483F] shadow-sm" : "text-[#7C8581]"}`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
