import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { clearAllCache, clearCachePattern } from "../cache/redis.js";

const cache = new Hono();

/**
 * DELETE /api/cache
 *
 * Clear all cache or cache matching a pattern
 *
 * Query parameters:
 * - pattern: Optional pattern to match (e.g., "cache:deployments:*")
 *            If not provided, clears ALL cache
 */
cache.delete("/", async (c) => {
  const pattern = c.req.query("pattern");

  try {
    let deletedCount: number | boolean;

    if (pattern) {
      // Clear cache matching pattern
      deletedCount = await clearCachePattern(pattern);
      return c.json({
        message: `Cache cleared for pattern: ${pattern}`,
        deletedKeys: deletedCount,
      });
    } else {
      // Clear all cache
      deletedCount = await clearAllCache();
      return c.json({
        message: "All cache cleared successfully",
        success: true,
      });
    }
  } catch (error: any) {
    console.error("Error clearing cache:", error);
    throw new HTTPException(500, { message: "Failed to clear cache" });
  }
});

/**
 * GET /api/cache/stats
 *
 * Get cache statistics (for debugging/monitoring)
 */
cache.get("/stats", async (c) => {
  try {
    // This is a simple implementation
    // In production, you might want to track more metrics
    return c.json({
      message: "Cache stats endpoint",
      info: "Redis cache is active with 60s TTL on most keys",
      endpoints: {
        clear: "DELETE /api/cache",
        clearPattern: "DELETE /api/cache?pattern=cache:deployments:*",
      },
    });
  } catch (error: any) {
    console.error("Error fetching cache stats:", error);
    throw new HTTPException(500, { message: "Failed to fetch cache stats" });
  }
});

export default cache;
