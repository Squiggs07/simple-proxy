from pathlib import Path

path = Path("src/lib/startHereWeekCoach.ts")
text = path.read_text()
old_gate = '''  const text = raw.trim().toLowerCase().replace(/[’]/g, "'");
  if (!text || !trainingScheduleContext(text)) return null;'''
new_gate = '''  const text = raw.trim().toLowerCase().replace(/[’]/g, "'");
  const restoreIntent = /restore (?:my )?(?:normal )?schedule(?: this week)?|clear (?:my )?(?:week|weekly) (?:changes|adjustments)|undo (?:my )?(?:week|weekly) schedule/.test(text);
  if (!text || (!trainingScheduleContext(text) && !restoreIntent)) return null;'''
if old_gate not in text:
    raise SystemExit("week schedule restore gate not found")
text = text.replace(old_gate, new_gate, 1)
old_scope = '''  if (scopeIsPermanent(text)) return null;'''
new_scope = '''  if (scopeIsPermanent(text) && !restoreIntent) return null;'''
if old_scope not in text:
    raise SystemExit("week schedule scope gate not found")
path.write_text(text.replace(old_scope, new_scope, 1))
