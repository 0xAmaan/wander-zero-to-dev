# Wander Zero-to-Running: Architecture Document

## Executive Summary

This project demonstrates a production-grade developer onboarding system using Kubernetes. A developer clones the repo, runs `make dev`, and gets a fully functional multi-service application running locally in minutes.

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- Port: 3000

### Backend API
- **Hono** (modern, fast web framework)
- **TypeScript**
- **Node.js runtime**
- Port: 8080

### Data Layer
- **PostgreSQL 15** (persistent storage)
  - Port: 5432
- **Redis 7** (caching layer)
  - Port: 6379

### Infrastructure
- **Kubernetes** (via kind - Kubernetes in Docker)
- **Docker** (containerization)
- **Makefile** (orchestration)

---

## The Demo Application: "Wander Deploy Dashboard"

A **meta dashboard** that tracks deployment history across services and environments. This demonstrates real inter-service communication patterns.

### What It Shows
- Service health monitoring (Postgres, Redis, API status)
- Deployment history list (from Postgres, cached in Redis)
- Real-time statistics
- Cache hit/miss indicators
- Mock data seeded automatically

### Why This Approach
- **Realistic**: Companies build internal deployment tools
- **Demonstrates patterns**: DB queries, caching, API design
- **Tangible**: Reviewers can see it working, not just logs
- **Meta**: The tool itself is about developer environments

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Developer Machine                                             │
│                                                               │
│  $ make dev                                                   │
│       ↓                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Makefile Orchestration                               │    │
│  │  1. Check prerequisites (Docker, kubectl, kind)     │    │
│  │  2. Create kind cluster                              │    │
│  │  3. Build Docker images                              │    │
│  │  4. Apply k8s manifests (ordered)                    │    │
│  │  5. Wait for health checks                           │    │
│  │  6. Port forward services                            │    │
│  │  7. Open browser                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ kind Cluster (Kubernetes in Docker)                  │    │
│  │                                                       │    │
│  │  ┌────────────────────────────────────────────────┐ │    │
│  │  │ Namespace: wander-dev                          │ │    │
│  │  │                                                 │ │    │
│  │  │  [ConfigMap] ← Configuration                   │ │    │
│  │  │  [Secret]    ← Sensitive data (mock)           │ │    │
│  │  │                                                 │ │    │
│  │  │  ┌──────────────┐  ┌──────────────┐          │ │    │
│  │  │  │ PostgreSQL   │  │ Redis        │          │ │    │
│  │  │  │ StatefulSet  │  │ Deployment   │          │ │    │
│  │  │  │ :5432        │  │ :6379        │          │ │    │
│  │  │  └──────┬───────┘  └──────┬───────┘          │ │    │
│  │  │         │                   │                  │ │    │
│  │  │         └───────────┬───────┘                  │ │    │
│  │  │                     │                          │ │    │
│  │  │              ┌──────┴──────┐                   │ │    │
│  │  │              │ Backend API │                   │ │    │
│  │  │              │ (Hono)      │                   │ │    │
│  │  │              │ :8080       │                   │ │    │
│  │  │              └──────┬──────┘                   │ │    │
│  │  │                     │                          │ │    │
│  │  │              ┌──────┴──────┐                   │ │    │
│  │  │              │ Frontend    │                   │ │    │
│  │  │              │ (Next.js)   │                   │ │    │
│  │  │              │ :3000       │                   │ │    │
│  │  │              └─────────────┘                   │ │    │
│  │  │                                                 │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓ (Port Forwarding)                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Browser: localhost:3000                              │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Request Lifecycle

```
User Browser
    │
    │ GET http://localhost:3000
    ▼
Next.js Frontend Pod
    │
    │ Fetches data: GET http://api-service:8080/api/deployments
    ▼
Hono Backend API Pod
    │
    ├─→ 1. Check Redis Cache
    │      Key: "cache:deployments:list"
    │      └─→ HIT? Return cached JSON (1ms response)
    │      └─→ MISS? Continue ↓
    │
    ├─→ 2. Query PostgreSQL
    │      SELECT * FROM deployments
    │      JOIN services ON deployments.service_id = services.id
    │      JOIN environments ON deployments.environment_id = environments.id
    │      ORDER BY started_at DESC
    │      LIMIT 50
    │      (10-20ms response)
    │
    ├─→ 3. Store in Redis Cache
    │      SET "cache:deployments:list" <json>
    │      EXPIRE 60 seconds
    │
    └─→ 4. Return Response
        {
          data: [...deployments],
          cached: false,
          count: 42
        }
```

---

## Database Schema

### Tables

```sql
-- Services (microservices in our system)
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  repository_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environments
CREATE TABLE environments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments (main entity)
CREATE TABLE deployments (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  deployed_by VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_deployments_service ON deployments(service_id);
CREATE INDEX idx_deployments_environment ON deployments(environment_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_started_at ON deployments(started_at DESC);
```

### Mock Data Strategy
- Seed 4 services: frontend, api, worker, analytics
- Seed 3 environments: development, staging, production
- Seed 20+ deployments with mix of statuses:
  - `completed` (90%)
  - `failed` (5%)
  - `in_progress` (5%)

---

## API Contract

Base URL: `http://localhost:8080`

### Health Check
```
GET /health

Response 200:
{
  "status": "healthy",
  "services": {
    "postgres": { "connected": true, "latency": 5 },
    "redis": { "connected": true, "latency": 1 }
  },
  "timestamp": "2025-11-10T12:00:00Z"
}
```

### List Deployments
```
GET /api/deployments?environment=staging&status=completed&limit=50

Response 200:
{
  "data": [
    {
      "id": 1,
      "service": { "id": 1, "name": "frontend" },
      "environment": { "id": 2, "name": "staging" },
      "version": "v1.2.3",
      "status": "completed",
      "deployed_by": "alice@wander.com",
      "started_at": "2025-11-10T10:30:00Z",
      "completed_at": "2025-11-10T10:32:15Z"
    }
  ],
  "cached": true,
  "count": 42
}
```

### Get Single Deployment
```
GET /api/deployments/:id

Response 200:
{
  "data": { ...deployment },
  "cached": false
}
```

### Create Deployment
```
POST /api/deployments

Body:
{
  "service_id": 1,
  "environment_id": 2,
  "version": "v1.3.0",
  "deployed_by": "bob@wander.com"
}

Response 201:
{
  "data": { ...created deployment },
  "message": "Deployment created successfully"
}
```

### List Services
```
GET /api/services

Response 200:
{
  "data": [
    { "id": 1, "name": "frontend", "description": "Next.js web app" }
  ]
}
```

### List Environments
```
GET /api/environments

Response 200:
{
  "data": [
    { "id": 1, "name": "development" }
  ]
}
```

### Clear Cache (Demo Feature)
```
DELETE /api/cache

Response 200:
{ "message": "Cache cleared successfully" }
```

---

## Redis Key Patterns

```
# Caching
cache:deployments:list              → JSON array of deployments (TTL: 60s)
cache:deployments:{id}              → Single deployment JSON (TTL: 60s)
cache:services:health               → Health check results (TTL: 10s)
cache:stats                         → Dashboard statistics (TTL: 30s)

# Future: Session Management
session:{token}                     → User session data

# Future: Job Queue (if adding worker)
bull:deployment-jobs:*              → Background jobs
```

---

## Kubernetes Resources

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wander-dev
```

### Resource Structure
```
wander-dev/
├── ConfigMap: app-config
├── Secret: app-secrets
├── StatefulSet: postgres (persistent storage)
├── Deployment: redis
├── Deployment: backend-api
├── Deployment: frontend
├── Service: postgres-service (ClusterIP)
├── Service: redis-service (ClusterIP)
├── Service: api-service (ClusterIP)
├── Service: frontend-service (NodePort)
└── PersistentVolumeClaim: postgres-pvc (1Gi)
```

### Service Startup Order
```
1. ConfigMap & Secrets
   ↓
2. PostgreSQL StatefulSet
   ↓ (wait for ready + run migrations + seed data)
3. Redis Deployment
   ↓ (wait for ready)
4. Backend API Deployment
   ↓ (wait for health check: GET /health returns 200)
5. Frontend Deployment
   ↓ (wait for ready)
6. Port forwarding
```

---

## Project Structure

```
wander-zero-to-running/
├── README.md                      # Beautiful documentation
├── Makefile                       # The magic
├── config.yaml                    # Externalized config
├── .env.example                   # Environment template
├── docker-compose.yml             # Optional: local dev without k8s
│
├── frontend/                      # Next.js application
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           # Main dashboard
│       │   └── globals.css
│       ├── components/
│       │   ├── ServiceHealthPanel.tsx
│       │   ├── DeploymentsList.tsx
│       │   ├── StatsCards.tsx
│       │   └── CacheIndicator.tsx
│       ├── lib/
│       │   └── api-client.ts      # API fetch wrapper
│       └── types/
│           └── index.ts
│
├── backend/                       # Hono API
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Entry point
│       ├── app.ts                 # Hono app setup
│       ├── routes/
│       │   ├── health.ts
│       │   ├── deployments.ts
│       │   ├── services.ts
│       │   └── environments.ts
│       ├── db/
│       │   ├── client.ts          # Postgres connection
│       │   ├── migrations/
│       │   │   └── 001_initial.sql
│       │   └── seed.sql
│       ├── cache/
│       │   └── redis.ts           # Redis client
│       └── middleware/
│           ├── logger.ts
│           └── error-handler.ts
│
├── k8s/                           # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── postgres/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── frontend/
│       ├── deployment.yaml
│       └── service.yaml
│
├── scripts/
│   ├── check-prereqs.sh           # Verify tools installed
│   ├── create-cluster.sh          # kind cluster setup
│   ├── build-images.sh            # Docker builds
│   ├── wait-for-postgres.sh       # Health check helper
│   ├── wait-for-redis.sh
│   ├── wait-for-service.sh        # Generic health check
│   ├── seed-data.sh               # Load mock data
│   └── port-forward.sh            # Setup port forwarding
│
└── docs/
    ├── ARCHITECTURE.md            # This file
    └── TROUBLESHOOTING.md         # Common issues
```

---

## Makefile Commands

### Primary Commands
```makefile
make dev          # Full setup - the main command
make down         # Teardown everything
make restart      # Down + Dev
make clean        # Nuclear option - delete cluster + images
```

### Monitoring
```makefile
make status       # Show all pod statuses
make logs         # Stream all logs
make logs-api     # API logs only
make logs-db      # Postgres logs only
make logs-redis   # Redis logs only
```

### Development Helpers
```makefile
make shell-api    # Shell into API pod
make shell-db     # Postgres psql shell
make redis-cli    # Redis CLI
make describe-api # Describe API pod (k8s debug)
make events       # Show cluster events
```

### Data Management
```makefile
make seed         # Re-seed database
make reset-db     # Drop & recreate DB
make reset        # Full reset (down + clean + dev)
```

---

## The `make dev` Flow (Detailed)

```bash
1. Prerequisites Check
   ├─→ Check Docker installed & running
   ├─→ Check kubectl installed
   ├─→ Check kind installed
   └─→ Check bun installed (for local builds)

   If missing: Print helpful install instructions & exit

2. Environment Setup
   ├─→ Copy .env.example to .env (if not exists)
   ├─→ Load config.yaml
   └─→ Create namespace (if not exists)

3. Cluster Creation
   ├─→ Check if cluster exists
   ├─→ If exists: Skip
   ├─→ If not: Create kind cluster "wander-dev"
   └─→ Wait for cluster ready

4. Build Docker Images
   ├─→ Build frontend:latest
   ├─→ Build backend:latest
   └─→ Load images into kind cluster

5. Apply Kubernetes Manifests (Sequential)
   ├─→ Apply ConfigMap
   ├─→ Apply Secrets
   ├─→ Apply Postgres StatefulSet + Service + PVC
   │   └─→ Wait for pod ready (max 120s)
   │       └─→ Run migrations (kubectl exec)
   │       └─→ Run seed data
   ├─→ Apply Redis Deployment + Service
   │   └─→ Wait for pod ready (max 60s)
   ├─→ Apply Backend Deployment + Service
   │   └─→ Wait for pod ready (max 120s)
   │   └─→ Health check: curl http://api-service:8080/health
   └─→ Apply Frontend Deployment + Service
       └─→ Wait for pod ready (max 120s)

6. Port Forwarding (Background)
   ├─→ Frontend: localhost:3000 → frontend-service:3000
   ├─→ API: localhost:8080 → api-service:8080
   └─→ Postgres: localhost:5432 → postgres-service:5432

7. Success Output
   ┌────────────────────────────────────────┐
   │ ✅ Wander Dev Environment Ready!       │
   ├────────────────────────────────────────┤
   │                                        │
   │ Services:                              │
   │   Frontend:  http://localhost:3000    │
   │   API:       http://localhost:8080    │
   │   Health:    http://localhost:8080/health │
   │                                        │
   │ Commands:                              │
   │   make logs     - View logs            │
   │   make status   - Check pods           │
   │   make down     - Teardown             │
   │                                        │
   │ Setup time: 2m 34s                     │
   └────────────────────────────────────────┘

8. Auto-open Browser (optional)
   └─→ Open http://localhost:3000
```

---

## Configuration Management

### config.yaml
Externalized configuration for easy customization:

```yaml
cluster:
  name: wander-dev
  provider: kind

services:
  postgres:
    version: "15-alpine"
    storage: "1Gi"
  redis:
    version: "7-alpine"
  api:
    replicas: 1
    resources:
      memory: "256Mi"
      cpu: "200m"
  frontend:
    replicas: 1

dev_mode:
  hot_reload: true
  seed_data: true
  auto_open_browser: true
```

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://wander:wander123@postgres-service:5432/wander_dev
POSTGRES_USER=wander
POSTGRES_PASSWORD=wander123
POSTGRES_DB=wander_dev

# Redis
REDIS_URL=redis://redis-service:6379

# API
API_PORT=8080
API_SECRET=mock-secret-key-for-local-dev-only
NODE_ENV=development

# Cache
CACHE_TTL=60
CACHE_ENABLED=true

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Error Handling Strategy

### Graceful Failures
Every potential error has a helpful message:

```bash
❌ Error: Docker not running
💡 Fix: Start Docker Desktop and run 'make dev' again
📖 Install: https://docker.com/products/docker-desktop

❌ Error: Port 3000 already in use
💡 Fix: Run 'lsof -ti:3000 | xargs kill' or 'make clean'

❌ Error: PostgreSQL pod not ready after 120s
💡 Debug: Run 'make logs-db' to see logs
💡 Common causes: Port conflict, insufficient memory
```

### Health Checks
All services have proper health checks:
- **Postgres**: `pg_isready` command
- **Redis**: `redis-cli ping`
- **API**: `GET /health` endpoint
- **Frontend**: HTTP 200 on root path

---

## Extension Points (Future Features)

### Worker Service
1. Add `worker/` directory
2. Create k8s manifests in `k8s/worker/`
3. Update Makefile to deploy worker
4. Use Redis as job queue (Bull/BullMQ)

### WebSockets (Real-time Updates)
1. Add WebSocket handler to Hono backend
2. Create `useWebSocket` hook in frontend
3. Expose WS port in k8s service

### Authentication
1. Add JWT middleware to Hono
2. Create AuthContext in Next.js
3. Store JWT secret in k8s Secret

### Multiple Profiles
```bash
make dev-minimal    # Just API + DB + Redis
make dev-frontend   # Frontend with mock API
```

---

## Success Metrics (PRD Alignment)

### P0 Requirements ✅
- [x] Single command (`make dev`) brings up entire stack
- [x] Externalized configuration (config.yaml + .env)
- [x] Secure mock secrets (k8s Secrets, base64 encoded)
- [x] Inter-service communication (Frontend → API → DB + Redis)
- [x] Health checks (all services)
- [x] Single teardown command (`make down`)
- [x] Comprehensive documentation

### P1 Requirements ✅
- [x] Automatic dependency ordering (DB before API)
- [x] Meaningful logging (colored, timestamped)
- [x] Developer-friendly defaults (hot reload, debug ports)
- [x] Error handling (port conflicts, missing deps)

### P2 Nice-to-Haves (If Time Permits)
- [ ] Multiple profiles (minimal, full)
- [ ] Pre-commit hooks
- [ ] Database seeding with rich data
- [ ] Performance optimizations (parallel startup)

---

## What Makes This Stand Out

1. **Actually Works First Try**
   - Robust prerequisite checking
   - Clear error messages
   - Automatic recovery where possible

2. **Production Patterns**
   - Proper k8s resource types (StatefulSet for DB)
   - Health checks and readiness probes
   - ConfigMaps/Secrets separation
   - Resource limits defined

3. **Developer Experience**
   - Beautiful terminal output
   - Fast feedback loops
   - Helpful debugging commands
   - Clear documentation

4. **Realistic Demo App**
   - Solves a real problem
   - Shows complex patterns (caching, joins)
   - Visually appealing UI
   - Actually usable

5. **Extensibility**
   - Clear extension points
   - Modular structure
   - Easy to add services
   - Config-driven behavior

---

## Next Steps

1. **Create Project Structure**
   - Set up directories
   - Initialize package.json files
   - Create Dockerfiles

2. **Build Backend API (Hono)**
   - Set up Hono app
   - Connect to Postgres
   - Connect to Redis
   - Implement endpoints

3. **Build Frontend (Next.js)**
   - Create dashboard UI
   - API client
   - Components

4. **Create Kubernetes Manifests**
   - Write all YAML files
   - Test individually

5. **Build Makefile Orchestration**
   - Implement commands
   - Add error handling
   - Beautiful output

6. **Documentation & Polish**
   - README
   - Architecture diagrams
   - Video demo
