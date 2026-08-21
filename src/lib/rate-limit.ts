/**
 * Lightweight in-memory sliding window rate limiter
 */

interface RateLimitRecord {
  timestamps: number[];
}

const ipBuckets = new Map<string, RateLimitRecord>();

// Clean up stale buckets periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000; // 15 minutes
  ipBuckets.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((ts) => now - ts < maxAge);
    if (record.timestamps.length === 0) {
      ipBuckets.delete(key);
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  limit: number; // Max number of allowed requests
  windowMs: number; // Time window in milliseconds
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): { success: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let record = ipBuckets.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    ipBuckets.set(identifier, record);
  }

  // Keep only timestamps within the sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= options.limit) {
    const oldest = record.timestamps[0];
    const retryAfterMs = Math.max(0, options.windowMs - (now - oldest));
    return {
      success: false,
      remaining: 0,
      retryAfterMs
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: options.limit - record.timestamps.length,
    retryAfterMs: 0
  };
}

/**
 * Extract client IP from standard reverse proxy headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
