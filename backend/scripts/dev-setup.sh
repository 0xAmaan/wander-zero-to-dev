#!/bin/bash

# Automated Development Setup Script
# Ensures all dependencies are running and database is initialized

set -e

echo ""
echo "═══════════════════════════════════════════════"
echo "  Wander Backend - Development Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Start PostgreSQL and Redis with docker-compose
echo "→ Starting PostgreSQL and Redis..."
cd "$(dirname "$0")/../.." # Go to project root
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "→ Waiting for services to be ready..."

# Wait for PostgreSQL to be ready
echo -n "  - PostgreSQL: "
for i in {1..30}; do
    if docker exec wander-postgres-dev pg_isready -U wander > /dev/null 2>&1; then
        echo "✓ Ready"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo " ✗ Timeout"
        exit 1
    fi
done

# Wait for Redis to be ready
echo -n "  - Redis: "
for i in {1..30}; do
    if docker exec wander-redis-dev redis-cli ping > /dev/null 2>&1; then
        echo "✓ Ready"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo " ✗ Timeout"
        exit 1
    fi
done

echo ""
echo "→ Running database migrations..."
cd backend
bun run migrate

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✓ Setup Complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Services running:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Redis:      localhost:6379"
echo ""
echo "Next steps:"
echo "  cd backend && bun run dev"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.dev.yml down"
echo ""
