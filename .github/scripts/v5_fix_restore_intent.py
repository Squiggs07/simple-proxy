from pathlib import Path

path = Path("src/lib/startHereWeekCoach.ts")
text = path.read_text()
old = '''  const text = raw.trim().toLowerCase().replace(/[’]/g, "'");
  if (!text || !trainingScheduleContext(text)) return null;'''
new = '''  const text = raw.trim().toLowerCase().replace(/[’]/g, "'");
  const restoreIntent = /restore (?:my )?(?:normal )?schedule(?: this week)?|clear (?:my )?(?:week|weekly) (?:changes|adjustments)|undo (?:my )?(?:week|weekly) schedule/.test(text);
  if (!text || (!trainingScheduleContext(text) && !restoreIntent)) return null;'''
if old not in text:
    raise SystemExit("week schedule restore gate not found")
path.write_text(text.replace(old, new, 1))
