# Start Here — Product Vision

## Product thesis

Start Here is an adaptive fitness, nutrition, and strength-training product for people who want to improve their health but feel intimidated, overwhelmed, inexperienced, older, or unsure where to begin.

**Advanced intelligence underneath. One simple next step on the surface.**

The product should remove decisions instead of adding features. If a screen asks a beginner to make a decision they do not yet have the knowledge to make, the product should recommend a safe default, explain it in plain language, and reveal deeper control only when the user asks for it.

The app should answer three questions every day:

1. What should I do today?
2. What should I eat today?
3. What should I change when this does not fit my life?

The long-term destination is not another calorie tracker, workout logger, or AI chat box. Start Here should become an adaptive health-and-fitness operating system that becomes different for each user while remaining simple on the surface.

## Audience

### Intimidated beginner

- Little or no fitness knowledge
- May not understand calories, protein, exercise selection, or program structure
- Wants direction rather than a library of choices
- Needs plain language and reassurance without being patronized
- Should be able to build a useful plan in a few minutes

### Older or low-confidence user

- May care more about strength, balance, independence, energy, and daily function than appearance
- Needs larger controls, predictable navigation, strong contrast, simple cues, and supported exercise options
- Should never need to understand gym jargon before starting

### Knowledgeable but busy user

- Understands calories, protein, training, cuts, bulks, and progression
- Wants direct control and fast natural-language changes
- Can reveal advanced detail without forcing it on everyone else

## Visual direction

Use Apple Health as inspiration for information hierarchy, progressive disclosure, restraint, large readable page titles, calm cards, trends, and native-mobile polish. Do not clone Apple Health.

The product should feel warm, premium, calm, adult, trustworthy, inviting, and sharp — never hardcore or intimidating.

### Palette

- Main background: `#F7F4EE`
- Elevated cream: `#FCFAF6`
- Cards: `#FFFFFF`
- Primary evergreen: `#17483F`
- Dark evergreen: `#123B34`
- Main text: `#1D2926`
- Secondary text: `#68736F`
- Sage surface: `#ECF3EE`
- Supporting sage: `#6E9084`
- Butter: `#E8E6A8`
- Peach: `#F5DED2`
- Lavender: `#EAE6F5`
- Soft blue: `#E7EFF5`
- Divider: `#E6E0D6`
- Success: `#4E806B`
- Warning: `#B47B3F`
- True error only: `#B75B59`

No dominant dark theme, neon gym styling, leaderboards, broken streaks, red calorie-overage states, or shame mechanics.

## Main information architecture

Default mobile navigation:

1. Today
2. Eat
3. Train
4. Progress
5. Coach

Profile/settings remain accessible from an avatar or settings control. Prep, Recovery, and Learn can be optional experiences rather than permanent tabs for every user.

## Onboarding

Do not open on an empty AI prompt. A new user needs simple scaffolding first.

1. **Welcome** — “Your plan can be simple.”
2. **Goal** — Lose fat and keep muscle; Build muscle gradually; Feel stronger and healthier; Maintain my weight; I’m not sure.
3. **Basic profile** — units, age, metabolic equation input, height, weight.
4. **Typical activity** — plain-language activity cards.
5. **Training availability** — realistic days, duration, equipment, experience, confidence.
6. **Food preferences** — lead with “What would you actually look forward to eating?” Collect positive preferences before restrictions.
7. **Dislikes and exclusions** — separate ordinary dislikes from never foods, allergies, vegetarian/vegan identity.
8. **Health and safety** — calm screening without diagnosis.
9. **Plan preview** — show starting estimates and explain they are adjustable.
10. **Building plan** — descriptive skeleton states with deterministic fallback; never an indefinite spinner.

Simple onboarding screens should fit on one mobile screen when reasonable. Split complex information into another calm step rather than shrinking text or forcing unnecessary scrolling.

## Today

Today is the emotional center of the app. It should answer:

> What is the easiest useful thing I can do next?

Show one dominant next step, then a restrained food summary, workout summary, gentle weekly rhythm, and a Coach shortcut. Protein may be more prominent than detailed macro breakdowns for beginners.

Never make Today a dense analytics dashboard.

## Eat

The meal system must distinguish:

- foods the user wants
- cuisines they like
- formats they like
- breakfast preference
- cooking-time limit
- budget
- variety/repetition preference
- ordinary dislikes
- hard exclusions/allergies

Positive preferences raise meal ranking. Ordinary dislikes lower it. Hard exclusions mechanically remove incompatible meals.

Meal cards should make actions obvious: I ate this, Swap, Smaller, Standard, Larger, Not for me.

The AI may understand intent and propose ingredients/quantities, but nutrition values always come from verified food records and deterministic calculation.

## Train

Training should be credible but beginner-friendly.

Inputs include goal, realistic days, session duration, equipment, experience, confidence, preferred/disliked exercises, muscle focus, age/accessibility needs, prior performance, and today-only constraints.

Principles:

- consistency before complexity
- major movement patterns
- full-body programs for low-frequency beginners
- clear splits only when appropriate
- gradual volume progression
- equipment substitutions
- no mandatory failure training
- previous performance visible during logging
- partial workouts may still be saved

A temporary request such as “I only have 20 minutes today” must not silently rewrite the ongoing program.

Older/nervous beginner mode should favor stable and supported movements, larger controls, simple cues, appropriate balance work, and language around capability and independence.

## Progress

Reduce anxiety. Raw weigh-ins are secondary; the smoothed trend is primary.

Copy: **Trust the line, not one dot.**

Do not change calorie targets from one reading. Review after sufficient trend data and suggest small, explained adjustments.

Do not collapse behavior into one judgmental score.

## Coach

Coach is the central differentiator. It is not customer support and not a finite command parser.

It should feel context-aware, sharp, warm, natural, concise by default, and capable of asking one useful follow-up question at a time.

Response pattern:

1. Recognize intent
2. Explain the important implication
3. Apply safe changes when enough context exists
4. State exactly what changed
5. Ask one follow-up if needed
6. Offer Undo

Examples it must understand naturally:

- “I want to be on a lean bulk eating healthy foods, not putting on fat, and gaining muscle.”
- “Help me change what I want to eat.”
- “Increase my calories by 150 and protein by 10 grams.”
- “Set my protein to 190 grams.”
- “Swap chicken for turkey in lunch.”
- “I hate lunges.”
- “I only have 20 minutes and no equipment today.”
- “From now on I can only train three days for 30 minutes.”
- “I’m 68 and have never been to a gym.”
- “Hide calories.”
- “Make the app simpler.”

When intent is understandable but parameters are missing, Coach clarifies. It should never return a dead-end “no setting found” response simply because the exact phrase was not anticipated.

## Agent contract

The language model interprets conversation and requests approved actions. It does not get unrestricted mutation rights.

A validated action layer should control:

- goal and pace
- calorie target adjustments
- protein target adjustments
- food preferences
- hard exclusions
- meal generation/swaps/ingredient swaps/portion changes
- cooking/budget/variety preferences
- training schedule and equipment
- workout generation
- exercise swaps
- today-only workout overrides
- UI tabs/detail/calorie visibility
- progress retrieval
- meal/weight/workout logging
- safety routing
- snapshot and undo

Every meaningful Coach change should create a before/after snapshot and remain undoable.

## Non-negotiable safety rules

1. Nutrition numbers never come from an LLM.
2. Safety clamps are enforced in deterministic code.
3. AI never diagnoses medical conditions.
4. AI cannot write arbitrary application code or unrestricted database values through Coach.
5. Hard exclusions are mechanical.
6. Temporary and ongoing scope remain separate.
7. No guilt, shame, food moralizing, breakable streaks, punishment, or “no excuses” language.
8. No exact body-composition or weight-change guarantees.
9. Normal app pages do not depend on AI rendering.
10. If Coach is unavailable, the current plan remains useful.
11. Never leave a user on an indefinite loading state.

## Existing deterministic nutrition rules to preserve

- Mifflin-St Jeor BMR
- activity multipliers 1.20 / 1.375 / 1.55 / 1.725
- max deficit 20%
- calorie floors: 1500 male equation / 1200 female equation
- under 18: no calorie-deficit plan
- BMI below 18.5: no calorie-deficit plan
- protein starting points roughly 2.0 g/kg for fat loss, 1.8 g/kg for muscle gain/recomp, 1.6 g/kg for maintenance/general training, capped so protein does not consume an unreasonable share of calories
- nutrition values computed from verified food records
- weight decisions based on a smoothed trend rather than one reading

## Build sequence

1. Preserve tested nutrition/safety/meal/progress logic.
2. Replace the product shell and onboarding UX.
3. Build the Today/Eat/Train/Progress/Coach navigation and local interaction model.
4. Extend profile/database schema for food desire, training preferences, UI preferences, and change history.
5. Add deterministic workout generation and logging.
6. Add structured Coach action layer and local fallback.
7. Connect a production LLM behind a protected server endpoint.
8. Add Supabase/production persistence as needed without exposing model keys.
9. Test with real beginners and older users before adding ecosystem features.
