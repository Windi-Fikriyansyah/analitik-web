/**
 * Rate limiting for the /api/track ingestion endpoint.
 *
 * - If UPSTASH_REDIS_REST_URL / TOKEN are set, uses a Redis fixed-window
 *   counter via the Upstash REST API (works correctly across multiple
 *   serverless instances - recommended for production).
 * - Otherwise falls back to an in-memory Map (fine for MVP / a single
 *   long-running process, NOT correct across multiple instances/regions).
 */

const MAX = Number(process.env.TRACK_RATE_LIMIT_MAX ?? 120);
const WINDOW_SECONDS = Number(process.env.TRACK_RATE_LIMIT_WINDOW_SECONDS ?? 60);

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type RateLimitResult = { allowed: boolean; remaining: number };

// ---- In-memory fallback ----------------------------------------------
type Bucket = { count: number; resetAt: number };
const memoryStore = new Map<string, Bucket>();

function memoryRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: MAX - 1 };
  }

  if (existing.count >= MAX) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: MAX - existing.count };
}

// Periodic cleanup so the Map doesn't grow unbounded on long-lived processes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) memoryStore.delete(key);
  }
}, 60_000).unref?.();

// ---- Upstash Redis-backed limiter --------------------------------------
async function redisRateLimit(key: string): Promise<RateLimitResult> {
  // INCR the key, and set an expiry only the first time it's created.
  const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: 'no-store',
  });
  const incrJson = (await incrRes.json()) as { result: number };
  const count = incrJson.result;

  if (count === 1) {
    await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${WINDOW_SECONDS}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    });
  }

  if (count > MAX) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: MAX - count };
}

/**
 * @param identifier a key combining tenant + client, e.g. `${site_id}:${ip}`
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `ratelimit:track:${identifier}`;

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      return await redisRateLimit(key);
    } catch {
      // Redis unreachable - fail open to in-memory rather than dropping
      // legitimate traffic.
      return memoryRateLimit(key);
    }
  }

  return memoryRateLimit(key);
}
