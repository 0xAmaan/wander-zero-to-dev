# Wander - Zero to Running Developer Environment

A production-grade, Kubernetes-based development environment that gets you from zero to running in one command.

## Features

- 🚀 **True Zero-to-Running** - `make dev` handles everything
- 🐳 **Docker Compose** for local development (PostgreSQL + Redis)
- ☸️ **Kubernetes** manifests for production-like deployments
- 🔥 **Modern Stack** - Hono, Next.js, PostgreSQL, Redis
- 📦 **Externalized Config** - Easy customization via environment variables
- 🔄 **Auto-migration** - Database schema and seed data handled automatically

## Quick Start

### Prerequisites

- **Docker Desktop** - [Install Docker](https://www.docker.com/products/docker-desktop)
- **Bun** - [Install Bun](https://bun.sh/) (or Node.js v18+)
- **Make** - Built into macOS/Linux

Not sure if you have everything? Run `make check` to find out!

### Start Development Environment

```bash
# Clone the repository
git clone <repo-url>
cd wander-ztrde

# (Optional) Check if you have everything installed
make check

# Start EVERYTHING in one command (truly zero-to-running!)
make start
```

That's it! The `make start` command will:
1. ✅ Check prerequisites (Docker, Bun, Make)
2. ✅ Start PostgreSQL and Redis in containers
3. ✅ Wait for services to be healthy
4. ✅ Run database migrations and seed data automatically
5. ✅ Start the backend API on `http://localhost:8080`
6. ✅ Start the frontend dashboard on `http://localhost:3000`
7. ✅ Open your browser - everything just works!

**If something is missing**, the check will tell you exactly what to install and how.

## Project Structure

```
wander-ztrde/
├── backend/              # Hono API (TypeScript)
│   ├── src/
│   │   ├── index.ts      # Server entry point
│   │   ├── app.ts        # Hono app setup
│   │   ├── db/           # Database client & migrations
│   │   ├── cache/        # Redis client & helpers
│   │   ├── routes/       # API route handlers
│   │   └── middleware/   # Logger, error handler, etc.
│   └── scripts/          # Setup and migration scripts
├── frontend/             # Next.js app (TypeScript)
├── k8s/                  # Kubernetes manifests
├── docker-compose.dev.yml # Local development services
└── Makefile              # Orchestration commands
```

## Available Commands

### Development

```bash
make start        # Start EVERYTHING (DB + Redis + Backend + Frontend)
make dev          # Start infrastructure only (PostgreSQL + Redis)
make down         # Stop all services
make logs         # Show logs from all services
make clean        # Stop services and remove data volumes
```

### Backend

```bash
cd backend

bun run dev       # Start API server with hot reload
bun run build     # Build for production
bun run start     # Start production server
bun run migrate   # Run database migrations + seed
```

### Frontend

```bash
cd frontend

bun run dev       # Start Next.js dev server
bun run build     # Build for production
bun run start     # Start production server
```

## Environment Variables

The project uses `.env` files for configuration:

**Backend** (`backend/.env`):
```bash
DATABASE_URL=postgresql://wander:wander123@localhost:5432/wander_dev
REDIS_URL=redis://localhost:6379
API_PORT=8080
NODE_ENV=development
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## API Endpoints

Once running, the API is available at `http://localhost:8080`:

- `GET /` - API info
- `GET /health` - Health check (DB + Redis status)
- `GET /api/deployments` - List deployments (with caching)
- `GET /api/deployments/:id` - Get deployment by ID
- `GET /api/services` - List services
- `GET /api/environments` - List environments
- `POST /api/deployments` - Create new deployment
- `DELETE /api/cache` - Clear Redis cache

## Troubleshooting

### Missing prerequisites
If you see errors about missing tools, run:
```bash
make check
```
This will tell you exactly what's missing and provide installation links.

### Docker not running
```bash
# macOS: Start Docker Desktop app
# Verify: docker info
```

### Database connection errors
```bash
# Restart PostgreSQL container
docker-compose -f docker-compose.dev.yml restart postgres

# Check if it's running
docker exec wander-postgres-dev pg_isready -U wander
```

### Redis connection errors
```bash
# Restart Redis container
docker-compose -f docker-compose.dev.yml restart redis

# Check if it's running
docker exec wander-redis-dev redis-cli ping
```

### Reset everything
```bash
# Nuclear option: remove all data and start fresh
make clean
make dev
```

## What Makes This "Zero-to-Running"?

1. **No manual setup** - No need to install PostgreSQL, Redis, or configure them
2. **Smart initialization** - Detects if database is initialized, skips if already done
3. **Health checks** - Waits for services to be truly ready before proceeding
4. **Clear feedback** - Every step shows progress and provides helpful messages
5. **Idempotent** - Run `make dev` multiple times safely

## Architecture

This demo app is a **deployment tracking dashboard** that showcases:

- **Inter-service communication** (API ↔ Database ↔ Cache)
- **Production patterns** (connection pooling, caching, error handling)
- **Real-world data models** (services, environments, deployments)
- **Kubernetes readiness** (health checks, graceful shutdown)

## Tech Stack

**Backend:**
- Hono v4 - Fast, modern web framework
- Postgres.js - PostgreSQL client
- Redis - Caching layer
- TypeScript - Type safety

**Frontend:**
- Next.js 14 - React framework
- Tailwind CSS - Styling
- shadcn/ui - UI components

**Infrastructure:**
- Docker Compose - Local development
- Kubernetes - Production deployment
- PostgreSQL 15 - Database
- Redis 7 - Cache

## License

MIT
