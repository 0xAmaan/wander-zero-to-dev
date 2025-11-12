import { Hono } from "hono";
import { testConnection } from "../db/client.js";
import { testRedisConnection } from "../cache/redis.js";

const health = new Hono();

/**
 * Health check endpoint
 * GET /health
 *
 * Returns service health status including:
 * - API status
 * - PostgreSQL connectivity and latency
 * - Redis connectivity and latency
 */
health.get("/", async (c) => {
  const timestamp = new Date().toISOString();

  try {
    // Test PostgreSQL connection
    const pgStart = Date.now();
    await testConnection();
    const pgLatency = Date.now() - pgStart;

    // Test Redis connection
    const redisHealth = await testRedisConnection();

    return c.json({
      status: "healthy",
      timestamp,
      services: {
        postgres: {
          connected: true,
          latency: pgLatency,
        },
        redis: {
          connected: redisHealth.connected,
          latency: redisHealth.latency,
        },
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error: any) {
    console.error("Health check failed:", error);

    return c.json(
      {
        status: "unhealthy",
        timestamp,
        error: error.message,
        services: {
          postgres: { connected: false },
          redis: { connected: false },
        },
      },
      503,
    );
  }
});

export default health;
