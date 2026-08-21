/**
 * MCAD Client-side Cache Manager
 * Provides fast in-memory and sessionStorage caching with TTL (Time To Live).
 */

const memoryCache = new Map<string, { data: any; expiry: number }>();

export const CacheKeys = {
  POLES: 'mcad_cache_poles',
  BIRTHDAYS: 'mcad_cache_birthdays',
  TRAINING_MODULES: 'mcad_cache_training_modules',
  STATS: 'mcad_cache_stats',
  EVENTS: 'mcad_cache_events'
};

export const CacheTTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 10 * 60 * 1000,    // 10 minutes
  LONG: 30 * 60 * 1000       // 30 minutes
};

/**
 * Get cached data if valid and not expired
 */
export function getCachedItem<T>(key: string): T | null {
  const now = Date.now();

  // 1. Check memory cache first
  const mem = memoryCache.get(key);
  if (mem && mem.expiry > now) {
    return mem.data as T;
  }

  // 2. Check sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expiry && parsed.expiry > now) {
          // Restore to memory cache
          memoryCache.set(key, parsed);
          return parsed.data as T;
        } else {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Storage error fallback
    }
  }

  return null;
}

/**
 * Set cached data with TTL
 */
export function setCachedItem<T>(key: string, data: T, ttlMs: number = CacheTTL.MEDIUM): void {
  const now = Date.now();
  const entry = { data, expiry: now + ttlMs };

  // Save to memory
  memoryCache.set(key, entry);

  // Save to sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // Quota exceeded fallback
    }
  }
}

/**
 * Invalidate a specific cache key or all cache keys matching a prefix
 */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('mcad_cache_')) {
            sessionStorage.removeItem(k);
          }
        });
      } catch (e) {}
    }
    return;
  }

  // Clear memory
  memoryCache.forEach((_, k) => {
    if (k.startsWith(keyOrPrefix)) {
      memoryCache.delete(k);
    }
  });

  // Clear sessionStorage
  if (typeof window !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(keyOrPrefix)) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (e) {}
  }
}

/**
 * Helper to fetch with caching: returns cached data immediately if available,
 * or fetches from network and updates cache.
 */
export async function fetchWithCache<T>(
  key: string,
  url: string,
  ttlMs: number = CacheTTL.MEDIUM
): Promise<T> {
  const cached = getCachedItem<T>(key);
  if (cached !== null) {
    return cached;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const data = await res.json();
  setCachedItem(key, data, ttlMs);
  return data;
}
