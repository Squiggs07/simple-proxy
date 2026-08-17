# Handoff: "Start Here" Fitness & Nutrition App

Paste this entire document into any AI assistant to give it full context on
this project. It describes what the app is, where the code lives, how it's
built, what's finished, and what to do next.

---

## 1. What this project is

A mobile-first web app (installable as a PWA) for people who want to get in
shape and eat better but are intimidated and don't know where to start. Core
philosophy: **remove decisions instead of adding features**. If a screen asks
the user to make a decision they don't have the knowledge to make, that
screen is broken. Default everything, explain in plain language, never
require jargon (users never need to know what "TDEE" or "macros" mean).

The differentiator: competitors make users log and decide; this app asks five
friendly questions and then tells them exactly what to eat, with every number
computed from **real food data (USDA), never guessed by an AI**.

## 2. Where the code lives

- GitHub repo: `Squiggs07/simple-proxy`
- Branch: `claude/fitness-nutrition-app-spec-9nto0c` (open PR #1 targets `dev`)
- App directory: `start-here/` (the repo root contains an unrelated legacy
  proxy project — do not touch it; all work happens inside `start-here/`)

## 3. Tech stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4 — mobile-first
- **Auth.js / NextAuth v5** — email + password (credentials provider, JWT
  sessions, bcryptjs hashing, `trustHost: true`)
- **Prisma 6 + PostgreSQL** (was SQLite; migrated for deployability. Works
  with Supabase, Neon, or local Postgres)
- **@anthropic-ai/sdk** — optional LLM meal generation, server-side only,
  using structured outputs (`messages.parse` + zod schema)
- **Vitest** — 60 unit tests, all passing. `npm test`
- PWA: `src/app/manifest.ts`, icons in `public/`, apple-touch-icon

## 4. What is built and verified (all four phases of the v1 spec)

### Phase 1 — Onboarding + macro targets
- One-question-per-screen wizard (`src/components/OnboardingWizard.tsx`):
  goal → basic stats (imperial/metric toggle) → activity lifestyle →
  skippable food exclusions → meal priority. Sensible defaults everywhere;
  returning users get saved answers prefilled.
- Macro math in `src/lib/macros.ts` (pure, tested): Mifflin-St Jeor BMR ×
  activity factor; goal adjustments −15% (lose fat) / +10% (build muscle) /
  0 (recomp, habits); protein 1.6–2.0 g/kg capped at 35% of calories; fat
  30%; carbs remainder.
- **Hard safety guardrails (non-negotiable, unit-tested)**: calorie floors
  1,500 kcal (male) / 1,200 kcal (female); deficit capped at 20%; red-flag
  screening — underweight BMI (<18.5) or age under 18 silently replaces any
  deficit with a maintenance plan plus supportive "talk to a doctor or
  registered dietitian" copy. Standing "not medical advice" disclaimer.
- Rate-limited signup/sign-in (in-memory limiter, `src/lib/rate-limit.ts`).

### Phase 2 — Food data layer
- `src/lib/seed-foods.ts`: ~55 common foods with verified USDA per-100g
  macros; loaded by `npm run db:seed`. A data-integrity test validates every
  food's calories against its own macros (Atwater 4/4/9) so typos fail CI.
- `src/lib/fdc.ts`: USDA FoodData Central search client (Foundation +
  SR Legacy only), fails soft — any API problem returns no results and the
  local table carries on. Optional `FDC_API_KEY` (DEMO_KEY fallback).
- `src/lib/food.ts`: `findFood(name)` resolves local cache → seed → USDA
  (caching hits); `computeMealMacros(items)` is the pure function every
  meal's numbers pass through.

### Phase 3 — Meal engine ("LLM proposes, backend verifies")
- `src/lib/meal-engine/`: prompt building (`prompt.ts` — safety rules baked
  into the system prompt: never very-low-calorie plans, detoxes, fasting as
  weight loss, or good/bad food moralizing), LLM proposer
  (`llm-proposer.ts` — returns null on ANY failure so templates take over),
  deterministic template library (`templates.ts` — ~20 meals built entirely
  from seed foods, filtered by exclusions, ranked by protein-per-calorie
  fit to the budget), verification loop (`generate.ts` — every ingredient
  must resolve in the food DB, exclusions re-checked mechanically, uniform
  scaling onto slot budgets, macros computed from DB records).
- Slot budgets: 25/35/30/10% of daily calories across
  breakfast/lunch/dinner/snack.
- UI `/plan`: day totals vs targets, meal cards with "why this fits",
  per-ingredient grams + kcal + protein detail, "Swap this meal",
  ± portion adjuster (20% steps, clamped 0.6–1.6).
- Verified: generated days land within ~1% of the calorie target.

### Phase 4 — Progress & habit loop
- One-tap "I ate this" on each meal card; one-number weigh-ins.
- `src/lib/progress.ts` (pure, tested): weight trend = exponential moving
  average (alpha 0.3) because daily scale readings swing ~2 kg on water —
  the UI shows the trend line as the data, raw readings as faded dots
  ("trust the line, not the dots").
- Weekly outlook (days-logged dots — intentionally NOT a breakable streak),
  monthly summaries (weight change, days logged, meals-eaten %).
- Gentle target recomputation: when trend weight moves ≥1 kg from profile
  weight, targets recompute through the same safety-clamped math with a
  friendly note. Never reacts to a single reading. (Verified live:
  2,139 → 2,124 kcal on the 8th weigh-in of a losing trend.)

## 5. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase "Transaction pooler" URI for serverless) |
| `AUTH_SECRET` | yes | any long random string (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | no | enables Claude meal generation; **app fully works without it** (template fallback). Requires API credits (separate from a Claude.ai subscription) |
| `MEAL_MODEL` | no | default `claude-opus-4-8` |
| `FDC_API_KEY` | no | live USDA lookups; DEMO_KEY + seed table otherwise |

Never expose secrets to the client; all AI calls are server-side only.

## 6. How to run locally

Requires Node 20+ and any PostgreSQL.

```bash
git clone -b claude/fitness-nutrition-app-spec-9nto0c https://github.com/Squiggs07/simple-proxy.git
cd simple-proxy/start-here
npm install
cp .env.example .env    # set DATABASE_URL and AUTH_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev             # http://localhost:3000
```

`npm test` runs the 60 unit tests. `npm run lint` and `npm run build` are clean.

## 7. Deployment (the immediate next task)

Target: Vercel + Supabase (both free tiers).

1. Supabase: create project → Connect → copy the **Transaction pooler**
   connection string.
2. Vercel: import the GitHub repo, **set Root Directory to `start-here`**
   (critical, most-missed step). The `vercel-build` script runs
   `prisma migrate deploy` automatically.
3. Add env vars from §5.
4. Seed once from a local machine:
   `DATABASE_URL="<supabase url>" npm run db:seed`
5. Open the deployed URL on a phone → Add to Home Screen (PWA installs
   like a native app: icon, standalone window).

Current status: the owner has a valid Anthropic API key but **no API
credits**, so the LLM path returns 400 and the app correctly falls back to
templates. Either add ~$5 credits at console.anthropic.com (a generated
day-plan costs ~1–2 cents) or skip AI meals entirely.

## 8. Known limitations / next steps (in priority order)

1. **Deploy** (steps above) and put it in front of 3 real users before
   building anything new — this is the spec's own instruction.
2. Optional: add a free-tier LLM provider (e.g. Gemini) as a middle layer:
   Claude → free provider → templates. The proposer is one isolated module
   (`llm-proposer.ts`); everything else is provider-independent.
3. Vegetarian/vegan + very high protein targets can't be fully met by the
   offline template library (~137g achieved vs 170g target in testing);
   the LLM path does better. The UI shows shortfalls honestly.
4. Rate limiter is in-memory (fine single-instance; swap for
   Redis/Upstash if scaling out).
5. Phase 5 (workouts) is deliberately NOT started — spec says only after
   nutrition is loved by real users. Also on the someday list: grocery
   lists, barcode scanning, wearables, native app wrap
   (Capacitor/React Native — the whole backend carries over).

## 9. Non-negotiable design rules (do not violate when extending)

1. **Nutrition numbers never come from an LLM.** The model proposes
   ingredients + quantities only; the backend computes all macros from the
   food database and discards unverifiable proposals.
2. **Safety clamps are hard stops**: calorie floors, deficit cap, red-flag
   maintenance override. They are unit-tested; keep them that way.
3. **No shame mechanics**: no breakable streaks, no guilt copy, no
   moralizing food. Encouraging and neutral, always.
4. **Plain language everywhere**; explanations available (collapsible),
   never forced.
5. **Weight decisions run on the smoothed trend**, never a single reading.
6. Keep the app minimal — every extra choice is a chance for an
   intimidated user to close the app.

## 10. Test coverage map (60 tests)

- `src/lib/macros.test.ts` — BMR formula, activity factors, goal
  adjustments, floors, deficit cap, red-flag overrides, macro split
- `src/lib/exclusions.test.ts` — JSON round-trip incl. commas, legacy format
- `src/lib/food.test.ts` — meal computation, seed integrity (Atwater +
  ranges + uniqueness), match ranking, FDC normalization
- `src/lib/meal-engine/meal-engine.test.ts` — budget split, scaling +
  clamps, template resolvability (every ingredient must exist in seeds),
  vegan coverage per slot, exclusion enforcement (incl. "peanut butter is
  not dairy"), protein-density ranking, prompt safety content
- `src/lib/progress.test.ts` — EWMA smoothing/convergence, weekly change,
  week outlook, monthly aggregation, recompute threshold
