from pathlib import Path

path = Path(".github/scripts/adaptive_v3_integrate.py")
text = path.read_text()

old_import = 'import type { AppState } from "@/lib/startHereModels";\\n'
new_import = 'import type { AppState, Equipment } from "@/lib/startHereModels";\\n'
if old_import in text:
    text = text.replace(old_import, new_import)
elif new_import not in text:
    raise SystemExit("Coach import matcher was not found in integration script")

old_note = '''            ? `${rotationNote} Your logged performance drives the progression cues instead of guessing loads.`'''
new_note = '''            ? `${rotationNote} ${hasBaseline ? "Your strength baseline and logged performance drive the progression cues instead of guessing loads." : "Your logged performance drives the progression cues instead of guessing loads."}`'''
if old_note not in text:
    raise SystemExit("Experienced baseline note matcher was not found in integration script")
text = text.replace(old_note, new_note, 1)

path.write_text(text)
