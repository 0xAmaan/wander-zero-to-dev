import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sql from "../db/client.js";
import { getCache, setCache, clearCachePattern } from "../cache/redis.js";

const deployments = new Hono();

/**
 * GET /api/deployments
 *
 * Query parameters:
 * - environment: Filter by environment name (e.g., "production")
 * - status: Filter by status (e.g., "completed", "failed")
 * - limit: Number of results to return (default: 50, max: 100)
 */
deployments.get("/", async (c) => {
  const environment = c.req.query("environment");
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);

  // Generate cache key based on query params
  const cacheKey = `cache:deployments:list:${environment || "all"}:${status || "all"}:${limit}`;

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

    // Build query based on filters
    let results;

    if (environment && status) {
      // Both filters
      results = await sql`
        SELECT
          d.id,
          d.version,
          d.status,
          d.deployed_by,
          d.started_at,
          d.completed_at,
          d.error_message,
          d.metadata,
          s.name as service_name,
          s.description as service_description,
          e.name as environment_name
        FROM deployments d
        JOIN services s ON d.service_id = s.id
        JOIN environments e ON d.environment_id = e.id
        WHERE e.name = ${environment} AND d.status = ${status}
        ORDER BY d.started_at DESC
        LIMIT ${limit}
      `;
    } else if (environment) {
      // Environment filter only
      results = await sql`
        SELECT
          d.id,
          d.version,
          d.status,
          d.deployed_by,
          d.started_at,
          d.completed_at,
          d.error_message,
          d.metadata,
          s.name as service_name,
          s.description as service_description,
          e.name as environment_name
        FROM deployments d
        JOIN services s ON d.service_id = s.id
        JOIN environments e ON d.environment_id = e.id
        WHERE e.name = ${environment}
        ORDER BY d.started_at DESC
        LIMIT ${limit}
      `;
    } else if (status) {
      // Status filter only
      results = await sql`
        SELECT
          d.id,
          d.version,
          d.status,
          d.deployed_by,
          d.started_at,
          d.completed_at,
          d.error_message,
          d.metadata,
          s.name as service_name,
          s.description as service_description,
          e.name as environment_name
        FROM deployments d
        JOIN services s ON d.service_id = s.id
        JOIN environments e ON d.environment_id = e.id
        WHERE d.status = ${status}
        ORDER BY d.started_at DESC
        LIMIT ${limit}
      `;
    } else {
      // No filters
      results = await sql`
        SELECT
          d.id,
          d.version,
          d.status,
          d.deployed_by,
          d.started_at,
          d.completed_at,
          d.error_message,
          d.metadata,
          s.name as service_name,
          s.description as service_description,
          e.name as environment_name
        FROM deployments d
        JOIN services s ON d.service_id = s.id
        JOIN environments e ON d.environment_id = e.id
        ORDER BY d.started_at DESC
        LIMIT ${limit}
      `;
    }

    // Cache the results for 60 seconds
    await setCache(cacheKey, results, 60);

    return c.json({
      data: results,
      count: results.length,
      cached: false,
    });
  } catch (error: any) {
    console.error("Error fetching deployments:", error);
    throw new HTTPException(500, { message: "Failed to fetch deployments" });
  }
});

/**
 * GET /api/deployments/:id
 *
 * Get a single deployment by ID
 */
deployments.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);

  if (isNaN(id)) {
    throw new HTTPException(400, { message: "Invalid deployment ID" });
  }

  const cacheKey = `cache:deployments:${id}`;

  try {
    // Try cache first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return c.json({
        data: cached,
        cached: true,
      });
    }

    // Query database
    const results = await sql`
      SELECT
        d.id,
        d.service_id,
        d.environment_id,
        d.version,
        d.status,
        d.deployed_by,
        d.started_at,
        d.completed_at,
        d.error_message,
        d.metadata,
        s.name as service_name,
        s.description as service_description,
        s.repository_url,
        e.name as environment_name,
        e.description as environment_description
      FROM deployments d
      JOIN services s ON d.service_id = s.id
      JOIN environments e ON d.environment_id = e.id
      WHERE d.id = ${id}
    `;

    if (results.length === 0) {
      throw new HTTPException(404, { message: "Deployment not found" });
    }

    const deployment = results[0];

    // Cache for 60 seconds
    await setCache(cacheKey, deployment, 60);

    return c.json({
      data: deployment,
      cached: false,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error("Error fetching deployment:", error);
    throw new HTTPException(500, { message: "Failed to fetch deployment" });
  }
});

/**
 * POST /api/deployments
 *
 * Create a new deployment
 *
 * Request body:
 * {
 *   service_id: number,
 *   environment_id: number,
 *   version: string,
 *   deployed_by: string
 * }
 */
deployments.post("/", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    const { service_id, environment_id, version, deployed_by } = body;

    if (!service_id || !environment_id || !version || !deployed_by) {
      throw new HTTPException(400, {
        message:
          "Missing required fields: service_id, environment_id, version, deployed_by",
      });
    }

    // Validate service exists
    const service = await sql`
      SELECT id FROM services WHERE id = ${service_id}
    `;

    if (service.length === 0) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    // Validate environment exists
    const environment = await sql`
      SELECT id FROM environments WHERE id = ${environment_id}
    `;

    if (environment.length === 0) {
      throw new HTTPException(404, { message: "Environment not found" });
    }

    // Create deployment
    const result = await sql`
      INSERT INTO deployments (
        service_id,
        environment_id,
        version,
        status,
        deployed_by,
        started_at,
        metadata
      ) VALUES (
        ${service_id},
        ${environment_id},
        ${version},
        'in_progress',
        ${deployed_by},
        NOW(),
        ${body.metadata ? JSON.stringify(body.metadata) : "{}"}
      )
      RETURNING *
    `;

    const deployment = result[0];

    // Invalidate all deployment caches
    await clearCachePattern("cache:deployments:*");

    return c.json(
      {
        data: deployment,
        message: "Deployment created successfully",
      },
      201,
    );
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error("Error creating deployment:", error);
    throw new HTTPException(500, { message: "Failed to create deployment" });
  }
});

export default deployments;
