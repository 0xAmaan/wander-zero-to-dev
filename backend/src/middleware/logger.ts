import { Context, Next } from "hono";

/**
 * Request logger middleware
 *
 * Logs HTTP requests with method, path, status code, and response time
 * Standard logging level - logs all requests and errors
 */
export const logger = async (c: Context, next: Next): Promise<void> => {
  const start = Date.now();
  const { method, path } = c.req;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Color-code by status
  const statusColor =
    status >= 500
      ? "\x1b[31m" // Red for 5xx
      : status >= 400
        ? "\x1b[33m" // Yellow for 4xx
        : status >= 300
          ? "\x1b[36m" // Cyan for 3xx
          : "\x1b[32m"; // Green for 2xx

  const reset = "\x1b[0m";

  console.log(
    `${method} ${path} ${statusColor}${status}${reset} - ${duration}ms`,
  );
};
