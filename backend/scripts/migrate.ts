#!/usr/bin/env bun

/**
 * Database Migration Runner
 *
 * Runs database migrations and optionally seeds data
 * Usage:
 *   bun run scripts/migrate.ts           # Run migrations + seed
 *   bun run scripts/migrate.ts --no-seed # Run migrations only
 */

import { readFile } from "fs/promises";
import { join } from "path";
import sql, { testConnection, closeConnection } from "../src/db/client.js";

const MIGRATIONS_DIR = join(import.meta.dir, "../src/db/migrations");
const SEED_FILE = join(import.meta.dir, "../src/db/seed.sql");

const shouldSeed = !process.argv.includes("--no-seed");

const runMigration = async (
  filePath: string,
  description: string,
): Promise<void> => {
  console.log(`\n→ Running ${description}...`);
  const migrationSQL = await readFile(filePath, "utf-8");

  try {
    // Execute the entire migration file using postgres.js file method
    await sql.file(filePath);

    console.log(`✓ ${description} completed successfully`);
  } catch (error: any) {
    console.error(`✗ ${description} failed:`, error.message);
    throw error;
  }
};

const main = async (): Promise<void> => {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Database Migration Runner");
  console.log("═══════════════════════════════════════════════\n");

  try {
    // Step 1: Test database connection
    console.log("→ Testing database connection...");
    await testConnection();

    // Step 2: Run migrations (in order)
    const migrationFiles = ["001_initial.sql"];

    for (const file of migrationFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      await runMigration(filePath, `Migration: ${file}`);
    }

    // Step 3: Seed data (if requested)
    if (shouldSeed) {
      await runMigration(SEED_FILE, "Seed data");
    } else {
      console.log("\n⊘ Skipping seed data (--no-seed flag provided)");
    }

    // Step 4: Verify tables were created
    console.log("\n→ Verifying tables...");
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`✓ Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    // Step 5: Show record counts
    if (shouldSeed) {
      console.log("\n→ Record counts:");
      const [services] = await sql`SELECT COUNT(*)::int as count FROM services`;
      const [environments] =
        await sql`SELECT COUNT(*)::int as count FROM environments`;
      const [deployments] =
        await sql`SELECT COUNT(*)::int as count FROM deployments`;

      console.log(`  - services: ${services.count}`);
      console.log(`  - environments: ${environments.count}`);
      console.log(`  - deployments: ${deployments.count}`);
    }

    console.log("\n═══════════════════════════════════════════════");
    console.log("  ✓ Migration completed successfully!");
    console.log("═══════════════════════════════════════════════\n");
  } catch (error: any) {
    console.error("\n═══════════════════════════════════════════════");
    console.error("  ✗ Migration failed!");
    console.error("═══════════════════════════════════════════════");
    console.error("\nError:", error.message);

    if (error.code) {
      console.error("Code:", error.code);
    }

    if (error.detail) {
      console.error("Detail:", error.detail);
    }

    process.exit(1);
  } finally {
    // Always close the connection
    await closeConnection();
  }
};

// Run the migration
main();
