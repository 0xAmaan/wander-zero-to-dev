import postgres from "postgres";

/**
 * PostgreSQL client using Postgres.js
 *
 * Supports connection via:
 * - DATABASE_URL environment variable
 * - Standard PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT env vars
 *
 * Connection pooling is handled automatically with max 10 connections
 */

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "wander"}:${process.env.POSTGRES_PASSWORD || "wander123"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || "5432"}/${process.env.POSTGRES_DB || "wander_dev"}`;

const sql = postgres(connectionString, {
  max: 10, // Max connections in pool
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Timeout for initial connection
  onnotice: () => {}, // Silence NOTICE messages
  transform: {
    undefined: null, // Transform undefined to null in queries
  },
});

/**
 * Test database connectivity
 * @returns Promise<boolean> - true if connected, throws error otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  const start = Date.now();
  await sql`SELECT 1 as test`;
  const latency = Date.now() - start;
  console.log(`✓ Database connected (${latency}ms)`);
  return true;
};

/**
 * Gracefully close all database connections
 * @param timeout - Max time to wait for pending queries (seconds)
 */
export const closeConnection = async (timeout = 5): Promise<void> => {
  await sql.end({ timeout });
  console.log("✓ Database connections closed");
};

export default sql;
