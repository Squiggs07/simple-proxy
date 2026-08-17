"use client";

import { FormEvent, useState } from "react";
import type { AppState } from "@/lib/startHereModels";

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function FoodPreferenceEditor({
  state,
  patch,
  compact = false,
}: {
  state: AppState;
  patch: (update: Partial<AppState>) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");

  function add(event: FormEvent) {
    event.preventDefault();
    const values = text
      .split(/,|\band\b/i)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!values.length) return;
    patch({ foodRequests: unique([...state.foodRequests, ...values]) });
    setText("");
  }

  function remove(value: string) {
    patch({ foodRequests: state.foodRequests.filter((item) => item !== value) });
  }

  return (
    <div className={compact ? "rounded-[20px] bg-[#FCFAF6] p-4" : "rounded-[20px] border border-[#E6E0D6] bg-white p-4"}>
      <div>
        <p className="text-sm font-semibold">{compact ? "Want something else?" : "Anything specific you want to eat?"}</p>
        <p className="mt-1 text-xs leading-5 text-[#7D8582]">
          {compact
            ? "Type what sounds good. We’ll push matching meals higher without changing your nutrition targets."
            : "Add meals or foods in your own words — tacos, sushi bowls, oatmeal, burgers, whatever you would actually choose."}
        </p>
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={compact ? "e.g. salmon, tacos, pasta" : "e.g. chicken parm, tacos, fruit bowls"}
          className="min-w-0 flex-1 rounded-2xl border border-[#E6E0D6] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#6E9084]"
        />
        <button disabled={!text.trim()} className="rounded-2xl bg-[#17483F] px-4 text-sm font-semibold text-white disabled:opacity-40" type="submit">Add</button>
      </form>
      {state.foodRequests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {state.foodRequests.map((item) => (
            <button key={item} type="button" onClick={() => remove(item)} className="rounded-full bg-[#ECF3EE] px-3 py-2 text-xs font-semibold text-[#49655C]">
              {item} <span className="ml-1 text-[#7A8D86]">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
