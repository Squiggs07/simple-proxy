from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing replacement target: {label}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, new_block: str, label: str) -> str:
    start_i = text.find(start)
    if start_i < 0:
        raise RuntimeError(f"Missing start marker: {label}")
    end_i = text.find(end, start_i)
    if end_i < 0:
        raise RuntimeError(f"Missing end marker: {label}")
    return text[:start_i] + new_block.rstrip() + "\n\n" + text[end_i:]


# --- Coach deterministic fallback/action layer ---
coach_path = Path("src/lib/startHereCoach.ts")
coach = coach_path.read_text()
coach = replace_once(
    coach,
    'import { buildDayMeals } from "@/lib/startHerePlan";\nimport type { AppState, Equipment } from "@/lib/startHereModels";',
    'import { buildDayMeals, currentTargets } from "@/lib/startHerePlan";\nimport { answerGeneralCoachQuestion } from "@/lib/startHereCoachKnowledge";\nimport type { AppState, Equipment } from "@/lib/startHereModels";',
    "coach imports",
)

meal_commands = r'''
  if (/different meals|new meals|something else to eat|change up (?:my )?meals|rotate (?:my )?meals/.test(text)) {
    return {
      patch: { mealRotation: state.mealRotation + 1, swappedMealIds: {} },
      reply: "Done. I rotated the day toward a different set of high-ranked meals while keeping your targets, hard exclusions, and positive preferences intact.",
      changeSummary: "Meal options refreshed",
    };
  }

  const requestedFood = text.match(/(?:i want|i'd like|id like|give me|add)\s+(.+?)(?:\s+(?:more often|for my meals|to my meals))?(?:\.|$)/i);
  if (requestedFood && /eat|food|meal|pasta|taco|salmon|chicken|turkey|steak|rice|bowl|wrap|sandwich|smoothie|oat|yogurt|egg|burger|shrimp|fish|potato/.test(text)) {
    const values = requestedFood[1]
      .replace(/\b(?:to eat|for dinner|for lunch|for breakfast)\b/gi, "")
      .split(/,|\band\b/i)
      .map((item) => titleCase(item.replace(/\b(?:more|often|please)\b/gi, "").trim()))
      .filter((item) => item.length > 1 && item.length < 60);
    if (values.length) {
      return {
        patch: { foodRequests: unique([...state.foodRequests, ...values]), mealRotation: state.mealRotation + 1 },
        reply: `Added ${values.join(" + ")} to what you actively want to eat. Matching meals now get the strongest ranking boost, and I rotated the day so you can see a different set immediately.`,
        changeSummary: `Food direction → ${values.join(" + ")}`,
      };
    }
  }
'''
coach = replace_once(
    coach,
    '  const loveFood = text.match(/(?:i love|i like|i want more|give me more)\\s+([a-z][a-z\\s-]{2,30})(?:\\.|$)/i);',
    meal_commands + '\n  const loveFood = text.match(/(?:i love|i like|i want more|give me more)\\s+([a-z][a-z\\s-]{2,30})(?:\\.|$)/i);',
    "meal customization commands",
)

fallback = r'''
  const generalAnswer = answerGeneralCoachQuestion(raw, state, currentTargets(state));
  if (generalAnswer) {
    return { patch: {}, reply: generalAnswer };
  }

'''
coach = replace_once(
    coach,
    '  return {\n    patch: {},\n    reply: permanent || todayOnly',
    fallback + '  return {\n    patch: {},\n    reply: permanent || todayOnly',
    "general coach fallback",
)
coach_path.write_text(coach)


# --- Main product UI ---
main_path = Path("src/components/StartHereAppV2.tsx")
main = main_path.read_text()
main = replace_once(
    main,
    'import { ActiveWorkoutExperience } from "@/components/ActiveWorkoutExperience";\nimport { BasicProfileFields, validBasicProfile } from "@/components/BasicProfileFields";',
    'import { ActiveWorkoutExperience } from "@/components/ActiveWorkoutExperience";\nimport { BasicProfileFields, validBasicProfile } from "@/components/BasicProfileFields";\nimport { FoodPreferenceEditor } from "@/components/FoodPreferenceEditor";\nimport { TrainingBaselineFields } from "@/components/TrainingBaselineFields";',
    "main component imports",
)
main = replace_once(
    main,
    'import { canonicalizeCoachRequest } from "@/lib/startHereCoachClient";',
    'import { askCoach } from "@/lib/startHereCoachClient";',
    "coach client import",
)
main = replace_once(
    main,
    '  currentTargets,\n  rankMeals,',
    '  currentTargets,\n  mealFamilyKey,\n  rankMeals,',
    "meal family import",
)
main = main.replace('  type Experience,\n', '')
main = replace_once(
    main,
    'const saved = localStorage.getItem("start-here-state-v5") ?? localStorage.getItem("start-here-state-v4") ?? localStorage.getItem("start-here-state-v3");',
    'const saved = localStorage.getItem("start-here-state-v6") ?? localStorage.getItem("start-here-state-v5") ?? localStorage.getItem("start-here-state-v4") ?? localStorage.getItem("start-here-state-v3");',
    "v6 hydration",
)
main = replace_once(
    main,
    'if (ready) localStorage.setItem("start-here-state-v5", JSON.stringify(state));',
    'if (ready) localStorage.setItem("start-here-state-v6", JSON.stringify(state));',
    "v6 persistence",
)

handle_coach = r'''  async function handleCoach(event: FormEvent) {
    event.preventDefault();
    const raw = coachText.trim();
    if (!raw || coachBusy) return;

    const snapshot = state;
    const now = new Date().toISOString();
    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, text: raw, createdAt: now };
    setCoachText("");
    setCoachBusy(true);
    setState((current) => ({ ...current, coachHistory: [...current.coachHistory, userMessage] }));

    try {
      const ai = await askCoach(raw, snapshot, targets);
      const command = ai.canonicalCommand?.trim() || raw;
      const result = interpretCoachRequest(command, snapshot);
      const changed = Object.keys(result.patch).length > 0;
      if (changed) setUndoSnapshot(snapshot);

      let reply = result.reply;
      if (ai.available && ai.answer) {
        if (changed) reply = `${ai.answer}\n\n${result.reply}`;
        else if (result.clarification === "safety") reply = `${ai.answer}\n\n${result.reply}`;
        else reply = ai.answer;
      }

      const coachMessage = {
        id: `coach-${Date.now() + 1}`,
        role: "coach" as const,
        text: reply,
        changeSummary: result.changeSummary,
        createdAt: new Date().toISOString(),
      };
      setState((current) => ({ ...current, ...result.patch, coachHistory: [...current.coachHistory, coachMessage] }));
    } catch {
      const fallback = interpretCoachRequest(raw, snapshot);
      const changed = Object.keys(fallback.patch).length > 0;
      if (changed) setUndoSnapshot(snapshot);
      const coachMessage = {
        id: `coach-${Date.now() + 1}`,
        role: "coach" as const,
        text: fallback.reply,
        changeSummary: fallback.changeSummary,
        createdAt: new Date().toISOString(),
      };
      setState((current) => ({ ...current, ...fallback.patch, coachHistory: [...current.coachHistory, coachMessage] }));
    } finally {
      setCoachBusy(false);
    }
  }'''
main = replace_between(main, '  async function handleCoach(event: FormEvent) {', '  function undoCoach()', handle_coach, "handle coach")

main = replace_once(
    main,
    '              <div className="grid grid-cols-2 gap-3">\n                <Field label="Experience"><select value={state.experience} onChange={(e) => patch({ experience: e.target.value as Experience })}><option value="new">New</option><option value="some">Some experience</option><option value="experienced">Experienced</option></select></Field>\n                <Field label="Confidence"><select value={state.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}><option value="nervous">Nervous</option><option value="unsure">Unsure</option><option value="comfortable">Comfortable</option></select></Field>\n              </div>',
    '              <TrainingBaselineFields state={state} patch={patch} />\n              <Field label="How confident do you feel starting?"><select value={state.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}><option value="nervous">Nervous — keep it very simple</option><option value="unsure">Unsure</option><option value="comfortable">Comfortable</option></select></Field>',
    "lifting baseline onboarding",
)
main = replace_once(
    main,
    '            <div className="mt-5 flex flex-wrap gap-2.5">{foodChoices.map((food) => <button key={food} onClick={() => toggleArray("likedFoods", food)} className={cx("food-chip", state.likedFoods.includes(food) && "food-chip-active")}>{state.likedFoods.includes(food) && <Icon name="check" size={14} />}{food}</button>)}</div>\n            <InfoCard className="mt-5"><strong>Meals start here.</strong><br />We rank food you want first, then make the portions work — not the other way around.</InfoCard>',
    '            <div className="mt-5 flex flex-wrap gap-2.5">{foodChoices.map((food) => <button key={food} onClick={() => toggleArray("likedFoods", food)} className={cx("food-chip", state.likedFoods.includes(food) && "food-chip-active")}>{state.likedFoods.includes(food) && <Icon name="check" size={14} />}{food}</button>)}</div>\n            <div className="mt-4"><FoodPreferenceEditor state={state} patch={patch} /></div>\n            <InfoCard className="mt-4"><strong>Meals start here.</strong><br />We rank what you specifically ask for first, then your broader likes, then make the portions work.</InfoCard>',
    "free form food onboarding",
)
main = replace_once(
    main,
    '<EatView state={state} targets={targets} meals={dayMeals} onMeal={(id) => setSelectedMealId(id)} onSwap={(id) => setSwapMealId(id)} toggleEaten={toggleMealEaten} updatePortion={updateMealPortion} rejectMeal={rejectMeal} showPrep={showPrep || state.showPrep} setShowPrep={setShowPrep} />',
    '<EatView state={state} targets={targets} meals={dayMeals} patch={patch} onMeal={(id) => setSelectedMealId(id)} onSwap={(id) => setSwapMealId(id)} toggleEaten={toggleMealEaten} updatePortion={updateMealPortion} rejectMeal={rejectMeal} showPrep={showPrep || state.showPrep} setShowPrep={setShowPrep} />',
    "EatView patch prop",
)
main = replace_once(
    main,
    '<MealSwap source={swapSource} state={state} ranked={rankedMeals.map((item) => item.meal)} close={() => setSwapMealId(null)} choose={(replacement) => swapMeal(swapMealId, replacement)} />',
    '<MealSwap source={swapSource} state={state} ranked={rankedMeals.map((item) => item.meal)} excludeIds={dayMeals.map((item) => item.meal.id)} close={() => setSwapMealId(null)} choose={(replacement) => swapMeal(swapMealId, replacement)} />',
    "MealSwap exclusions",
)
main = main.replace(
    'localStorage.removeItem("start-here-state-v5"); localStorage.removeItem("start-here-state-v4");',
    'localStorage.removeItem("start-here-state-v6"); localStorage.removeItem("start-here-state-v5"); localStorage.removeItem("start-here-state-v4");',
)

new_eat = r'''function EatView({ state, targets, meals, patch, onMeal, onSwap, toggleEaten, updatePortion, rejectMeal, showPrep, setShowPrep }: { state: AppState; targets: ReturnType<typeof currentTargets>; meals: PlannedMeal[]; patch: (update: Partial<AppState>) => void; onMeal: (id: string) => void; onSwap: (id: string) => void; toggleEaten: (id: string) => void; updatePortion: (sourceMealId: string, portion: MealPortion) => void; rejectMeal: (mealId: string) => void; showPrep: boolean; setShowPrep: (value: boolean) => void }) {
  const logged = meals.filter((item) => state.eatenMealIds.includes(item.meal.id));
  const caloriesLogged = logged.reduce((sum, item) => sum + item.calories, 0);
  const proteinLogged = logged.reduce((sum, item) => sum + item.protein, 0);
  const refreshMeals = () => patch({ mealRotation: state.mealRotation + 1, swappedMealIds: {} });
  return <div>
    <PageHeader eyebrow="EAT" title="Food you’d actually choose." copy="Ask for specific foods, rotate the day, or swap one meal. Your targets shape portions — they do not lock you into a menu." />
    <section className="nutrition-banner"><div><p className="card-kicker !text-white/55">TODAY</p><p className="mt-2 text-[27px] font-semibold tracking-[-.03em]">{state.hideCalories ? "Calories hidden" : `${caloriesLogged} / ${targets.calories.toLocaleString()}`}</p><p className="mt-1 text-xs text-white/55">{state.hideCalories ? "Focus on meals + protein" : "calories logged"}</p></div><div className="text-right"><p className="text-[27px] font-semibold">{proteinLogged}g</p><p className="mt-1 text-xs text-white/55">of {targets.proteinGrams}g protein</p></div></section>

    <section className="dashboard-card mt-3">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">Make the food feel more like you.</p><p className="mt-1 text-xs leading-5 text-[#7D8582]">You are not stuck with the first generated day.</p></div><button onClick={refreshMeals} className="soft-button"><Icon name="swap" size={14} /> Different meals</button></div>
      <div className="mt-3"><FoodPreferenceEditor state={state} patch={patch} compact /></div>
    </section>

    <div className="mt-5 flex items-center justify-between"><p className="section-label">YOUR DAY</p><button onClick={() => setShowPrep(!showPrep)} className="soft-button"><Icon name="grocery" size={15} /> Prep</button></div>
    <div className="mt-3 space-y-3">{meals.map((item, index) => <article key={`${item.slot}-${item.meal.id}`} className="meal-card"><button onClick={() => onMeal(item.meal.id)} className={cx("meal-art", index % 4 === 0 ? "meal-butter" : index % 4 === 1 ? "meal-peach" : index % 4 === 2 ? "meal-blue" : "meal-sage")} aria-label={`Open ${item.meal.name}`}>{item.meal.type.charAt(0)}</button><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#89918E]">{item.slot}</p><span className="portion-pill">{item.portion}</span></div><button onClick={() => onMeal(item.meal.id)} className="mt-1 block text-left font-semibold leading-5">{item.meal.name}</button><p className="mt-1 text-[13px] text-[#68736F]">{item.protein}g protein · {item.meal.prepMinutes} min{state.hideCalories ? "" : ` · ${item.calories} cal`}</p><p className="mt-2 text-xs leading-5 text-[#7D8682]">{item.meal.why}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => toggleEaten(item.meal.id)} className={cx("tiny-button", state.eatenMealIds.includes(item.meal.id) && "tiny-active")}><Icon name="check" size={13} />{state.eatenMealIds.includes(item.meal.id) ? "Logged" : "I ate this"}</button><button onClick={() => onSwap(item.sourceMealId)} className="tiny-button"><Icon name="swap" size={13} />Swap</button><button onClick={() => rejectMeal(item.meal.id)} className="tiny-button">Not for me</button></div><div className="mt-3"><MealPortionControl value={item.portion} onChange={(portion) => updatePortion(item.sourceMealId, portion)} /></div></div></article>)}</div>

    {showPrep && <PrepCard meals={meals} />}
  </div>;
}'''
main = replace_between(main, 'function EatView(', 'function PrepCard(', new_eat, "EatView")

new_coach_view = r'''function CoachView({ state, targets, coachText, setCoachText, submit, busy, canUndo, undo }: { state: AppState; targets: ReturnType<typeof currentTargets>; coachText: string; setCoachText: (value: string) => void; submit: (event: FormEvent) => void | Promise<void>; busy: boolean; canUndo: boolean; undo: () => void }) {
  const suggestions = ["What should I eat before lifting?", "How many reps should I leave in reserve?", "I only have 20 minutes today", "Give me different meals"];
  return <div>
    <PageHeader eyebrow="COACH" title="Ask anything. Change what you need." copy="Training, food, recovery, sleep, habits, common supplements — or tell Coach to change the actual plan." action={canUndo ? <button onClick={undo} className="soft-button"><Icon name="undo" size={14} /> Undo</button> : undefined} />
    <div className="context-strip"><span><strong>{GOAL_LABELS[state.goal]}</strong><small>goal</small></span><span><strong>{targets.proteinGrams}g</strong><small>protein</small></span><span><strong>{state.trainingDays} × {state.sessionMinutes}</strong><small>training</small></span></div>
    <div className="mt-5 space-y-3">{state.coachHistory.slice(-10).map((message) => <div key={message.id} className={cx("coach-message", message.role === "user" ? "coach-user" : "coach-assistant")}><div className="flex items-start gap-2.5">{message.role === "coach" && <span className="coach-mark"><Icon name="spark" size={14} /></span>}<div className="min-w-0 flex-1"><p className="whitespace-pre-line">{message.text}</p>{message.changeSummary && <div className="change-summary"><Icon name="check" size={14} /><span>{message.changeSummary}</span></div>}</div></div></div>)}{busy && <div className="coach-message coach-assistant"><div className="flex items-center gap-2.5"><span className="coach-mark"><Icon name="spark" size={14} /></span><p className="text-[#68736F]">Thinking through your question and your current plan…</p></div></div>}</div>
    <div className="mt-4 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} disabled={busy} onClick={() => setCoachText(suggestion)} className="suggestion-chip disabled:opacity-45">{suggestion}</button>)}</div>
    <form onSubmit={submit} className="coach-composer"><textarea disabled={busy} rows={4} value={coachText} onChange={(e) => setCoachText(e.target.value)} placeholder="Ask a fitness or wellness question, or tell me what you want changed..." /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] leading-4 text-[#8B938F]">Coach can answer broadly. Any plan change still passes through deterministic nutrition and safety guardrails.</p><button disabled={busy || !coachText.trim()} className="send-button shrink-0 disabled:cursor-not-allowed disabled:opacity-40" type="submit" aria-label="Send"><Icon name="arrow" size={18} /></button></div></form>
  </div>;
}'''
main = replace_between(main, 'function CoachView(', 'function MealDetail(', new_coach_view, "CoachView")

new_meal_swap = r'''function MealSwap({ source, state, ranked, excludeIds, close, choose }: { source: Meal; state: AppState; ranked: Meal[]; excludeIds: string[]; close: () => void; choose: (meal: Meal) => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const eligible = ranked.filter((meal) => meal.id !== source.id && !excludeIds.includes(meal.id));
  const searched = normalized
    ? eligible.filter((meal) => [meal.name, meal.cuisine, meal.format, ...meal.preferenceTags, ...meal.searchTags].join(" ").toLowerCase().includes(normalized))
    : eligible.filter((meal) => meal.type === source.type || meal.format === source.format);

  const seenNames = new Set<string>();
  const seenFamilies = new Set<string>();
  const distinct = searched.filter((meal) => {
    const name = meal.name.trim().toLowerCase();
    const family = mealFamilyKey(meal);
    if (seenNames.has(name) || (!normalized && seenFamilies.has(family))) return false;
    seenNames.add(name);
    seenFamilies.add(family);
    return true;
  });
  const fallback = searched.filter((meal, index, array) => array.findIndex((candidate) => candidate.name.trim().toLowerCase() === meal.name.trim().toLowerCase()) === index);
  const options = (distinct.length ? distinct : fallback).slice(0, 6);

  return <BottomSheet close={close} title={`Swap ${source.type.toLowerCase()}`}><p className="text-sm leading-6 text-[#68736F]">Search for what sounds better or choose a different option. Meals already in today’s plan are removed so you do not see duplicates.</p><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: salmon, tacos, pasta, bowl..." className="mt-3 w-full rounded-2xl border border-[#E6E0D6] bg-white px-4 py-3 text-sm outline-none focus:border-[#6E9084]" /><div className="mt-4 space-y-2.5">{options.map((meal) => { const macro = mealMacros(meal); return <button key={meal.id} onClick={() => choose(meal)} className="swap-option"><span><strong>{meal.name}</strong><small>{macro.protein}g protein · {meal.prepMinutes} min{state.hideCalories ? "" : ` · ${macro.calories} cal`}</small></span><Icon name="chevron" size={17} /></button>; })}{options.length === 0 && <InfoCard>{normalized ? "No audited meal in the current library matches that yet. Add it under ‘Want something else?’ and Coach can help find the closest direction." : "No non-duplicate replacement is available with the current hard exclusions. Try a search or tell Coach what you want instead."}</InfoCard>}</div></BottomSheet>;
}'''
main = replace_between(main, 'function MealSwap(', 'function ProfileSheet(', new_meal_swap, "MealSwap")
main_path.write_text(main)

print("Applied Start Here feedback pass")
