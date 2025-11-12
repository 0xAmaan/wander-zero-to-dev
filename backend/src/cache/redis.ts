import { createClient, RedisClientType } from "redis";

/**
 * Redis client for caching
 *
 * Supports connection via:
 * - REDIS_URL environment variable
 * - Default: redis://localhost:6379
 */

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff with max 3 seconds
      const delay = Math.min(retries * 50, 3000);
      console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  },
});

// Event listeners for connection lifecycle
client.on("error", (err) => {
  console.error("Redis Client Error:", err.message);
});

client.on("connect", () => {
  console.log("→ Connecting to Redis...");
});

client.on("ready", () => {
  console.log("✓ Redis client ready");
});

client.on("reconnecting", () => {
  console.log("→ Redis reconnecting...");
});

client.on("end", () => {
  console.log("✓ Redis connection closed");
});

/**
 * Connect to Redis
 */
export const connectRedis = async (): Promise<void> => {
  if (!client.isOpen) {
    await client.connect();
  }
};

/**
 * Test Redis connectivity and measure latency
 * @returns Promise<{ connected: boolean, latency: number }>
 */
export const testRedisConnection = async (): Promise<{
  connected: boolean;
  latency: number;
}> => {
  const start = Date.now();
  await client.ping();
  const latency = Date.now() - start;
  return { connected: true, latency };
};

/**
 * Get value from cache
 * @param key - Cache key
 * @returns Cached value (parsed JSON) or null if not found
 */
export const getCache = async <T = any>(key: string): Promise<T | null> => {
  const value = await client.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    // If not JSON, return as-is
    return value as T;
  }
};

/**
 * Set value in cache with optional TTL
 * @param key - Cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttlSeconds - Time to live in seconds (default: 60)
 */
export const setCache = async (
  key: string,
  value: any,
  ttlSeconds = 60,
): Promise<void> => {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  if (ttlSeconds > 0) {
    await client.set(key, serialized, { EX: ttlSeconds });
  } else {
    await client.set(key, serialized);
  }
};

/**
 * Delete one or more keys from cache
 * @param keys - Single key or array of keys to delete
 * @returns Number of keys deleted
 */
export const deleteCache = async (keys: string | string[]): Promise<number> => {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  return await client.del(keyArray);
};

/**
 * Clear all keys matching a pattern
 * @param pattern - Pattern to match (e.g., "cache:deployments:*")
 * @returns Number of keys deleted
 */
export const clearCachePattern = async (pattern: string): Promise<number> => {
  const keys = await client.keys(pattern);
  if (keys.length === 0) return 0;
  return await client.del(keys);
};

/**
 * Clear ALL cache (use with caution!)
 * @returns true if successful
 */
export const clearAllCache = async (): Promise<boolean> => {
  await client.flushDb();
  return true;
};

/**
 * Check if a key exists in cache
 * @param key - Cache key
 * @returns true if key exists
 */
export const hasCache = async (key: string): Promise<boolean> => {
  const exists = await client.exists(key);
  return exists === 1;
};

/**
 * Get remaining TTL for a key
 * @param key - Cache key
 * @returns TTL in seconds, or -1 if no TTL, -2 if key doesn't exist
 */
export const getCacheTTL = async (key: string): Promise<number> => {
  return await client.ttl(key);
};

/**
 * Gracefully close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (client.isOpen) {
    await client.quit();
  }
};

/**
 * Force close Redis connection (for emergencies)
 */
export const destroyRedis = async (): Promise<void> => {
  await client.disconnect();
};

export default client;
