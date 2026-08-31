import { createClient, type RedisClientType } from "redis";

/**
 * Fixed-window rate limiter with a Redis backend for multi-instance
 * deployments (roadmap 2.11). Falls back to the in-memory limiter whenever
 * REDIS_URL is not set or Redis is unreachable — behavior degrades to
 * per-process throttling instead of failing requests.
 */

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  if (memoryBuckets.size > 10_000) {
    for (const [k, b] of memoryBuckets) {
      if (b.resetAt <= now) memoryBuckets.delete(k);
    }
  }
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

let redis: RedisClientType | null = null;
let redisFailed = false;

async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url || redisFailed) return null;
  if (redis) return redis;
  try {
    redis = createClient({ url });
    redis.on("error", () => {
      // Connection issues degrade to the in-memory limiter.
      redisFailed = true;
    });
    await redis.connect();
    return redis;
  } catch {
    redisFailed = true;
    redis = null;
    return null;
  }
}

export interface RateLimiter {
  (key: string): Promise<boolean>;
}

export function createRateLimiter(options: { windowMs: number; max: number }): RateLimiter {
  let namespace = Math.random().toString(36).slice(2, 8);

  return async (key: string): Promise<boolean> => {
    try {
      const client = await getRedis();
      if (client?.isReady) {
        const windowSec = Math.ceil(options.windowMs / 1000);
        const redisKey = `rl:${namespace}:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
        const count = await client.incr(redisKey);
        if (count === 1) await client.expire(redisKey, windowSec);
        return count <= options.max;
      }
    } catch {
      redisFailed = true; // degrade to memory for subsequent calls
    }
    return memoryLimit(key, options.windowMs, options.max);
  };
}

/** Best-effort client IP from the proxy headers, falling back to "unknown". */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"
  );
}

/**
 * Clears module-level limiter state (Redis client + memory buckets).
 * For tests only.
 */
export function _resetRateLimiterState(): void {
  const r = redis as unknown as { disconnect?: () => Promise<void> } | null;
  if (r?.disconnect) void r.disconnect().catch(() => {});
  redis = null;
  redisFailed = false;
  memoryBuckets.clear();
}
