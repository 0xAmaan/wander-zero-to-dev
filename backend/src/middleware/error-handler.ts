import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Global error handler
 *
 * Catches all errors thrown in the application and returns
 * consistent JSON error responses
 */
export const errorHandler = (err: Error, c: Context) => {
  console.error("Error:", err);

  // Handle HTTP exceptions (e.g., 404, 401, etc.)
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  // Handle database errors
  if (err.message?.includes("relation") || err.message?.includes("column")) {
    return c.json(
      {
        error: "Database error",
        message: "An error occurred while accessing the database",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      500,
    );
  }

  // Handle validation errors
  if (err.message?.includes("Invalid") || err.message?.includes("required")) {
    return c.json(
      {
        error: "Validation error",
        message: err.message,
      },
      400,
    );
  }

  // Generic server error
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    500,
  );
};
