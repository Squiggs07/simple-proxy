"use client";

import { useEffect, useMemo, useState } from "react";
import { alternativeExercises, type WorkoutPlan } from "@/lib/startHerePlan";
import type { AppState, ExerciseLog, WorkoutSetLog } from "@/lib/startHereModels";
import { inputWeightToKg } from "@/lib/startHereUnits";

interface SetDraft {
  weight: string;
  reps: string;
  complete: boolean;
}

interface Props {
  workout: WorkoutPlan;
  state: AppState;
  onClose: () => void;
  onSwap: (exerciseId: string, replacementId: string) => void;
  onFinish: (exercises: ExerciseLog[]) => void;
}

function makeDrafts(workout: WorkoutPlan): Record<string, SetDraft[]> {
  return Object.fromEntries(
    workout.exercises.map((item) => [
      item.exercise.id,
      Array.from({ length: item.sets }, () => ({ weight: "", reps: "", complete: false })),
    ]),
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 4 4L19 6" /></svg>;
}

function SwapIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h13"/><path d="m14 5 3 3-3 3"/><path d="M20 16H7"/><path d="m10 13-3 3 3 3"/></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function ActiveWorkoutExperience({ workout, state, onClose, onSwap, onFinish }: Props) {
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>(() => makeDrafts(workout));
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const totals = useMemo(() => {
    const all = Object.values(drafts).flat();
    return { complete: all.filter((set) => set.complete).length, total: all.length };
  }, [drafts]);

  const selected = swapFor ? workout.exercises.find((item) => item.exercise.id === swapFor) : undefined;
  const alternatives = selected ? alternativeExercises(selected.exercise.id, state) : [];

  function updateSet(exerciseId: string, index: number, patch: Partial<SetDraft>) {
    setDrafts((current) => {
      const rows = [...(current[exerciseId] ?? [])];
      rows[index] = { ...(rows[index] ?? { weight: "", reps: "", complete: false }), ...patch };
      return { ...current, [exerciseId]: rows };
    });
  }

  function toggleComplete(exerciseId: string, index: number) {
    const current = drafts[exerciseId]?.[index];
    const nextComplete = !current?.complete;
    updateSet(exerciseId, index, { complete: nextComplete });
    if (nextComplete) setRestSeconds(90);
  }

  function finish() {
    const exercises: ExerciseLog[] = workout.exercises.map((item) => ({
      exerciseId: item.exercise.id,
      sets: Array.from({ length: item.sets }, (_, index): WorkoutSetLog => {
        const row = drafts[item.exercise.id]?.[index];
        const reps = row?.reps.trim() ? Number(row.reps) : null;
        const weight = row?.weight.trim() ? inputWeightToKg(Number(row.weight), state.unitSystem) : null;
        return {
          reps: Number.isFinite(reps) ? reps : null,
          weight: Number.isFinite(weight) ? weight : null,
          complete: Boolean(row?.complete),
        };
      }),
    }));
    onFinish(exercises);
  }

  const progress = totals.total ? Math.round((totals.complete / totals.total) * 100) : 0;

  return (
    <div className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">
      <div className="start-shell pb-8">
        <div className="sticky top-0 z-30 border-b border-[#E6E0D6] bg-[#F7F4EE]/95 px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="round-button" aria-label="Close workout"><CloseIcon /></button>
            <div className="min-w-0 text-center">
              <p className="text-[10px] font-extrabold tracking-[.14em] text-[#78837E]">ACTIVE WORKOUT</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{workout.name}</p>
            </div>
            <span className="rounded-full bg-[#ECF3EE] px-3 py-2 text-xs font-bold text-[#17483F]">{totals.complete}/{totals.total}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E6E0D6]">
            <div className="h-full rounded-full bg-[#17483F] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {restSeconds > 0 && (
          <div className="sticky top-[88px] z-20 mx-5 mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-[#D9E4DE] bg-[#ECF3EE]/95 px-4 shadow-sm backdrop-blur">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.12em] text-[#6E9084]">REST</p>
              <p className="text-sm font-semibold text-[#17483F]">{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRestSeconds((value) => value + 30)} className="soft-button">+30 sec</button>
              <button onClick={() => setRestSeconds(0)} className="soft-button">Skip</button>
            </div>
          </div>
        )}

        <main className="px-5 py-5">
          <div className="mb-4 rounded-[22px] bg-[#ECF3EE] p-4 text-sm leading-6 text-[#526860]">
            Keep 2–3 good reps in reserve. Log what you actually do; partial completion still counts.
          </div>

          <div className="space-y-3">
            {workout.exercises.map((item, exerciseIndex) => (
              <article key={item.exercise.id} className="active-exercise">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="card-kicker">{exerciseIndex + 1} · {item.exercise.focus.join(" + ")}</p>
                    <h2 className="mt-1 text-lg font-semibold">{item.exercise.name}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#77817D]">{item.exercise.cue}</p>
                    {item.progression && <p className="mt-2 rounded-xl bg-[#ECF3EE] px-3 py-2 text-[11px] leading-5 text-[#526860]"><strong>Adaptive progression:</strong> {item.progression}</p>}
                  </div>
                  <button onClick={() => setSwapFor(item.exercise.id)} className="soft-button"><SwapIcon /> Swap</button>
                </div>

                <div className="mt-4 grid grid-cols-[34px_1fr_64px_64px_42px] gap-2 text-center text-[9px] font-bold uppercase tracking-[.07em] text-[#8A938F]">
                  <span>Set</span><span>Previous</span><span>Wt ({state.unitSystem === "imperial" ? "lb" : "kg"})</span><span>Reps</span><span>Done</span>
                </div>

                {Array.from({ length: item.sets }, (_, index) => {
                  const row = drafts[item.exercise.id]?.[index] ?? { weight: "", reps: "", complete: false };
                  return (
                    <div key={index} className="grid min-h-[56px] grid-cols-[34px_1fr_64px_64px_42px] items-center gap-2 border-t border-[#F0ECE6]">
                      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#F6F4EF] text-[11px] font-extrabold text-[#69736F]">{index + 1}</span>
                      <span className="text-center text-[10px] leading-4 text-[#6E7874]">{item.previous}</span>
                      <input
                        value={row.weight}
                        onChange={(event) => updateSet(item.exercise.id, index, { weight: event.target.value })}
                        inputMode="decimal"
                        aria-label={`${item.exercise.name} set ${index + 1} weight in ${state.unitSystem === "imperial" ? "pounds" : "kilograms"}`}
                        placeholder="—"
                        className="h-10 min-w-0 rounded-xl border border-[#E6E0D6] bg-[#FCFAF6] px-2 text-center text-xs font-semibold outline-none focus:border-[#6E9084]"
                      />
                      <input
                        value={row.reps}
                        onChange={(event) => updateSet(item.exercise.id, index, { reps: event.target.value })}
                        inputMode="numeric"
                        aria-label={`${item.exercise.name} set ${index + 1} reps`}
                        placeholder="10"
                        className="h-10 min-w-0 rounded-xl border border-[#E6E0D6] bg-[#FCFAF6] px-2 text-center text-xs font-semibold outline-none focus:border-[#6E9084]"
                      />
                      <button onClick={() => toggleComplete(item.exercise.id, index)} className={`set-check ${row.complete ? "set-check-done" : ""}`} aria-label={`Mark ${item.exercise.name} set ${index + 1} complete`}>
                        {row.complete && <CheckIcon />}
                      </button>
                    </div>
                  );
                })}
              </article>
            ))}
          </div>

          <button onClick={finish} className="start-primary mt-5 w-full">Finish workout <CheckIcon /></button>
          <p className="mt-3 text-center text-xs leading-5 text-[#858D89]">Finishing saves weights, reps, and the sets you actually completed. An imperfect workout is still useful data.</p>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16221E]/25 px-2 backdrop-blur-[2px]" onMouseDown={() => setSwapFor(null)}>
          <section onMouseDown={(event) => event.stopPropagation()} className="sheet w-full max-w-[430px]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8D5CF]" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold tracking-[-.03em]">Swap {selected.exercise.name}</h2>
              <button onClick={() => setSwapFor(null)} className="round-button" aria-label="Close swap"><CloseIcon /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#68736F]">Same movement role, filtered to your current equipment and exercise dislikes.</p>
            <div className="mt-4 space-y-2">
              {alternatives.map((alt) => (
                <button key={alt.id} onClick={() => { onSwap(selected.exercise.id, alt.id); setSwapFor(null); }} className="swap-option">
                  <span><strong>{alt.name}</strong><small>{alt.focus.join(" + ")} · {alt.stable ? "stable setup" : "free movement"}</small></span>
                  <span aria-hidden>›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
