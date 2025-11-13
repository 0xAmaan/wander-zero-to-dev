import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";

/**
 * Main Hono application
 *
 * Configures middleware stack and API routes
 */

const app = new Hono();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS - Allow requests from frontend
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000", // Next.js dev server (local)
      "http://localhost:5173", // Vite dev server
      "http://localhost:30000", // Next.js in Kubernetes (Kind NodePort)
    ],
    credentials: true,
  }),
);

// Request logger
app.use("*", logger);

// ============================================================================
// ROUTES
// ============================================================================

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "Wander API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      api: "/api/*",
    },
  });
});

// Import routes
import health from "./routes/health.js";
import deployments from "./routes/deployments.js";
import services from "./routes/services.js";
import environments from "./routes/environments.js";
import cache from "./routes/cache.js";
import docker from "./routes/docker.js";

// Mount routes
app.route("/health", health);
app.route("/api/deployments", deployments);
app.route("/api/services", services);
app.route("/api/environments", environments);
app.route("/api/cache", cache);
app.route("/api/docker", docker);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

export default app;
