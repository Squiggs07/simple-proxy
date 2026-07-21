# Start Here — fitness & nutrition, minus the overwhelm

An app for people who want to get in shape and eat better but are intimidated
and don't know where to start. It removes decisions instead of adding features:
answer a few friendly questions, get one safe, personalized daily target
explained in plain English.

**Current status: Phase 3** —
- Phase 1: auth, one-question-per-screen onboarding, server-side macro math
  with safety guardrails, and the plain-language summary screen.
- Phase 2: the food data layer — verified seed food table, USDA FoodData
  Central integration with local caching, tested meal-macro computation.
- Phase 3: the meal engine — a full day of meals that hits the user's
  targets, with swap and portion adjustment. The LLM proposes; the backend
  verifies every ingredient against real food data and computes the numbers
  itself.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind — mobile-first responsive web app
- [Auth.js](https://authjs.dev) (NextAuth v5) — email + password sessions
- [Prisma](https://prisma.io) + SQLite — local-first for this phase; the schema
  ports directly to Postgres/Supabase later
- [Vitest](https://vitest.dev) — unit tests for the parts that must not be
  wrong (macro math, safety clamps)

## Running it

```bash
cd start-here
npm install            # also runs `prisma generate`
cp .env.example .env   # then set AUTH_SECRET (openssl rand -base64 32)
npx prisma migrate dev # creates prisma/dev.db and applies migrations
npm run db:seed        # loads the verified seed food table
npm run dev            # http://localhost:3000
```

Other commands:

```bash
npm test        # unit tests (macro math + safety guardrails)
npm run lint
npm run build && npm start   # production build
```

## Environment variables

| Variable       | What it is                                                        |
| -------------- | ----------------------------------------------------------------- |
| `DATABASE_URL` | SQLite file path, relative to `prisma/` (e.g. `file:./dev.db`)    |
| `AUTH_SECRET`  | Session encryption secret — generate with `openssl rand -base64 32` |
| `FDC_API_KEY`  | Optional USDA FoodData Central key ([free signup](https://fdc.nal.usda.gov/api-key-signup)); falls back to `DEMO_KEY` + the seed table |
| `ANTHROPIC_API_KEY` | Optional Anthropic key for LLM meal generation; without it the engine uses its verified template library |
| `MEAL_MODEL`   | Optional model override for meal generation (default `claude-opus-4-8`) |

No secrets are ever exposed to the client — all Anthropic API calls happen
server-side only.

## The meal engine (Phase 3)

The core loop from spec §4a/§6, in `src/lib/meal-engine/`:

1. `prompt.ts` builds the request — the slot's calorie/protein budget, the
   user's priority and exclusions, and hard safety rules (no very-low-calorie
   plans, no detoxes or fasting-as-weight-loss, no food moralizing) baked
   into the system prompt.
2. `llm-proposer.ts` asks Claude for a meal as structured JSON (title,
   friendly copy, steps, `{name, grams}` ingredients). Structured outputs
   guarantee the shape; the model never supplies nutrition numbers.
3. `generate.ts` verifies: every ingredient is resolved through
   `findFood` (cache → seed → USDA), exclusions are re-checked mechanically,
   quantities are scaled onto the calorie budget (`scale.ts`), and macros
   are computed from the database. Unverifiable proposals are discarded.
4. `templates.ts` is the deterministic fallback — a library of meals built
   entirely from seed foods, filtered by exclusions and ranked by how well
   their protein density matches the budget. The app works fully offline
   and without an API key.

The user gets a day view (`/plan`) with meal cards, per-ingredient gram and
macro detail, "swap this meal", and a ± portion adjuster. Slot budgets are
25/35/30/10% of the day across breakfast/lunch/dinner/snack.

## The food data layer (Phase 2)

Nutritional values come from real food data, never from an LLM's guess:

- `src/lib/seed-foods.ts` — ~55 common foods with verified per-100g macros
  (USDA published values), loaded by `npm run db:seed`. The core loop works
  entirely offline from this table.
- `src/lib/fdc.ts` — USDA FoodData Central search client, restricted to
  lab-analyzed Foundation/SR Legacy data. Fails soft: any API problem
  returns no results and the seed/cache table carries on.
- `src/lib/food.ts` — `findFood(name)` resolves local cache → seed → USDA
  (caching hits locally), and `computeMealMacros(items)` sums real macros
  for a list of `(food, grams)` — the pure, tested function every future
  meal must pass through.

The seed data has its own integrity test: every food's calories are checked
against its macros (4/4/9 Atwater factors) so a typo can't slip in.

## How the target is computed

All math lives in [`src/lib/macros.ts`](src/lib/macros.ts) as pure, unit-tested
functions:

- **Maintenance calories**: Mifflin-St Jeor BMR × an activity factor derived
  from a plain-language lifestyle question (never an "activity multiplier"
  shown to the user).
- **Goal adjustment**: moderate only — −15% for fat loss, +10% for muscle,
  maintenance otherwise.
- **Protein**: 1.6–2.0 g/kg bodyweight by goal, capped at 35% of calories.
  Fat is set at 30% of calories; carbs fill the rest.

### Safety guardrails (hard rules, tested)

- Calorie floors: never below 1,500 kcal/day (male) / 1,200 kcal/day (female).
- Deficits are capped at 20% of maintenance — no crash-diet targets, ever.
- Red-flag screening: an underweight BMI (< 18.5) or age under 18 replaces any
  deficit with a maintenance plan plus supportive copy encouraging a doctor or
  registered dietitian.
- A standing "general wellness, not medical advice" disclaimer appears on the
  landing and summary screens.

## Project layout

```
src/
  lib/macros.ts        # BMR, TDEE, targets, safety clamps (pure + tested)
  lib/macros.test.ts
  lib/units.ts         # imperial ↔ metric conversion
  lib/db.ts            # Prisma client singleton
  auth.ts              # Auth.js config (credentials provider)
  app/                 # landing, signin/signup, onboarding, summary
  app/api/             # signup, onboarding (computes + stores targets)
  components/          # onboarding wizard, auth form, disclaimer
prisma/schema.prisma   # users, profiles, macro_targets
```
