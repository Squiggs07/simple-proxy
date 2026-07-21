/**
 * Dietary exclusions are stored as a JSON string array so free-text entries
 * containing commas survive a round trip. Older rows may hold the previous
 * comma-separated format; parse both.
 */

export function serializeExclusions(items: string[]): string {
  return JSON.stringify(items.map((s) => s.trim()).filter(Boolean));
}

export function parseExclusions(stored: string): string[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
  } catch {
    // Fall through to legacy comma-separated format.
  }
  return stored
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
