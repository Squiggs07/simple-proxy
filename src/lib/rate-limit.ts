/**
 * Minimal in-memory sliding-window rate limiter for the auth endpoints.
 * Good enough for the single-instance deployments of this phase; swap for a
 * shared store (Redis/Upstash) if the app ever runs on multiple instances.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
