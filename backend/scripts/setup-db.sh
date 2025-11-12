#!/bin/bash

# Local Database Setup Script
# Creates the PostgreSQL user and database for local development

set -e

echo ""
echo "═══════════════════════════════════════════════"
echo "  Local Database Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Database credentials
DB_USER="wander"
DB_PASSWORD="wander123"
DB_NAME="wander_dev"

echo "→ Creating PostgreSQL user and database..."
echo ""

# Create user and database using psql
# Note: This connects to the default 'postgres' database as the current user
psql postgres <<EOF
-- Drop database if it exists (for clean setup)
DROP DATABASE IF EXISTS ${DB_NAME};

-- Drop user if exists
DROP USER IF EXISTS ${DB_USER};

-- Create user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Create database
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the new database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};

EOF

echo ""
echo "✓ Database setup complete!"
echo ""
echo "  User:     ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo "  Database: ${DB_NAME}"
echo ""
echo "Next steps:"
echo "  1. Run 'bun run migrate' to create tables"
echo "  2. Run 'bun run dev' to start the server"
echo ""
