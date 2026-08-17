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
    <div className="meal-portion-control" aria-label="Meal portion size">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={value === option.value ? "meal-portion-active" : ""}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
