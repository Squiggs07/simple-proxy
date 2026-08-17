import type { AppState } from "@/lib/startHereModels";
import type { currentTargets } from "@/lib/startHerePlan";

type Targets = ReturnType<typeof currentTargets>;

export function answerGeneralCoachQuestion(raw: string, state: AppState, targets: Targets): string | null {
  const text = raw.trim().toLowerCase();
  const questionLike = /\?|^(what|why|how|when|where|should|can|could|is|are|do|does|will|would)\b/.test(text);
  if (!questionLike) return null;

  if (/protein|amino|muscle protein/.test(text)) {
    return `For building or keeping muscle, the daily total matters more than perfect timing. Your current plan is set to ${targets.proteinGrams}g, with a working range of ${targets.proteinRange[0]}–${targets.proteinRange[1]}g. A practical approach is to spread protein across a few meals you actually like instead of forcing a rigid schedule.`;
  }
  if (/creatine/.test(text)) {
    return "Creatine monohydrate is one of the better-supported performance supplements. A common maintenance approach is about 3–5 g per day; consistency matters more than timing. It can increase scale weight a little from water stored in muscle. If you have kidney disease, are pregnant, or have a clinician-directed diet, check with your clinician before using it.";
  }
  if (/sore|soreness|doms/.test(text)) {
    return "Soreness is not a score for workout quality. You can make progress with little soreness, especially once your body adapts to a routine. I would judge training by repeatable technique, progression over time, recovery, and whether you can come back for the next planned session.";
  }
  if (/rest.*set|between sets|rest time/.test(text)) {
    return "For hard compound sets, 2–3 minutes is a useful default because it lets performance recover. Smaller accessory work can often use 1–2 minutes. If the next set drops off badly, rest longer; the clock is a tool, not a rule.";
  }
  if (/rep range|how many reps|reps for|hypertrophy/.test(text)) {
    return "Muscle can be built across a fairly wide rep range when sets are challenging and technique stays good. For most normal gym work, roughly 6–15 reps is a simple place to live. You do not need every set to reach failure; leaving about 1–3 solid reps in reserve is usually easier to recover from.";
  }
  if (/cardio|running|run.*lift|lift.*run/.test(text)) {
    return "Cardio and lifting can coexist well. If strength or muscle is the priority, keep the hardest cardio away from your hardest lower-body sessions when possible, and avoid turning every cardio day into an all-out effort. Easy aerobic work is usually much easier to recover from than repeated hard intervals.";
  }
  if (/sleep|sleeping|bedtime/.test(text)) {
    return "Sleep affects performance, appetite, recovery, and how hard training feels. For most adults, 7–9 hours is a useful target range, but consistency and sleep quality matter too. If your schedule is messy, a repeatable wake time and a calmer last hour before bed are often higher-value than chasing a perfect supplement routine.";
  }
  if (/pre.?workout|before (?:i )?lift|before training|eat before/.test(text)) {
    return "Before lifting, the goal is mostly to arrive fueled without feeling overly full. A meal with carbs plus some protein 1–3 hours beforehand works well for many people. If you are eating closer to training, smaller and easier-to-digest usually feels better.";
  }
  if (/post.?workout|after (?:i )?lift|after training|eat after/.test(text)) {
    return "You do not have a tiny post-workout window. Getting a normal protein-containing meal within the next few hours is plenty for most people, especially if you ate before training. Daily calories and protein still matter more than racing to a shake.";
  }
  if (/warm.?up|warming up/.test(text)) {
    return "Keep the warm-up specific and short: get generally warm, move the joints you are about to use, then do a few progressively heavier practice sets of the first main lift. You should feel more prepared, not tired before the workout starts.";
  }
  if (/lose fat.*muscle|keep muscle.*cut|cut.*muscle/.test(text)) {
    return "To keep muscle while losing fat, the big levers are a moderate calorie deficit, enough protein, and continuing to train hard enough to give your body a reason to keep the muscle. Very aggressive dieting and dropping strength work entirely make that harder.";
  }
  if (/bulk|gain.*fat|muscle gain/.test(text)) {
    return "A cautious gaining phase uses a small surplus, enough protein, progressive lifting, and a slow weight trend. You cannot guarantee zero fat gain, so the useful control is keeping the rate of gain modest and adjusting from the smoothed trend rather than reacting to single weigh-ins.";
  }
  if (/water|hydration|electrolyte/.test(text)) {
    return "Hydration needs vary with body size, heat, sweat rate, diet, and training. A useful day-to-day check is normal thirst plus reasonably pale urine, then add fluids around long or sweaty sessions. Electrolytes are more useful when sweat losses are meaningful than as something everyone needs all day.";
  }
  if (/pain|injury|hurt|dizzy|dizziness|chest pain|faint|shortness of breath/.test(text)) {
    return "I can help with general training context, but I cannot diagnose pain or concerning symptoms. If something is sharp, worsening, causing instability, chest pain, fainting, unusual shortness of breath, or otherwise feels medically concerning, stop treating it like a normal programming problem and get appropriate medical evaluation.";
  }
  if (/beginner|new to lifting|start lifting/.test(text)) {
    return state.liftingHistory === "none"
      ? "Because you marked yourself as new to lifting, I would prioritize a few repeatable movements, controlled technique, and finishing most sets with 2–3 good reps left. The first goal is learning and consistency; load can build once the movements feel normal."
      : "Even with some lifting history, the best restart is usually simpler than people expect: a few repeatable movements, moderate volume, and enough room to progress without being wrecked for the next session.";
  }

  return "I can answer general fitness and wellness questions, but the full intelligence model is unavailable right now. Ask me about training, nutrition, recovery, sleep, cardio, common supplements, or how to make your current plan fit better, and I’ll give you the most useful answer I can from the built-in guidance.";
}
