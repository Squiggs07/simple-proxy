import type { Equipment } from "@/lib/startHereModels";

export interface MealIngredient {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  tags: string[];
}

export interface Meal {
  id: string;
  name: string;
  type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  cuisine: string;
  format: string;
  prepMinutes: number;
  cost: "low" | "medium" | "high";
  ingredients: MealIngredient[];
  preferenceTags: string[];
  searchTags: string[];
  why: string;
}

export interface Exercise {
  id: string;
  name: string;
  pattern: "squat" | "hinge" | "push" | "pull" | "single-leg" | "core" | "carry" | "balance";
  equipment: Equipment[];
  beginnerFriendly: boolean;
  stable: boolean;
  focus: string[];
  cue: string;
  alternativeIds: string[];
}

export const MEALS: Meal[] = [
  {
    id: "egg-avocado-toast",
    name: "Egg & avocado toast plate",
    type: "Breakfast",
    cuisine: "American",
    format: "Plates",
    prepMinutes: 12,
    cost: "medium",
    preferenceTags: ["Eggs", "Breakfast foods", "Savory breakfast"],
    searchTags: ["eggs", "avocado", "toast", "breakfast"],
    why: "A familiar savory breakfast with enough protein to start the day well.",
    ingredients: [
      { name: "Eggs", amount: "3 large", calories: 210, protein: 18, tags: ["eggs"] },
      { name: "Whole grain toast", amount: "2 slices", calories: 180, protein: 8, tags: ["bread", "toast"] },
      { name: "Avocado", amount: "1/2 medium", calories: 120, protein: 2, tags: ["avocado"] },
      { name: "Low-fat cottage cheese", amount: "1/2 cup", calories: 90, protein: 13, tags: ["dairy", "cottage cheese"] },
    ],
  },
  {
    id: "greek-yogurt-crunch",
    name: "Greek yogurt crunch bowl",
    type: "Breakfast",
    cuisine: "American",
    format: "Bowls",
    prepMinutes: 5,
    cost: "low",
    preferenceTags: ["Greek yogurt", "Breakfast foods", "Bowls"],
    searchTags: ["greek yogurt", "berries", "granola", "breakfast"],
    why: "Five-minute breakfast for mornings when cooking is not happening.",
    ingredients: [
      { name: "Nonfat Greek yogurt", amount: "1.5 cups", calories: 190, protein: 34, tags: ["dairy", "greek yogurt"] },
      { name: "Berries", amount: "1 cup", calories: 70, protein: 1, tags: ["fruit", "berries"] },
      { name: "Granola", amount: "1/3 cup", calories: 170, protein: 4, tags: ["granola", "oats"] },
    ],
  },
  {
    id: "protein-oats",
    name: "Banana protein oats",
    type: "Breakfast",
    cuisine: "American",
    format: "Bowls",
    prepMinutes: 8,
    cost: "low",
    preferenceTags: ["Breakfast foods", "Bowls", "Smoothies"],
    searchTags: ["oats", "banana", "protein", "breakfast"],
    why: "Warm, inexpensive, and easy to scale up or down with appetite.",
    ingredients: [
      { name: "Oats", amount: "1/2 cup dry", calories: 150, protein: 5, tags: ["oats"] },
      { name: "Whey protein", amount: "1 scoop", calories: 130, protein: 25, tags: ["protein powder"] },
      { name: "Banana", amount: "1 medium", calories: 105, protein: 1, tags: ["banana", "fruit"] },
      { name: "Skim milk", amount: "1 cup", calories: 90, protein: 9, tags: ["dairy", "milk"] },
    ],
  },
  {
    id: "chicken-rice-bowl",
    name: "Chicken rice bowl",
    type: "Lunch",
    cuisine: "American",
    format: "Bowls",
    prepMinutes: 18,
    cost: "low",
    preferenceTags: ["Chicken", "Rice bowls", "Bowls"],
    searchTags: ["chicken", "rice", "bowl", "vegetables"],
    why: "High protein, familiar ingredients, and simple to batch prep.",
    ingredients: [
      { name: "Grilled chicken breast", amount: "6 oz", calories: 280, protein: 52, tags: ["chicken"] },
      { name: "Cooked jasmine rice", amount: "1 cup", calories: 205, protein: 4, tags: ["rice"] },
      { name: "Fajita vegetables", amount: "1.5 cups", calories: 90, protein: 3, tags: ["vegetables", "peppers", "onion"] },
      { name: "Salsa", amount: "1/4 cup", calories: 25, protein: 1, tags: ["salsa", "tomato"] },
    ],
  },
  {
    id: "turkey-rice-bowl",
    name: "Turkey rice bowl",
    type: "Lunch",
    cuisine: "American",
    format: "Bowls",
    prepMinutes: 18,
    cost: "low",
    preferenceTags: ["Turkey", "Rice bowls", "Bowls"],
    searchTags: ["turkey", "rice", "bowl", "vegetables"],
    why: "A direct chicken-bowl alternative with the same easy meal structure.",
    ingredients: [
      { name: "Lean ground turkey", amount: "6 oz cooked", calories: 300, protein: 42, tags: ["turkey"] },
      { name: "Cooked jasmine rice", amount: "1 cup", calories: 205, protein: 4, tags: ["rice"] },
      { name: "Fajita vegetables", amount: "1.5 cups", calories: 90, protein: 3, tags: ["vegetables", "peppers", "onion"] },
      { name: "Salsa", amount: "1/4 cup", calories: 25, protein: 1, tags: ["salsa", "tomato"] },
    ],
  },
  {
    id: "chicken-caesar-wrap",
    name: "Chicken Caesar wrap",
    type: "Lunch",
    cuisine: "American",
    format: "Wraps",
    prepMinutes: 10,
    cost: "medium",
    preferenceTags: ["Chicken", "Wraps", "Sandwiches"],
    searchTags: ["chicken", "wrap", "lettuce", "caesar"],
    why: "Fast enough for a workday and still protein-forward.",
    ingredients: [
      { name: "Grilled chicken breast", amount: "5 oz", calories: 235, protein: 44, tags: ["chicken"] },
      { name: "Large flour tortilla", amount: "1", calories: 210, protein: 6, tags: ["wrap", "tortilla"] },
      { name: "Romaine", amount: "2 cups", calories: 20, protein: 1, tags: ["lettuce"] },
      { name: "Light Caesar dressing", amount: "2 tbsp", calories: 70, protein: 1, tags: ["dressing"] },
      { name: "Parmesan", amount: "1 tbsp", calories: 22, protein: 2, tags: ["dairy", "cheese"] },
    ],
  },
  {
    id: "turkey-pesto-pasta",
    name: "Turkey pesto pasta",
    type: "Dinner",
    cuisine: "Italian",
    format: "Pasta",
    prepMinutes: 22,
    cost: "medium",
    preferenceTags: ["Pasta", "Turkey", "Italian"],
    searchTags: ["turkey", "pasta", "pesto", "italian"],
    why: "A normal pasta dinner with enough protein to fit a strength-focused plan.",
    ingredients: [
      { name: "Pasta", amount: "2.5 oz dry", calories: 260, protein: 9, tags: ["pasta", "wheat"] },
      { name: "Lean ground turkey", amount: "6 oz cooked", calories: 300, protein: 42, tags: ["turkey"] },
      { name: "Pesto", amount: "1.5 tbsp", calories: 120, protein: 2, tags: ["pesto", "nuts"] },
      { name: "Cherry tomatoes", amount: "1 cup", calories: 30, protein: 1, tags: ["tomato", "vegetables"] },
    ],
  },
  {
    id: "chicken-marinara-pasta",
    name: "Chicken marinara pasta",
    type: "Dinner",
    cuisine: "Italian",
    format: "Pasta",
    prepMinutes: 24,
    cost: "medium",
    preferenceTags: ["Pasta", "Chicken", "Italian"],
    searchTags: ["chicken", "pasta", "marinara", "tomato", "italian"],
    why: "Comfort-food structure with portions that still make the day easy to manage.",
    ingredients: [
      { name: "Pasta", amount: "2.5 oz dry", calories: 260, protein: 9, tags: ["pasta", "wheat"] },
      { name: "Grilled chicken breast", amount: "5 oz", calories: 235, protein: 44, tags: ["chicken"] },
      { name: "Marinara", amount: "3/4 cup", calories: 90, protein: 3, tags: ["tomato", "marinara"] },
      { name: "Parmesan", amount: "2 tbsp", calories: 44, protein: 4, tags: ["dairy", "cheese"] },
    ],
  },
  {
    id: "salmon-potato-plate",
    name: "Salmon potato plate",
    type: "Dinner",
    cuisine: "American",
    format: "Plates",
    prepMinutes: 25,
    cost: "high",
    preferenceTags: ["Salmon", "Plates"],
    searchTags: ["salmon", "potato", "green beans", "fish"],
    why: "Simple whole-food dinner without trying to look like diet food.",
    ingredients: [
      { name: "Salmon", amount: "6 oz", calories: 350, protein: 38, tags: ["salmon", "fish"] },
      { name: "Roasted potatoes", amount: "10 oz", calories: 220, protein: 6, tags: ["potato"] },
      { name: "Green beans", amount: "1.5 cups", calories: 65, protein: 3, tags: ["vegetables", "green beans"] },
    ],
  },
  {
    id: "steak-taco-bowl",
    name: "Steak taco bowl",
    type: "Dinner",
    cuisine: "Mexican",
    format: "Bowls",
    prepMinutes: 20,
    cost: "high",
    preferenceTags: ["Steak", "Tacos", "Rice bowls", "Mexican"],
    searchTags: ["steak", "rice", "beans", "salsa", "mexican"],
    why: "A higher-flavor option that still has a clear protein anchor.",
    ingredients: [
      { name: "Lean steak", amount: "5 oz cooked", calories: 290, protein: 40, tags: ["steak", "beef"] },
      { name: "Cooked rice", amount: "3/4 cup", calories: 155, protein: 3, tags: ["rice"] },
      { name: "Black beans", amount: "1/2 cup", calories: 115, protein: 8, tags: ["beans"] },
      { name: "Corn salsa", amount: "1/2 cup", calories: 70, protein: 2, tags: ["corn", "salsa"] },
      { name: "Lettuce + pico", amount: "1 cup", calories: 30, protein: 1, tags: ["vegetables", "tomato"] },
    ],
  },
  {
    id: "turkey-sandwich",
    name: "Turkey avocado sandwich",
    type: "Lunch",
    cuisine: "American",
    format: "Sandwiches",
    prepMinutes: 7,
    cost: "low",
    preferenceTags: ["Turkey", "Sandwiches"],
    searchTags: ["turkey", "sandwich", "avocado", "bread"],
    why: "A seven-minute lunch with almost no cleanup.",
    ingredients: [
      { name: "Whole grain bread", amount: "2 slices", calories: 180, protein: 8, tags: ["bread", "wheat"] },
      { name: "Turkey breast", amount: "5 oz", calories: 150, protein: 30, tags: ["turkey"] },
      { name: "Avocado", amount: "1/3 medium", calories: 80, protein: 1, tags: ["avocado"] },
      { name: "Cheddar", amount: "1 slice", calories: 80, protein: 5, tags: ["dairy", "cheese"] },
      { name: "Lettuce + tomato", amount: "1 serving", calories: 20, protein: 1, tags: ["vegetables", "tomato"] },
    ],
  },
  {
    id: "protein-smoothie",
    name: "Berry banana protein smoothie",
    type: "Snack",
    cuisine: "American",
    format: "Smoothies",
    prepMinutes: 5,
    cost: "low",
    preferenceTags: ["Smoothies", "Greek yogurt"],
    searchTags: ["smoothie", "banana", "berries", "protein"],
    why: "Useful when appetite is low or you need protein without another full meal.",
    ingredients: [
      { name: "Whey protein", amount: "1 scoop", calories: 130, protein: 25, tags: ["protein powder"] },
      { name: "Skim milk", amount: "1 cup", calories: 90, protein: 9, tags: ["dairy", "milk"] },
      { name: "Banana", amount: "1 medium", calories: 105, protein: 1, tags: ["banana", "fruit"] },
      { name: "Frozen berries", amount: "1 cup", calories: 70, protein: 1, tags: ["berries", "fruit"] },
    ],
  },
];

export const EXERCISES: Exercise[] = [
  { id: "leg-press", name: "Leg press", pattern: "squat", equipment: ["gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Quads", "Glutes"], cue: "Keep your whole foot planted and use a range you can control.", alternativeIds: ["goblet-squat", "chair-squat"] },
  { id: "machine-chest-press", name: "Machine chest press", pattern: "push", equipment: ["gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Chest", "Triceps"], cue: "Set the seat so the handles start around mid-chest.", alternativeIds: ["dumbbell-bench", "incline-pushup"] },
  { id: "seated-row", name: "Seated cable row", pattern: "pull", equipment: ["gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Back", "Biceps"], cue: "Pull toward your lower ribs without leaning far back.", alternativeIds: ["chest-supported-row", "band-row"] },
  { id: "hamstring-curl", name: "Seated hamstring curl", pattern: "hinge", equipment: ["gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Hamstrings"], cue: "Move smoothly and pause briefly in the curled position.", alternativeIds: ["dumbbell-rdl", "glute-bridge"] },
  { id: "goblet-squat", name: "Goblet squat", pattern: "squat", equipment: ["dumbbells", "home", "mixed"], beginnerFriendly: true, stable: false, focus: ["Quads", "Glutes"], cue: "Hold the weight close and sit between your hips.", alternativeIds: ["chair-squat", "leg-press"] },
  { id: "dumbbell-bench", name: "Dumbbell bench press", pattern: "push", equipment: ["dumbbells", "gym", "mixed"], beginnerFriendly: true, stable: false, focus: ["Chest", "Triceps"], cue: "Lower with control and keep your wrists stacked over your elbows.", alternativeIds: ["machine-chest-press", "incline-pushup"] },
  { id: "chest-supported-row", name: "Chest-supported dumbbell row", pattern: "pull", equipment: ["dumbbells", "gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Back", "Biceps"], cue: "Keep your chest supported and pull your elbows toward your hips.", alternativeIds: ["seated-row", "band-row"] },
  { id: "dumbbell-rdl", name: "Dumbbell Romanian deadlift", pattern: "hinge", equipment: ["dumbbells", "gym", "mixed"], beginnerFriendly: true, stable: false, focus: ["Hamstrings", "Glutes"], cue: "Push your hips back and keep the weights close to your legs.", alternativeIds: ["hamstring-curl", "glute-bridge"] },
  { id: "incline-pushup", name: "Incline push-up", pattern: "push", equipment: ["home", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Chest", "Triceps"], cue: "Use a surface high enough that every rep looks controlled.", alternativeIds: ["machine-chest-press", "dumbbell-bench"] },
  { id: "band-row", name: "Band or backpack row", pattern: "pull", equipment: ["home", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Back", "Biceps"], cue: "Keep your torso quiet and pull your elbows behind you.", alternativeIds: ["seated-row", "chest-supported-row"] },
  { id: "chair-squat", name: "Chair squat", pattern: "squat", equipment: ["home", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Quads", "Glutes"], cue: "Use the chair as a target, then stand tall without rushing.", alternativeIds: ["goblet-squat", "leg-press"] },
  { id: "glute-bridge", name: "Glute bridge", pattern: "hinge", equipment: ["home", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Glutes", "Hamstrings"], cue: "Drive through your feet and stop when your hips are fully extended.", alternativeIds: ["dumbbell-rdl", "hamstring-curl"] },
  { id: "reverse-lunge", name: "Reverse lunge", pattern: "single-leg", equipment: ["gym", "dumbbells", "home", "mixed"], beginnerFriendly: false, stable: false, focus: ["Quads", "Glutes"], cue: "Step back far enough that the front foot stays planted.", alternativeIds: ["step-up", "leg-press", "chair-squat"] },
  { id: "step-up", name: "Supported step-up", pattern: "single-leg", equipment: ["gym", "home", "mixed"], beginnerFriendly: true, stable: true, focus: ["Quads", "Glutes", "Balance"], cue: "Use a rail or support and choose a low step first.", alternativeIds: ["reverse-lunge", "leg-press"] },
  { id: "pallof-press", name: "Pallof press", pattern: "core", equipment: ["gym", "mixed"], beginnerFriendly: true, stable: true, focus: ["Core"], cue: "Press away without letting your torso rotate.", alternativeIds: ["dead-bug"] },
  { id: "dead-bug", name: "Dead bug", pattern: "core", equipment: ["home", "gym", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Core"], cue: "Move slowly and keep your lower back comfortably supported.", alternativeIds: ["pallof-press"] },
  { id: "farmer-carry", name: "Farmer carry", pattern: "carry", equipment: ["gym", "dumbbells", "mixed"], beginnerFriendly: true, stable: true, focus: ["Grip", "Core", "Posture"], cue: "Walk tall with short controlled steps.", alternativeIds: ["march-hold"] },
  { id: "march-hold", name: "Supported march", pattern: "balance", equipment: ["home", "gym", "mixed", "unsure"], beginnerFriendly: true, stable: true, focus: ["Balance", "Core"], cue: "Keep a hand near support and lift one knee at a time with control.", alternativeIds: ["farmer-carry"] },
];

export function mealMacros(meal: Meal) {
  return meal.ingredients.reduce(
    (total, ingredient) => ({
      calories: total.calories + ingredient.calories,
      protein: total.protein + ingredient.protein,
    }),
    { calories: 0, protein: 0 },
  );
}
