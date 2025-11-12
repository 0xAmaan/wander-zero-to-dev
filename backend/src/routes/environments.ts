import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sql from "../db/client.js";
import { getCache, setCache } from "../cache/redis.js";

const environments = new Hono();

/**
 * GET /api/environments
 *
 * Returns all environments in the system
 */
environments.get("/", async (c) => {
  const cacheKey = "cache:environments:list";

  try {
    // Try cache first
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      return c.json({
        data: cached,
        count: cached.length,
        cached: true,
      });
    }

    // Query database
    const results = await sql`
      SELECT
        id,
        name,
        description,
        created_at
      FROM environments
      ORDER BY
        CASE name
          WHEN 'development' THEN 1
          WHEN 'staging' THEN 2
          WHEN 'production' THEN 3
          ELSE 4
        END
    `;

    // Cache for 60 seconds
    await setCache(cacheKey, results, 60);

    return c.json({
      data: results,
      count: results.length,
      cached: false,
    });
  } catch (error: any) {
    console.error("Error fetching environments:", error);
    throw new HTTPException(500, { message: "Failed to fetch environments" });
  }
});

export default environments;
