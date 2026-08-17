/**
 * Minimal in-memory sliding-window limiter for early-stage API protection.
 * It is intentionally simple for this prototype. Before a larger public launch,
 * replace it with a shared durable limiter so limits hold across all instances.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
