/**
 * Maps a user's plain-language exclusions to ingredient-name rules so both
 * the template proposer and verification can enforce them mechanically.
 */

export interface BannedRule {
  /** Lowercased text to look for in an ingredient name. */
  match: string;
  /** When true, the ingredient name must equal `match` exactly. */
  exact?: boolean;
}

const MEAT: BannedRule[] = [
  { match: "chicken" },
  { match: "beef" },
  { match: "turkey" },
  { match: "pork" },
  { match: "salmon" },
  { match: "tilapia" },
  { match: "shrimp" },
  { match: "tuna" },
];

const DAIRY: BannedRule[] = [
  { match: "milk, 2%" },
  { match: "cheddar" },
  { match: "mozzarella" },
  { match: "yogurt" },
  { match: "cottage" },
  { match: "whey" },
  // Exact so "peanut butter" is not treated as dairy.
  { match: "butter", exact: true },
];

const PRESET_RULES: Record<string, BannedRule[]> = {
  vegetarian: MEAT,
  vegan: [...MEAT, ...DAIRY, { match: "egg" }, { match: "honey" }],
  "no dairy": DAIRY,
  "no gluten": [
    { match: "whole wheat bread" },
    { match: "pasta" },
    { match: "flour tortilla" },
  ],
  "no nuts": [{ match: "almond" }, { match: "peanut" }],
  "no shellfish": [{ match: "shrimp" }],
  "no pork": [{ match: "pork" }],
  "no beef": [{ match: "beef" }],
};

/** Expand the user's exclusion list into concrete ingredient rules. */
export function bannedRulesFor(exclusions: string[]): BannedRule[] {
  const rules: BannedRule[] = [];
  for (const raw of exclusions) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const preset = PRESET_RULES[key];
    if (preset) rules.push(...preset);
    // Free-text entries ("cilantro", "mushrooms") ban by substring.
    else rules.push({ match: key });
  }
  return rules;
}

export function isBanned(ingredientName: string, rules: BannedRule[]): boolean {
  const name = ingredientName.toLowerCase();
  return rules.some((r) => (r.exact ? name === r.match : name.includes(r.match)));
}
