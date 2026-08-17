import { describe, expect, it } from "vitest";

import { normalizeSearchFood, type FdcSearchFood } from "./fdc";
import { computeMealMacros, rankFoodMatches } from "./food";
import { SEED_FOODS } from "./seed-foods";

const foodByName = (name: string) => {
  const f = SEED_FOODS.find((s) => s.name === name);
  if (!f) throw new Error(`missing seed food: ${name}`);
  return f;
};

describe("computeMealMacros", () => {
  it("computes a simple meal from per-100g values", () => {
    // 150g cooked chicken breast + 200g cooked white rice
    const meal = computeMealMacros([
      { food: foodByName("chicken breast, cooked"), grams: 150 },
      { food: foodByName("white rice, cooked"), grams: 200 },
    ]);
    // chicken: 247.5 kcal, 46.5P, 0C, 5.4F; rice: 260 kcal, 5.4P, 56.4C, 0.6F
    expect(meal.kcal).toBe(508);
    expect(meal.proteinG).toBeCloseTo(51.9);
    expect(meal.carbsG).toBeCloseTo(56.4);
    expect(meal.fatG).toBeCloseTo(6.0);
  });

  it("returns zeros for an empty meal", () => {
    expect(computeMealMacros([])).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it("handles zero-gram items", () => {
    const meal = computeMealMacros([
      { food: foodByName("olive oil"), grams: 0 },
    ]);
    expect(meal.kcal).toBe(0);
  });

  it("rejects negative and non-finite quantities", () => {
    const oil = foodByName("olive oil");
    expect(() => computeMealMacros([{ food: oil, grams: -10 }])).toThrow();
    expect(() => computeMealMacros([{ food: oil, grams: NaN }])).toThrow();
  });
});

describe("seed food data integrity", () => {
  it("has unique names", () => {
    const names = SEED_FOODS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has internally consistent calories (Atwater check)", () => {
    // 4/4/9 kcal per gram of protein/carbs/fat. Fiber and rounding cause
    // drift, so allow max(10 kcal, 15%) per 100g.
    for (const f of SEED_FOODS) {
      const computed =
        4 * f.proteinPer100g + 4 * f.carbsPer100g + 9 * f.fatPer100g;
      const tolerance = Math.max(10, f.kcalPer100g * 0.15);
      expect(
        Math.abs(computed - f.kcalPer100g),
        `${f.name}: label ${f.kcalPer100g} vs computed ${computed.toFixed(1)}`,
      ).toBeLessThanOrEqual(tolerance);
    }
  });

  it("has sane ranges for every food", () => {
    for (const f of SEED_FOODS) {
      expect(f.kcalPer100g).toBeGreaterThan(0);
      expect(f.kcalPer100g).toBeLessThanOrEqual(900);
      for (const macro of [f.proteinPer100g, f.carbsPer100g, f.fatPer100g]) {
        expect(macro).toBeGreaterThanOrEqual(0);
        expect(macro).toBeLessThanOrEqual(100);
      }
      if (f.gramsPerUnit !== undefined) {
        expect(f.gramsPerUnit).toBeGreaterThan(0);
        expect(f.unitName).toBeTruthy();
      }
    }
  });
});

describe("rankFoodMatches", () => {
  const candidates = [
    { name: "chicken breast tenders, breaded, cooked" },
    { name: "chicken breast, cooked" },
    { name: "soup, chicken breast, canned" },
  ];

  it("prefers exact matches, then prefixes, then substrings", () => {
    const ranked = rankFoodMatches("chicken breast, cooked", candidates);
    expect(ranked[0].name).toBe("chicken breast, cooked");
    const ranked2 = rankFoodMatches("chicken breast", candidates);
    expect(ranked2[0].name).toBe("chicken breast, cooked");
    expect(ranked2[2].name).toBe("soup, chicken breast, canned");
  });
});

describe("normalizeSearchFood", () => {
  const fixture: FdcSearchFood = {
    fdcId: 171077,
    description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    dataType: "SR Legacy",
    foodNutrients: [
      { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 165 },
      { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 31.02 },
      { nutrientNumber: "204", nutrientName: "Total lipid (fat)", unitName: "G", value: 3.57 },
      { nutrientNumber: "205", nutrientName: "Carbohydrate, by difference", unitName: "G", value: 0 },
      { nutrientNumber: "291", nutrientName: "Fiber, total dietary", unitName: "G", value: 0 },
    ],
  };

  it("extracts per-100g macros from an FDC search result", () => {
    expect(normalizeSearchFood(fixture)).toEqual({
      fdcId: 171077,
      name: "chicken, broilers or fryers, breast, meat only, cooked, roasted",
      kcalPer100g: 165,
      proteinPer100g: 31.02,
      carbsPer100g: 0,
      fatPer100g: 3.57,
    });
  });

  it("keeps legitimate zero macros", () => {
    const result = normalizeSearchFood(fixture);
    expect(result?.carbsPer100g).toBe(0);
  });

  it("rejects records without usable energy", () => {
    expect(
      normalizeSearchFood({ ...fixture, foodNutrients: fixture.foodNutrients!.filter((n) => n.nutrientNumber !== "208") }),
    ).toBeNull();
    expect(normalizeSearchFood({ ...fixture, foodNutrients: [] })).toBeNull();
  });

  it("rejects records with energy but no macros at all", () => {
    expect(
      normalizeSearchFood({
        ...fixture,
        foodNutrients: [{ nutrientNumber: "208", value: 100 }],
      }),
    ).toBeNull();
  });
});
