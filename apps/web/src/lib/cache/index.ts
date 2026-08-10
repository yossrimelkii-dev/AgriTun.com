import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

const CACHE_KEYS = {
  CATEGORY_TREE: 'categories:tree',
  PRIME_BADGE: (uid: string) => `badge:${uid}`,
  PRODUCT_LIST: (catId: string, page: number) => `products:${catId}:${page}`,
  SUPPLIER_STATS: (sid: string) => `supplier:stats:${sid}`,
  FEATURED_PRODUCTS: 'products:featured',
  ACTIVE_PROMOTIONS: 'promotions:active',
} as const;

export { CACHE_KEYS };

export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const client = getRedis();

  try {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis unavailable — fall through to direct fetch
  }

  const fresh = await fetchFn();

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(fresh));
  } catch {
    // Silently fail cache write — not critical
  }

  return fresh;
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // Silently fail
  }
}
