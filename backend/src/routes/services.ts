import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sql from "../db/client.js";
import { getCache, setCache } from "../cache/redis.js";

const services = new Hono();

/**
 * GET /api/services
 *
 * Returns all services in the system
 */
services.get("/", async (c) => {
  const cacheKey = "cache:services:list";

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
        repository_url,
        created_at
      FROM services
      ORDER BY name ASC
    `;

    // Cache for 60 seconds
    await setCache(cacheKey, results, 60);

    return c.json({
      data: results,
      count: results.length,
      cached: false,
    });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    throw new HTTPException(500, { message: "Failed to fetch services" });
  }
});

export default services;
