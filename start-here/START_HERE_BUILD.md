# Start Here — Current Build

## Product status

The root route (`/`) is the current mobile-first Start Here product. It is intentionally local-first so the full onboarding, daily plan, meals, workout logging, progress, Coach changes, and Undo remain usable without a database or AI provider.

The primary product rule is: **advanced intelligence underneath, one simple next step on the surface.**

## What is implemented

- Guided goal-first onboarding with Imperial or Metric units.
- Deterministic Mifflin–St Jeor calorie and protein targets with product safety guardrails.
- Today / Eat / Train / Progress / Coach navigation.
- Positive food-preference ranking, cooking-time/budget preferences, exact meal rejection, allergies/never-food mechanical exclusion, vegetarian and vegan starter meals.
- Deterministic Smaller / Standard / Larger meal portions and meal swaps.
- Grocery/prep view derived from the current meals.
- Workout builder using goal, available time, equipment, experience, confidence, age, exercise dislikes, and today-only overrides.
- Active workout logging with weight, reps, previous performance, set completion, rest timer, swaps, and partial completion.
- Weight logging, smoothed trend review, small progress adjustments, and a non-judgmental monthly summary.
- Coach action layer that can change real app state and preserve temporary-vs-ongoing scope.
- Undo for meaningful Coach changes.
- Optional semantic AI normalization before the deterministic Coach action layer.
- Local persistence and PWA metadata/icons.

## Coach architecture

The AI provider is optional. `src/app/api/start-here-coach/route.ts` can translate free-form user language into a concise canonical command, but it cannot directly mutate app state or invent nutrition values.

All actual changes still go through `src/lib/startHereCoach.ts` and the deterministic nutrition/planning functions. If the AI endpoint is unavailable or not configured, `src/lib/startHereCoachClient.ts` falls back to the original user text and the local deterministic Coach continues to work.

This separation is intentional: AI interprets language; code owns targets, nutrition, safety rules, and state mutation.

## Local development

From `start-here/`:

```bash
npm ci
npm run dev
```

Quality gate:

```bash
npx eslint src/components/StartHereAppV2.tsx src/components/ActiveWorkoutExperience.tsx src/components/BasicProfileFields.tsx src/components/TodayMealRow.tsx src/components/MealPortionControl.tsx src/components/WeightLogSheet.tsx src/components/MonthlySummarySheet.tsx src/lib/startHereEngine.ts src/lib/startHereModels.ts src/lib/startHereUnits.ts src/lib/startHereCatalog.ts src/lib/startHereMealLibrary.ts src/lib/startHerePlan.ts src/lib/startHereCoach.ts src/lib/startHereCoachClient.ts src/app/api/start-here-coach/route.ts
npm test
npm run build
```

The same checks run through `.github/workflows/start-here-ci.yml` on the `start-here/lovable-transfer` branch.

## Optional AI configuration

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` if semantic normalization is desired. The product works without it.

## Vercel

Use repository `Squiggs07/simple-proxy`, branch `start-here/lovable-transfer`, and set the Vercel **Root Directory** to:

```text
start-here
```

No database is required to preview the current root product experience. The existing legacy auth/database routes in the repository are not part of the current root-flow product and should only be enabled when intentionally migrated into the new architecture.

## Data model note

Body weight and workout loads are stored internally in kilograms; height is stored internally in centimeters. Imperial/Metric is a display/input preference. This keeps the calculation engine deterministic while allowing a normal US consumer experience.
