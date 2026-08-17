/**
 * USDA FoodData Central client. This is the only place the app talks to the
 * FDC API; everything downstream works with NormalizedFood.
 *
 * The API is free — get a key at https://fdc.nal.usda.gov/api-key-signup and
 * set FDC_API_KEY. DEMO_KEY works for light use. Server-side only.
 */

const FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

// FDC nutrient numbers (stable across data types).
const NUTRIENT_ENERGY_KCAL = "208";
const NUTRIENT_PROTEIN = "203";
const NUTRIENT_FAT = "204";
const NUTRIENT_CARBS = "205";

export interface FdcSearchFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients?: Array<{
    nutrientNumber?: string;
    nutrientName?: string;
    unitName?: string;
    value?: number;
  }>;
}

export interface NormalizedFood {
  fdcId: number;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

/**
 * Convert an FDC search result into per-100g macros. Foundation and
 * SR Legacy search results report nutrient values per 100 g.
 * Returns null when required nutrients are missing.
 */
export function normalizeSearchFood(food: FdcSearchFood): NormalizedFood | null {
  const nutrients = food.foodNutrients ?? [];
  const byNumber = (num: string) =>
    nutrients.find((n) => n.nutrientNumber === num)?.value;

  const kcal = byNumber(NUTRIENT_ENERGY_KCAL);
  const protein = byNumber(NUTRIENT_PROTEIN);
  const carbs = byNumber(NUTRIENT_CARBS);
  const fat = byNumber(NUTRIENT_FAT);

  // Protein/carbs/fat may legitimately be 0; only energy must be present
  // and positive for the record to be usable.
  if (kcal === undefined || kcal <= 0) return null;
  if (protein === undefined && carbs === undefined && fat === undefined) {
    return null;
  }

  return {
    fdcId: food.fdcId,
    name: food.description.toLowerCase(),
    kcalPer100g: kcal,
    proteinPer100g: protein ?? 0,
    carbsPer100g: carbs ?? 0,
    fatPer100g: fat ?? 0,
  };
}

/**
 * Search FDC for a food by name. Restricted to Foundation + SR Legacy data
 * (lab-analyzed generic foods, per-100g basis) — branded foods are noisier
 * and can wait. Returns [] on any API failure so callers fall back to the
 * local cache/seed table.
 */
export async function searchFdcFoods(
  query: string,
  options?: { apiKey?: string; pageSize?: number },
): Promise<NormalizedFood[]> {
  const apiKey = options?.apiKey ?? process.env.FDC_API_KEY ?? "DEMO_KEY";
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    dataType: "Foundation,SR Legacy",
    pageSize: String(options?.pageSize ?? 10),
  });

  try {
    const res = await fetch(`${FDC_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { foods?: FdcSearchFood[] };
    return (data.foods ?? [])
      .map(normalizeSearchFood)
      .filter((f): f is NormalizedFood => f !== null);
  } catch {
    return [];
  }
}
