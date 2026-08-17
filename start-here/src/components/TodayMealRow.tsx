"use client";

import type { PlannedMeal } from "@/lib/startHerePlan";

interface Props {
  item: PlannedMeal;
  eaten: boolean;
  onOpen: () => void;
  onSwap: () => void;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 4 4L19 6" /></svg>;
}

function SwapIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h13"/><path d="m14 5 3 3-3 3"/><path d="M20 16H7"/><path d="m10 13-3 3 3 3"/></svg>;
}

export function TodayMealRow({ item, eaten, onOpen, onSwap }: Props) {
  return (
    <div className="today-meal-row">
      <span className={`status-dot ${eaten ? "status-done" : ""}`}>{eaten && <CheckIcon />}</span>
      <button onClick={onOpen} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left text-[#1D2926]" aria-label={`Open ${item.meal.name}`}>
        <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">{item.meal.name}</strong>
        <small className="mt-0.5 block text-[11px] text-[#7B8581]">{item.protein}g protein · {item.meal.prepMinutes} min</small>
      </button>
      <button onClick={onSwap} className="row-action" aria-label={`Swap ${item.meal.name}`}><SwapIcon /></button>
    </div>
  );
}
