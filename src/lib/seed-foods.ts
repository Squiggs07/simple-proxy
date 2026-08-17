/**
 * Seed table of common foods with verified macros (per 100 g), based on
 * USDA FoodData Central published values (Foundation / SR Legacy).
 *
 * This is the spec's §4a fallback: the core loop must work from real data
 * even before/without the live USDA integration. Values are for the edible
 * portion, cooked where noted.
 */

export interface SeedFood {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  gramsPerUnit?: number;
  unitName?: string;
}

export const SEED_FOODS: SeedFood[] = [
  // ——— Proteins ———
  { name: "chicken breast, cooked", kcalPer100g: 165, proteinPer100g: 31.0, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "chicken thigh, cooked", kcalPer100g: 209, proteinPer100g: 26.0, carbsPer100g: 0, fatPer100g: 10.9 },
  { name: "ground beef 90% lean, cooked", kcalPer100g: 217, proteinPer100g: 26.1, carbsPer100g: 0, fatPer100g: 11.7 },
  { name: "ground turkey 93% lean, cooked", kcalPer100g: 213, proteinPer100g: 25.9, carbsPer100g: 0, fatPer100g: 11.5 },
  { name: "pork loin, cooked", kcalPer100g: 196, proteinPer100g: 27.3, carbsPer100g: 0, fatPer100g: 8.9 },
  { name: "salmon, cooked", kcalPer100g: 206, proteinPer100g: 22.1, carbsPer100g: 0, fatPer100g: 12.3 },
  { name: "tilapia, cooked", kcalPer100g: 128, proteinPer100g: 26.2, carbsPer100g: 0, fatPer100g: 2.7 },
  { name: "shrimp, cooked", kcalPer100g: 99, proteinPer100g: 23.8, carbsPer100g: 0.2, fatPer100g: 0.3 },
  { name: "tuna, canned in water, drained", kcalPer100g: 116, proteinPer100g: 25.5, carbsPer100g: 0, fatPer100g: 0.8 },
  { name: "deli turkey breast", kcalPer100g: 104, proteinPer100g: 17.1, carbsPer100g: 4.2, fatPer100g: 1.7 },
  { name: "egg, whole", kcalPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5, gramsPerUnit: 50, unitName: "large egg" },
  { name: "egg white", kcalPer100g: 52, proteinPer100g: 10.9, carbsPer100g: 0.7, fatPer100g: 0.2, gramsPerUnit: 33, unitName: "large egg white" },
  { name: "tofu, firm", kcalPer100g: 76, proteinPer100g: 8.1, carbsPer100g: 1.9, fatPer100g: 4.8 },
  { name: "greek yogurt, nonfat, plain", kcalPer100g: 59, proteinPer100g: 10.2, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { name: "cottage cheese, 2%", kcalPer100g: 84, proteinPer100g: 11.0, carbsPer100g: 4.3, fatPer100g: 2.3 },
  { name: "whey protein powder", kcalPer100g: 375, proteinPer100g: 75.0, carbsPer100g: 12.5, fatPer100g: 6.3, gramsPerUnit: 32, unitName: "scoop" },

  // ——— Grains & starches ———
  { name: "white rice, cooked", kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28.2, fatPer100g: 0.3 },
  { name: "brown rice, cooked", kcalPer100g: 122, proteinPer100g: 2.7, carbsPer100g: 25.6, fatPer100g: 0.9 },
  { name: "quinoa, cooked", kcalPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21.3, fatPer100g: 1.9 },
  { name: "pasta, cooked", kcalPer100g: 158, proteinPer100g: 5.8, carbsPer100g: 30.9, fatPer100g: 0.9 },
  { name: "rolled oats, dry", kcalPer100g: 379, proteinPer100g: 13.2, carbsPer100g: 67.7, fatPer100g: 6.5 },
  { name: "whole wheat bread", kcalPer100g: 247, proteinPer100g: 13.0, carbsPer100g: 41.0, fatPer100g: 3.4, gramsPerUnit: 32, unitName: "slice" },
  { name: "flour tortilla", kcalPer100g: 306, proteinPer100g: 8.2, carbsPer100g: 50.0, fatPer100g: 8.0, gramsPerUnit: 45, unitName: "tortilla" },
  { name: "corn tortilla", kcalPer100g: 218, proteinPer100g: 5.7, carbsPer100g: 44.6, fatPer100g: 2.9, gramsPerUnit: 26, unitName: "tortilla" },
  { name: "potato, baked", kcalPer100g: 93, proteinPer100g: 2.5, carbsPer100g: 21.1, fatPer100g: 0.1 },
  { name: "sweet potato, baked", kcalPer100g: 90, proteinPer100g: 2.0, carbsPer100g: 20.7, fatPer100g: 0.2 },
  { name: "rice cakes", kcalPer100g: 387, proteinPer100g: 8.2, carbsPer100g: 81.5, fatPer100g: 2.8, gramsPerUnit: 9, unitName: "cake" },

  // ——— Legumes ———
  { name: "black beans, cooked", kcalPer100g: 132, proteinPer100g: 8.9, carbsPer100g: 23.7, fatPer100g: 0.5 },
  { name: "chickpeas, cooked", kcalPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27.4, fatPer100g: 2.6 },
  { name: "lentils, cooked", kcalPer100g: 116, proteinPer100g: 9.0, carbsPer100g: 20.1, fatPer100g: 0.4 },
  { name: "hummus", kcalPer100g: 166, proteinPer100g: 7.9, carbsPer100g: 14.3, fatPer100g: 9.6 },

  // ——— Dairy & alternatives ———
  { name: "milk, 2%", kcalPer100g: 50, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 2.0 },
  { name: "soy milk, unsweetened", kcalPer100g: 33, proteinPer100g: 2.9, carbsPer100g: 1.2, fatPer100g: 1.7 },
  { name: "cheddar cheese", kcalPer100g: 403, proteinPer100g: 24.9, carbsPer100g: 1.3, fatPer100g: 33.1 },
  { name: "mozzarella, part-skim", kcalPer100g: 254, proteinPer100g: 24.3, carbsPer100g: 2.8, fatPer100g: 15.9 },

  // ——— Fats, nuts & seeds ———
  { name: "olive oil", kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, gramsPerUnit: 13.5, unitName: "tablespoon" },
  { name: "butter", kcalPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81.1, gramsPerUnit: 14, unitName: "tablespoon" },
  { name: "peanut butter", kcalPer100g: 588, proteinPer100g: 25.1, carbsPer100g: 19.6, fatPer100g: 50.4, gramsPerUnit: 16, unitName: "tablespoon" },
  { name: "almonds", kcalPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9, gramsPerUnit: 28, unitName: "small handful" },
  { name: "avocado", kcalPer100g: 160, proteinPer100g: 2.0, carbsPer100g: 8.5, fatPer100g: 14.7, gramsPerUnit: 75, unitName: "half avocado" },

  // ——— Fruit ———
  { name: "banana", kcalPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3, gramsPerUnit: 118, unitName: "medium banana" },
  { name: "apple", kcalPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatPer100g: 0.2, gramsPerUnit: 182, unitName: "medium apple" },
  { name: "orange", kcalPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 11.8, fatPer100g: 0.1, gramsPerUnit: 131, unitName: "medium orange" },
  { name: "blueberries", kcalPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14.5, fatPer100g: 0.3 },
  { name: "strawberries", kcalPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3 },

  // ——— Vegetables ———
  { name: "broccoli, cooked", kcalPer100g: 35, proteinPer100g: 2.4, carbsPer100g: 7.2, fatPer100g: 0.4 },
  { name: "spinach, raw", kcalPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { name: "carrots, raw", kcalPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 9.6, fatPer100g: 0.2 },
  { name: "bell pepper", kcalPer100g: 31, proteinPer100g: 1.0, carbsPer100g: 6.0, fatPer100g: 0.3 },
  { name: "tomato", kcalPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  { name: "cucumber", kcalPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1 },
  { name: "romaine lettuce", kcalPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.3, fatPer100g: 0.3 },
  { name: "onion", kcalPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1 },

  // ——— Pantry & treats ———
  { name: "honey", kcalPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82.4, fatPer100g: 0, gramsPerUnit: 21, unitName: "tablespoon" },
  { name: "dark chocolate, 70-85%", kcalPer100g: 598, proteinPer100g: 7.8, carbsPer100g: 45.9, fatPer100g: 42.6 },
];
