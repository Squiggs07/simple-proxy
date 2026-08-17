from pathlib import Path


def replace(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old!r}")
    p.write_text(text.replace(old, new, 1))


replace(
    "src/lib/startHerePlan.ts",
    'import { EXERCISES, mealMacros, type Exercise, type Meal } from "@/lib/startHereCatalog";\n',
    'import { mealMacros, type Exercise, type Meal } from "@/lib/startHereCatalog";\nimport { ALL_EXERCISES as EXERCISES } from "@/lib/startHereExerciseLibrary";\n',
)
replace(
    "src/lib/startHerePlan.ts",
    '  const rotation = variant === "B" && catalogIndex % 2 === 1 ? 2 : 0;\n',
    '  const rotation = variant === "B" ? (catalogIndex % 2 === 1 ? 2 : 0) : (catalogIndex % 2 === 0 ? 2 : 0);\n',
)
replace(
    "src/lib/startHereBehavior.ts",
    'import { EXERCISES, type Exercise, type Meal } from "@/lib/startHereCatalog";\n',
    'import type { Exercise, Meal } from "@/lib/startHereCatalog";\nimport { ALL_EXERCISES as EXERCISES } from "@/lib/startHereExerciseLibrary";\n',
)
