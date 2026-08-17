from pathlib import Path

path = Path(".github/scripts/adaptive_v3_integrate.py")
text = path.read_text()
old = 'import type { AppState } from \\"@/lib/startHereModels\\";'
new = 'import type { AppState, Equipment } from \\"@/lib/startHereModels\\";'
if old not in text:
    raise SystemExit("Coach import matcher was not found in integration script")
path.write_text(text.replace(old, new))
