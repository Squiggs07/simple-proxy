# Start Here — fitness & nutrition, minus the overwhelm

An app for people who want to get in shape and eat better but are intimidated
and don't know where to start. It removes decisions instead of adding features:
answer a few friendly questions, get one safe, personalized daily target
explained in plain English.

**Current status: Phase 1** — auth, the one-question-per-screen onboarding,
server-side macro math with safety guardrails, and the summary screen.
Meals (Phases 2–3) are not built yet by design; see the build spec.

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

No secrets are ever exposed to the client. When the meal engine lands
(Phase 3), the Anthropic API key will live server-side only, same rule.

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
