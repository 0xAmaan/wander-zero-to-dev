import { serve } from "@hono/node-server";
import app from "./app.js";
import { testConnection, closeConnection } from "./db/client.js";
import {
  connectRedis,
  testRedisConnection,
  closeRedis,
} from "./cache/redis.js";

const PORT = parseInt(process.env.API_PORT || "8080", 10);

/**
 * Initialize connections to external services
 */
const initializeServices = async (): Promise<void> => {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Wander API - Initialization");
  console.log("═══════════════════════════════════════════════\n");

  try {
    // Connect to PostgreSQL
    console.log("→ Testing PostgreSQL connection...");
    await testConnection();

    // Connect to Redis
    console.log("→ Connecting to Redis...");
    await connectRedis();
    const redisHealth = await testRedisConnection();
    console.log(`✓ Redis connected (${redisHealth.latency}ms)`);

    console.log("\n✓ All services initialized successfully\n");
  } catch (error: any) {
    console.error("\n✗ Service initialization failed:");
    console.error(error.message);
    console.error("\nPlease ensure PostgreSQL and Redis are running.");
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n\n→ Received ${signal}, shutting down gracefully...`);

  try {
    // Close Redis connection
    await closeRedis();

    // Close PostgreSQL connection
    await closeConnection();

    console.log("✓ All connections closed");
    process.exit(0);
  } catch (error: any) {
    console.error("✗ Error during shutdown:", error.message);
    process.exit(1);
  }
};

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  // Initialize external services first
  await initializeServices();

  // Start HTTP server
  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log("═══════════════════════════════════════════════");
      console.log(`  ✓ Server running on http://localhost:${info.port}`);
      console.log("═══════════════════════════════════════════════\n");
    },
  );

  // Setup graceful shutdown handlers
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

// Start the application
startServer().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
