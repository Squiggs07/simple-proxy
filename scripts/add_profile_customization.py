from pathlib import Path

path = Path("src/components/StartHereAppV2.tsx")
text = path.read_text()
start = text.find("function ProfileSheet(")
end = text.find("function SettingRow(", start)
if start < 0 or end < 0:
    raise RuntimeError("ProfileSheet markers not found")

replacement = r'''function ProfileSheet({ state, targets, patch, close, reset }: { state: AppState; targets: ReturnType<typeof currentTargets>; patch: (update: Partial<AppState>) => void; close: () => void; reset: () => void }) {
  return <BottomSheet close={close} title="Your plan settings">
    <div className="grid grid-cols-2 gap-3"><MiniCard label="Goal" value={GOAL_LABELS[state.goal]} /><MiniCard label="Starting target" value={state.hideCalories ? "Calories hidden" : `${targets.calories} cal`} /></div>
    <div className="mt-5 space-y-3">
      <SettingRow title="Units" copy="Change how body weight, height, and gym loads are displayed." control={<select className="mini-select" value={state.unitSystem} onChange={(e) => patch({ unitSystem: e.target.value as AppState["unitSystem"] })}><option value="imperial">Imperial</option><option value="metric">Metric</option></select>} />
      <SettingRow title="Hide calories" copy="Meals and protein stay visible." control={<button onClick={() => patch({ hideCalories: !state.hideCalories })} className={cx("toggle", state.hideCalories && "toggle-on")}><span /></button>} />
      <SettingRow title="Detail level" copy="Change how much information appears on normal screens." control={<select className="mini-select" value={state.detailLevel} onChange={(e) => patch({ detailLevel: e.target.value as AppState["detailLevel"] })}><option value="simple">Simple</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select>} />
      <SettingRow title="Grocery & prep" copy="Keep prep tools available under Eat." control={<button onClick={() => patch({ showPrep: !state.showPrep })} className={cx("toggle", state.showPrep && "toggle-on")}><span /></button>} />
    </div>

    <div className="mt-5 rounded-[22px] border border-[#E6E0D6] bg-[#FCFAF6] p-4">
      <div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[.1em] text-[#7B8581]">TRAINING BASELINE</p><p className="mt-1 text-xs leading-5 text-[#7D8582]">Update this whenever your lifting experience changes. The workout builder uses it to choose starting volume and progression style.</p></div>
      <TrainingBaselineFields state={state} patch={patch} />
    </div>

    <div className="mt-5">
      <FoodPreferenceEditor state={state} patch={patch} />
    </div>

    <div className="mt-5 rounded-[20px] bg-[#FCFAF6] p-4"><p className="text-xs font-bold text-[#68736F]">ESTIMATE DETAILS</p><div className="mt-3 grid grid-cols-2 gap-y-3 text-sm"><span className="text-[#7D8582]">Maintenance</span><strong className="text-right">{targets.maintenanceCalories} cal</strong><span className="text-[#7D8582]">Protein range</span><strong className="text-right">{targets.proteinRange[0]}–{targets.proteinRange[1]}g</strong><span className="text-[#7D8582]">Activity</span><strong className="text-right capitalize">{state.activity}</strong></div></div>
    <button onClick={reset} className="mt-6 w-full rounded-2xl border border-[#E6E0D6] bg-white px-4 py-3 text-sm font-semibold text-[#7A514D]">Restart onboarding</button>
  </BottomSheet>;
}

'''
path.write_text(text[:start] + replacement + text[end:])
