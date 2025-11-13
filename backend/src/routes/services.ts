import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sql from "../db/client.js";
import { getCache, setCache, clearCachePattern } from "../cache/redis.js";

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

/**
 * POST /api/services
 *
 * Create a new service
 */
services.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, repository_url } = body;

    if (!name) {
      throw new HTTPException(400, { message: "Service name is required" });
    }

    const result = await sql`
      INSERT INTO services (name, description, repository_url)
      VALUES (${name}, ${description || null}, ${repository_url || null})
      RETURNING *
    `;

    await clearCachePattern("cache:services:*");

    return c.json(
      { data: result[0], message: "Service created successfully" },
      201,
    );
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error("Error creating service:", error);
    throw new HTTPException(500, { message: "Failed to create service" });
  }
});

/**
 * PATCH /api/services/:id
 *
 * Update a service
 */
services.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);

  if (isNaN(id)) {
    throw new HTTPException(400, { message: "Invalid service ID" });
  }

  try {
    const body = await c.req.json();

    const existing = await sql`SELECT id FROM services WHERE id = ${id}`;
    if (existing.length === 0) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.repository_url !== undefined)
      updates.repository_url = body.repository_url;

    if (Object.keys(updates).length === 0) {
      throw new HTTPException(400, { message: "No fields to update" });
    }

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

    const result = await sql.unsafe(
      `UPDATE services SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );

    await clearCachePattern("cache:services:*");

    return c.json({ data: result[0], message: "Service updated successfully" });
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error("Error updating service:", error);
    throw new HTTPException(500, { message: "Failed to update service" });
  }
});

/**
 * DELETE /api/services/:id
 *
 * Delete a service
 */
services.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);

  if (isNaN(id)) {
    throw new HTTPException(400, { message: "Invalid service ID" });
  }

  try {
    const result = await sql`
      DELETE FROM services WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    await clearCachePattern("cache:services:*");

    return c.json({
      message: "Service deleted successfully",
      id: result[0].id,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error("Error deleting service:", error);
    throw new HTTPException(500, { message: "Failed to delete service" });
  }
});

export default services;
