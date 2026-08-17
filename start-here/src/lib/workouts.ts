export type TrainingEquipment = "gym" | "dumbbells" | "home" | "mixed" | "unsure";
export type TrainingExperience = "beginner" | "returning" | "comfortable" | "experienced";

export interface TrainingPreferences {
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: TrainingEquipment;
  experience: TrainingExperience;
  age?: number;
  confidence?: string;
  dislikedExercises?: string[];
  focus?: string[];
}

export interface PlannedExercise {
  id: string;
  name: string;
  cue: string;
  sets: number;
  repRange: string;
  equipment: string;
  movement: "squat" | "hinge" | "push" | "pull" | "carry" | "core" | "balance";
  muscles: string[];
}

export interface PlannedWorkout {
  id: string;
  name: string;
  purpose: string;
  minutes: number;
  exercises: PlannedExercise[];
}

const exercises: PlannedExercise[] = [
  { id: "leg-press", name: "Leg press", cue: "Push the platform away while keeping your whole foot planted.", sets: 3, repRange: "8–12", equipment: "gym", movement: "squat", muscles: ["legs", "glutes"] },
  { id: "goblet-squat", name: "Goblet squat", cue: "Hold one dumbbell close and sit down between your hips.", sets: 3, repRange: "8–12", equipment: "dumbbells", movement: "squat", muscles: ["legs", "glutes"] },
  { id: "chair-squat", name: "Chair squat", cue: "Sit back to a chair, touch lightly, then stand tall.", sets: 2, repRange: "8–12", equipment: "home", movement: "squat", muscles: ["legs", "glutes"] },
  { id: "rdl", name: "Romanian deadlift", cue: "Push your hips back while keeping the weight close to your legs.", sets: 3, repRange: "8–12", equipment: "dumbbells", movement: "hinge", muscles: ["hamstrings", "glutes"] },
  { id: "machine-hinge", name: "Back extension", cue: "Move through your hips and stop when your body is in a straight line.", sets: 3, repRange: "10–15", equipment: "gym", movement: "hinge", muscles: ["hamstrings", "glutes", "back"] },
  { id: "glute-bridge", name: "Glute bridge", cue: "Press through your feet and gently lift your hips.", sets: 2, repRange: "10–15", equipment: "home", movement: "hinge", muscles: ["glutes", "hamstrings"] },
  { id: "chest-press", name: "Chest press", cue: "Press forward without shrugging your shoulders.", sets: 3, repRange: "8–12", equipment: "gym", movement: "push", muscles: ["chest", "triceps"] },
  { id: "db-bench", name: "Dumbbell bench press", cue: "Press the dumbbells up while keeping your upper back supported.", sets: 3, repRange: "8–12", equipment: "dumbbells", movement: "push", muscles: ["chest", "triceps"] },
  { id: "incline-pushup", name: "Incline push-up", cue: "Keep your body long and lower toward a stable counter or bench.", sets: 2, repRange: "6–12", equipment: "home", movement: "push", muscles: ["chest", "triceps"] },
  { id: "seated-row", name: "Seated row", cue: "Pull toward your ribs and keep your chest tall.", sets: 3, repRange: "8–12", equipment: "gym", movement: "pull", muscles: ["back", "biceps"] },
  { id: "db-row", name: "Supported dumbbell row", cue: "Brace one hand and pull the dumbbell toward your hip.", sets: 3, repRange: "8–12", equipment: "dumbbells", movement: "pull", muscles: ["back", "biceps"] },
  { id: "band-row", name: "Band row", cue: "Pull the band toward your ribs without leaning backward.", sets: 2, repRange: "10–15", equipment: "home", movement: "pull", muscles: ["back", "biceps"] },
  { id: "lat-pulldown", name: "Lat pulldown", cue: "Pull the bar toward your upper chest while keeping your ribs relaxed.", sets: 3, repRange: "8–12", equipment: "gym", movement: "pull", muscles: ["back", "biceps"] },
  { id: "shoulder-press", name: "Machine shoulder press", cue: "Press overhead without forcing your shoulders upward.", sets: 2, repRange: "8–12", equipment: "gym", movement: "push", muscles: ["shoulders", "triceps"] },
  { id: "db-shoulder", name: "Seated dumbbell press", cue: "Press overhead from a supported seated position.", sets: 2, repRange: "8–12", equipment: "dumbbells", movement: "push", muscles: ["shoulders", "triceps"] },
  { id: "dead-bug", name: "Dead bug", cue: "Keep your lower back gently supported while moving opposite arm and leg.", sets: 2, repRange: "6–10 / side", equipment: "home", movement: "core", muscles: ["core"] },
  { id: "pallof", name: "Pallof press", cue: "Press your hands away and resist turning your body.", sets: 2, repRange: "8–12 / side", equipment: "gym", movement: "core", muscles: ["core"] },
  { id: "carry", name: "Farmer carry", cue: "Walk tall with the weights at your sides and take steady steps.", sets: 2, repRange: "30–45 sec", equipment: "dumbbells", movement: "carry", muscles: ["grip", "core"] },
  { id: "balance", name: "Supported balance hold", cue: "Stand near something sturdy and practice balancing with support available.", sets: 2, repRange: "20–30 sec / side", equipment: "home", movement: "balance", muscles: ["balance"] },
];

function equipmentMatches(item: PlannedExercise, equipment: TrainingEquipment) {
  if (equipment === "mixed" || equipment === "unsure") return true;
  if (equipment === "gym") return item.equipment === "gym" || item.equipment === "dumbbells" || item.equipment === "home";
  if (equipment === "dumbbells") return item.equipment === "dumbbells" || item.equipment === "home";
  return item.equipment === "home";
}

function scoreExercise(item: PlannedExercise, prefs: TrainingPreferences) {
  let score = 0;
  const dislikes = (prefs.dislikedExercises ?? []).map((value) => value.toLowerCase());
  if (dislikes.some((value) => item.name.toLowerCase().includes(value))) return -100;
  if (prefs.focus?.some((focus) => item.muscles.some((muscle) => muscle.includes(focus.toLowerCase())))) score += 4;
  if (prefs.experience === "beginner" && ["leg-press", "chest-press", "seated-row", "chair-squat", "incline-pushup"].includes(item.id)) score += 3;
  if ((prefs.age ?? 0) >= 60 && ["leg-press", "chest-press", "seated-row", "chair-squat", "balance"].includes(item.id)) score += 4;
  if (prefs.confidence === "nervous" && ["leg-press", "chest-press", "seated-row", "chair-squat"].includes(item.id)) score += 3;
  return score;
}

function choose(movement: PlannedExercise["movement"], prefs: TrainingPreferences, used: Set<string>) {
  return exercises
    .filter((item) => item.movement === movement && equipmentMatches(item, prefs.equipment) && !used.has(item.id))
    .sort((a, b) => scoreExercise(b, prefs) - scoreExercise(a, prefs))[0];
}

function makeDay(index: number, prefs: TrainingPreferences): PlannedWorkout {
  const used = new Set<string>();
  const order: PlannedExercise["movement"][] = index % 2 === 0
    ? ["squat", "push", "pull", "hinge", "core"]
    : ["hinge", "pull", "push", "squat", "core"];
  const maxExercises = prefs.sessionMinutes <= 20 ? 3 : prefs.sessionMinutes <= 35 ? 4 : 5;
  const selected: PlannedExercise[] = [];

  for (const movement of order) {
    if (selected.length >= maxExercises) break;
    const item = choose(movement, prefs, used);
    if (item) {
      used.add(item.id);
      selected.push({ ...item, sets: prefs.sessionMinutes <= 20 ? Math.min(2, item.sets) : item.sets });
    }
  }

  if ((prefs.age ?? 0) >= 60 && selected.length < maxExercises + 1) {
    const balance = choose("balance", prefs, used);
    if (balance) selected.push(balance);
  }

  return {
    id: `day-${index + 1}`,
    name: prefs.daysPerWeek <= 3 ? `Full Body ${String.fromCharCode(65 + index)}` : index % 2 === 0 ? "Upper + lower" : "Lower + upper",
    purpose: "Build strength with repeatable movements and enough work to progress without making the session complicated.",
    minutes: prefs.sessionMinutes,
    exercises: selected,
  };
}

export function buildWorkoutProgram(prefs: TrainingPreferences): PlannedWorkout[] {
  const days = Math.max(1, Math.min(6, Math.round(prefs.daysPerWeek)));
  return Array.from({ length: days }, (_, index) => makeDay(index, prefs));
}

export function makeTodayOverride(program: PlannedWorkout[], minutes: number): PlannedWorkout | null {
  const first = program[0];
  if (!first) return null;
  const maxExercises = minutes <= 20 ? 3 : minutes <= 35 ? 4 : first.exercises.length;
  return {
    ...first,
    id: `${first.id}-today-${minutes}`,
    name: `${first.name} · shorter today`,
    minutes,
    exercises: first.exercises.slice(0, maxExercises).map((exercise) => ({
      ...exercise,
      sets: minutes <= 20 ? Math.min(2, exercise.sets) : exercise.sets,
    })),
  };
}
