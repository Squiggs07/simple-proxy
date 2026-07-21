/**
 * Deterministic meal templates built entirely from the verified seed food
 * table. This is the engine's safety net: it works offline, with no API key,
 * and can always produce a meal when the LLM path fails or proposes
 * something that can't be verified. Every ingredient name here must match a
 * `SEED_FOODS` name exactly (there's a test for that).
 */

import { computeMealMacros } from "@/lib/food";
import { SEED_FOODS } from "@/lib/seed-foods";
import { bannedRulesFor, isBanned } from "./exclusion-rules";
import type { MealRequest, MealSlot, ProposedMeal } from "./types";

export type MealTemplate = Omit<ProposedMeal, "whyThisFits"> & {
  whyThisFits: string;
};

export const MEAL_TEMPLATES: Record<MealSlot, MealTemplate[]> = {
  breakfast: [
    {
      title: "Greek yogurt power bowl",
      description: "Creamy yogurt with oats, blueberries, almonds, and honey.",
      whyThisFits: "A big protein start that keeps you full through the morning.",
      steps: [
        "Spoon the yogurt into a bowl.",
        "Stir in the oats and let them soften for a minute.",
        "Top with blueberries, almonds, and a drizzle of honey.",
      ],
      ingredients: [
        { name: "greek yogurt, nonfat, plain", grams: 300 },
        { name: "rolled oats, dry", grams: 50 },
        { name: "blueberries", grams: 100 },
        { name: "almonds", grams: 20 },
        { name: "honey", grams: 15 },
      ],
    },
    {
      title: "Veggie scramble with toast",
      description: "Soft scrambled eggs with spinach and tomato on wheat toast.",
      whyThisFits: "Eggs and veggies cover protein and produce in one pan.",
      steps: [
        "Warm the olive oil in a nonstick pan over medium heat.",
        "Add spinach and tomato; cook until soft.",
        "Pour in beaten eggs and scramble gently until just set.",
        "Serve on toasted bread.",
      ],
      ingredients: [
        { name: "egg, whole", grams: 150 },
        { name: "spinach, raw", grams: 50 },
        { name: "tomato", grams: 80 },
        { name: "whole wheat bread", grams: 64 },
        { name: "olive oil", grams: 7 },
      ],
    },
    {
      title: "Peanut butter banana oatmeal",
      description: "Warm oats cooked in soy milk with banana and peanut butter.",
      whyThisFits: "Slow-burning carbs plus plant protein — steady energy, no crash.",
      steps: [
        "Simmer the oats in soy milk for about 5 minutes, stirring.",
        "Slice the banana over the top.",
        "Swirl in the peanut butter before serving.",
      ],
      ingredients: [
        { name: "rolled oats, dry", grams: 70 },
        { name: "soy milk, unsweetened", grams: 250 },
        { name: "banana", grams: 118 },
        { name: "peanut butter", grams: 25 },
      ],
    },
    {
      title: "Tofu breakfast hash",
      description: "Crumbled tofu with crispy potatoes, peppers, and onion.",
      whyThisFits: "A savory, filling start with plant protein and no dairy or eggs.",
      steps: [
        "Heat the olive oil in a pan and brown the diced potato.",
        "Add pepper and onion; cook until soft.",
        "Crumble in the tofu, season well, and cook 3–4 more minutes.",
      ],
      ingredients: [
        { name: "tofu, firm", grams: 200 },
        { name: "potato, baked", grams: 200 },
        { name: "bell pepper", grams: 80 },
        { name: "onion", grams: 50 },
        { name: "olive oil", grams: 10 },
      ],
    },
    {
      title: "Cottage cheese fruit plate",
      description: "Cottage cheese with strawberries and honey on toast.",
      whyThisFits: "Quiet-morning food: high protein, five minutes, one plate.",
      steps: [
        "Scoop the cottage cheese onto a plate.",
        "Add strawberries and toast on the side.",
        "Finish with a small drizzle of honey.",
      ],
      ingredients: [
        { name: "cottage cheese, 2%", grams: 250 },
        { name: "strawberries", grams: 150 },
        { name: "whole wheat bread", grams: 32 },
        { name: "honey", grams: 10 },
      ],
    },
  ],
  lunch: [
    {
      title: "Chicken and rice bowl",
      description: "Sliced chicken over rice with broccoli and olive oil.",
      whyThisFits: "The reliable classic — hits your protein with zero fuss.",
      steps: [
        "Warm the rice and broccoli.",
        "Slice the chicken and lay it over the top.",
        "Drizzle with olive oil and season.",
      ],
      ingredients: [
        { name: "chicken breast, cooked", grams: 150 },
        { name: "white rice, cooked", grams: 200 },
        { name: "broccoli, cooked", grams: 120 },
        { name: "olive oil", grams: 8 },
      ],
    },
    {
      title: "Tuna and hummus plate",
      description: "Tuna with hummus, crunchy lettuce, tomato, and wheat bread.",
      whyThisFits: "Lean protein and fiber that comes together in five minutes.",
      steps: [
        "Drain the tuna and pile it onto the plate.",
        "Add hummus, lettuce, and tomato.",
        "Serve with the bread for scooping.",
      ],
      ingredients: [
        { name: "tuna, canned in water, drained", grams: 120 },
        { name: "whole wheat bread", grams: 64 },
        { name: "romaine lettuce", grams: 60 },
        { name: "tomato", grams: 80 },
        { name: "hummus", grams: 40 },
      ],
    },
    {
      title: "Chickpea quinoa salad",
      description: "Chickpeas and quinoa with cucumber, tomato, and spinach.",
      whyThisFits: "Plant protein plus lots of crunch — filling without feeling heavy.",
      steps: [
        "Toss the chickpeas and quinoa in a big bowl.",
        "Add chopped cucumber, tomato, and spinach.",
        "Dress with olive oil, salt, and plenty of pepper.",
      ],
      ingredients: [
        { name: "chickpeas, cooked", grams: 200 },
        { name: "quinoa, cooked", grams: 150 },
        { name: "cucumber", grams: 100 },
        { name: "tomato", grams: 100 },
        { name: "spinach, raw", grams: 50 },
        { name: "olive oil", grams: 12 },
      ],
    },
    {
      title: "Turkey wrap",
      description: "Deli turkey with lettuce, tomato, and hummus in a tortilla.",
      whyThisFits: "Portable protein — assembles in two minutes, travels well.",
      steps: [
        "Spread the hummus over the tortilla.",
        "Layer on turkey, lettuce, and tomato.",
        "Roll it up tight and slice in half.",
      ],
      ingredients: [
        { name: "deli turkey breast", grams: 120 },
        { name: "flour tortilla", grams: 90 },
        { name: "romaine lettuce", grams: 50 },
        { name: "tomato", grams: 60 },
        { name: "hummus", grams: 40 },
      ],
    },
    {
      title: "Lentil and rice bowl",
      description: "Seasoned lentils over brown rice with carrots.",
      whyThisFits: "Cheap, batch-friendly, and quietly packed with protein and fiber.",
      steps: [
        "Warm the lentils and rice together.",
        "Grate or thinly slice the carrot over the top.",
        "Finish with olive oil and your favorite spices.",
      ],
      ingredients: [
        { name: "lentils, cooked", grams: 250 },
        { name: "brown rice, cooked", grams: 150 },
        { name: "carrots, raw", grams: 80 },
        { name: "olive oil", grams: 10 },
      ],
    },
  ],
  dinner: [
    {
      title: "Salmon with potatoes and broccoli",
      description: "Baked salmon alongside roasted potatoes and greens.",
      whyThisFits: "Protein plus omega-3s, and it feels like a proper dinner.",
      steps: [
        "Bake or pan-sear the salmon until it flakes.",
        "Roast or microwave the potatoes until tender.",
        "Serve with broccoli and a drizzle of olive oil.",
      ],
      ingredients: [
        { name: "salmon, cooked", grams: 140 },
        { name: "potato, baked", grams: 250 },
        { name: "broccoli, cooked", grams: 150 },
        { name: "olive oil", grams: 8 },
      ],
    },
    {
      title: "Beef burrito bowl",
      description: "Seasoned beef with rice, black beans, peppers, and cheddar.",
      whyThisFits: "Burrito-shop flavor with your numbers actually accounted for.",
      steps: [
        "Brown the beef with taco seasoning.",
        "Layer rice, beans, and sautéed peppers in a bowl.",
        "Top with the beef and a sprinkle of cheddar.",
      ],
      ingredients: [
        { name: "ground beef 90% lean, cooked", grams: 130 },
        { name: "white rice, cooked", grams: 180 },
        { name: "black beans, cooked", grams: 100 },
        { name: "bell pepper", grams: 80 },
        { name: "cheddar cheese", grams: 20 },
      ],
    },
    {
      title: "Tofu vegetable stir-fry",
      description: "Crispy tofu with broccoli and carrots over rice.",
      whyThisFits: "A veggie-forward dinner that still lands your protein.",
      steps: [
        "Pan-fry cubed tofu in the olive oil until golden.",
        "Add broccoli and carrots; stir-fry until crisp-tender.",
        "Season with soy sauce or your favorite stir-fry sauce; serve over rice.",
      ],
      ingredients: [
        { name: "tofu, firm", grams: 250 },
        { name: "white rice, cooked", grams: 200 },
        { name: "broccoli, cooked", grams: 150 },
        { name: "carrots, raw", grams: 80 },
        { name: "olive oil", grams: 12 },
      ],
    },
    {
      title: "Lemony tilapia with quinoa",
      description: "Light white fish over quinoa with wilted spinach.",
      whyThisFits: "Very lean protein — lots of food for the calories.",
      steps: [
        "Season the tilapia and pan-cook 3 minutes per side.",
        "Wilt the spinach in the same pan with olive oil.",
        "Serve everything over warm quinoa with lemon.",
      ],
      ingredients: [
        { name: "tilapia, cooked", grams: 160 },
        { name: "quinoa, cooked", grams: 200 },
        { name: "spinach, raw", grams: 80 },
        { name: "olive oil", grams: 10 },
      ],
    },
    {
      title: "Chicken tomato pasta",
      description: "Pasta tossed with chicken, tomato, and mozzarella.",
      whyThisFits: "Comfort food that still respects your day's numbers.",
      steps: [
        "Cook the pasta; sauté chopped tomato in olive oil.",
        "Toss pasta, tomato, and sliced chicken together.",
        "Top with mozzarella and black pepper.",
      ],
      ingredients: [
        { name: "chicken breast, cooked", grams: 130 },
        { name: "pasta, cooked", grams: 220 },
        { name: "tomato", grams: 120 },
        { name: "olive oil", grams: 10 },
        { name: "mozzarella, part-skim", grams: 30 },
      ],
    },
  ],
  snack: [
    {
      title: "Yogurt and blueberries",
      description: "Thick yogurt topped with fresh blueberries.",
      whyThisFits: "A sweet bite that sneaks in extra protein.",
      steps: ["Top the yogurt with blueberries. That's it."],
      ingredients: [
        { name: "greek yogurt, nonfat, plain", grams: 170 },
        { name: "blueberries", grams: 80 },
      ],
    },
    {
      title: "Apple with peanut butter",
      description: "Crisp apple slices with peanut butter for dipping.",
      whyThisFits: "Crunchy, sweet, and satisfying enough to bridge to dinner.",
      steps: ["Slice the apple.", "Dip in the peanut butter."],
      ingredients: [
        { name: "apple", grams: 182 },
        { name: "peanut butter", grams: 20 },
      ],
    },
    {
      title: "Banana protein shake",
      description: "Whey blended with milk and half a banana.",
      whyThisFits: "The fastest way to close a protein gap in the day.",
      steps: ["Blend everything with a few ice cubes until smooth."],
      ingredients: [
        { name: "whey protein powder", grams: 32 },
        { name: "milk, 2%", grams: 250 },
        { name: "banana", grams: 60 },
      ],
    },
    {
      title: "Veggies and hummus",
      description: "Carrot and cucumber sticks with creamy hummus.",
      whyThisFits: "Crunch without the calories — and it counts as vegetables.",
      steps: ["Cut the veggies into sticks.", "Dip generously."],
      ingredients: [
        { name: "hummus", grams: 60 },
        { name: "carrots, raw", grams: 100 },
        { name: "cucumber", grams: 100 },
      ],
    },
    {
      title: "Rice cakes with cottage cheese",
      description: "Crunchy rice cakes topped with cottage cheese.",
      whyThisFits: "Light but protein-dense — good for an afternoon dip.",
      steps: ["Spread the cottage cheese over the rice cakes.", "Add black pepper."],
      ingredients: [
        { name: "rice cakes", grams: 27 },
        { name: "cottage cheese, 2%", grams: 150 },
      ],
    },
  ],
};

const seedByName = new Map(SEED_FOODS.map((f) => [f.name, f]));

/** Protein per kcal of a template, from the seed table (pure, no I/O). */
export function templateProteinDensity(template: MealTemplate): number {
  const items = template.ingredients.flatMap((i) => {
    const food = seedByName.get(i.name);
    return food ? [{ food, grams: i.grams }] : [];
  });
  const macros = computeMealMacros(items);
  return macros.kcal > 0 ? macros.proteinG / macros.kcal : 0;
}

/** How many best-matching candidates the picker rotates between, by priority. */
function poolSize(priority: string, available: number): number {
  if (priority === "precision") return Math.min(2, available);
  if (priority === "variety") return available;
  return Math.min(3, available);
}

/**
 * Pick a template for the request. Candidates that conflict with the user's
 * exclusions are removed, the rest are ranked by how closely their
 * protein-per-calorie matches the slot's budget (accuracy first), and
 * `variant` rotates within the best few for day-to-day variety — how many,
 * depends on the user's chosen priority. Returns null only if every template
 * for the slot is excluded.
 */
export function pickTemplate(
  request: MealRequest,
  variant = 0,
): ProposedMeal | null {
  const rules = bannedRulesFor(request.exclusions);
  const avoid = new Set(request.avoidTitles.map((t) => t.toLowerCase()));

  const allowed = MEAL_TEMPLATES[request.slot].filter(
    (t) => !t.ingredients.some((i) => isBanned(i.name, rules)),
  );
  if (allowed.length === 0) return null;

  const fresh = allowed.filter((t) => !avoid.has(t.title.toLowerCase()));
  const candidates = fresh.length > 0 ? fresh : allowed;

  const targetDensity =
    request.budgetKcal > 0 ? request.budgetProteinG / request.budgetKcal : 0;
  const ranked = [...candidates].sort(
    (a, b) =>
      Math.abs(templateProteinDensity(a) - targetDensity) -
      Math.abs(templateProteinDensity(b) - targetDensity),
  );

  const pool = ranked.slice(0, poolSize(request.priority, ranked.length));
  return pool[((variant % pool.length) + pool.length) % pool.length];
}
