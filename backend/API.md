# Wander API Documentation

**Base URL:** `http://localhost:8080`

All responses include proper HTTP status codes and JSON bodies.

---

## Health Check

### GET /health

Check API and service health status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:00:00Z",
  "services": {
    "postgres": {
      "connected": true,
      "latency": 5
    },
    "redis": {
      "connected": true,
      "latency": 1
    }
  },
  "uptime": 123.45,
  "environment": "development"
}
```

**Response (503) - Unhealthy:**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-10T12:00:00Z",
  "error": "Connection refused",
  "services": {
    "postgres": { "connected": false },
    "redis": { "connected": false }
  }
}
```

---

## Deployments

### GET /api/deployments

List deployments with optional filters.

**Query Parameters:**
- `environment` (string, optional) - Filter by environment name (e.g., "production")
- `status` (string, optional) - Filter by status (e.g., "completed", "failed", "in_progress")
- `limit` (number, optional) - Number of results (default: 50, max: 100)

**Example Request:**
```bash
curl "http://localhost:8080/api/deployments?environment=production&status=completed&limit=10"
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "version": "v2.1.3",
      "status": "completed",
      "deployed_by": "alice@wander.com",
      "started_at": "2025-11-10T10:00:00Z",
      "completed_at": "2025-11-10T10:03:00Z",
      "error_message": null,
      "metadata": { "commit": "a7f3c2d", "build_time": "3m12s" },
      "service_name": "frontend",
      "service_description": "Next.js web application",
      "environment_name": "production"
    }
  ],
  "count": 1,
  "cached": false
}
```

---

### GET /api/deployments/:id

Get a single deployment by ID.

**Example Request:**
```bash
curl http://localhost:8080/api/deployments/1
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "service_id": 1,
    "environment_id": 3,
    "version": "v2.1.3",
    "status": "completed",
    "deployed_by": "alice@wander.com",
    "started_at": "2025-11-10T10:00:00Z",
    "completed_at": "2025-11-10T10:03:00Z",
    "error_message": null,
    "metadata": { "commit": "a7f3c2d" },
    "service_name": "frontend",
    "service_description": "Next.js web application",
    "repository_url": "https://github.com/wander/frontend",
    "environment_name": "production",
    "environment_description": "Live production environment"
  },
  "cached": false
}
```

**Response (404) - Not Found:**
```json
{
  "error": "Deployment not found"
}
```

---

### POST /api/deployments

Create a new deployment.

**Request Body:**
```json
{
  "service_id": 1,
  "environment_id": 3,
  "version": "v2.2.0",
  "deployed_by": "bob@wander.com",
  "metadata": {
    "commit": "abc123",
    "branch": "main"
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "environment_id": 2,
    "version": "v2.2.0",
    "deployed_by": "bob@wander.com"
  }'
```

**Response (201) - Created:**
```json
{
  "data": {
    "id": 28,
    "service_id": 1,
    "environment_id": 2,
    "version": "v2.2.0",
    "status": "in_progress",
    "deployed_by": "bob@wander.com",
    "started_at": "2025-11-10T12:00:00Z",
    "completed_at": null,
    "error_message": null,
    "metadata": {}
  },
  "message": "Deployment created successfully"
}
```

**Response (400) - Validation Error:**
```json
{
  "error": "Validation error",
  "message": "Missing required fields: service_id, environment_id, version, deployed_by"
}
```

**Response (404) - Invalid Reference:**
```json
{
  "error": "Service not found"
}
```

---

## Services

### GET /api/services

List all services in the system.

**Example Request:**
```bash
curl http://localhost:8080/api/services
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "frontend",
      "description": "Next.js web application",
      "repository_url": "https://github.com/wander/frontend",
      "created_at": "2025-11-10T00:00:00Z"
    },
    {
      "id": 2,
      "name": "api",
      "description": "Hono REST API backend",
      "repository_url": "https://github.com/wander/api",
      "created_at": "2025-11-10T00:00:00Z"
    }
  ],
  "count": 2,
  "cached": false
}
```

---

## Environments

### GET /api/environments

List all environments in the system.

**Example Request:**
```bash
curl http://localhost:8080/api/environments
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "development",
      "description": "Local development environment",
      "created_at": "2025-11-10T00:00:00Z"
    },
    {
      "id": 2,
      "name": "staging",
      "description": "Pre-production staging environment",
      "created_at": "2025-11-10T00:00:00Z"
    },
    {
      "id": 3,
      "name": "production",
      "description": "Live production environment",
      "created_at": "2025-11-10T00:00:00Z"
    }
  ],
  "count": 3,
  "cached": false
}
```

---

## Cache Management

### DELETE /api/cache

Clear Redis cache.

**Query Parameters:**
- `pattern` (string, optional) - Pattern to match (e.g., "cache:deployments:*")
  - If not provided, clears **ALL** cache

**Example Requests:**
```bash
# Clear all cache
curl -X DELETE http://localhost:8080/api/cache

# Clear only deployment caches
curl -X DELETE "http://localhost:8080/api/cache?pattern=cache:deployments:*"
```

**Response (200) - Pattern:**
```json
{
  "message": "Cache cleared for pattern: cache:deployments:*",
  "deletedKeys": 15
}
```

**Response (200) - All:**
```json
{
  "message": "All cache cleared successfully",
  "success": true
}
```

---

### GET /api/cache/stats

Get cache information (for debugging).

**Example Request:**
```bash
curl http://localhost:8080/api/cache/stats
```

**Response (200):**
```json
{
  "message": "Cache stats endpoint",
  "info": "Redis cache is active with 60s TTL on most keys",
  "endpoints": {
    "clear": "DELETE /api/cache",
    "clearPattern": "DELETE /api/cache?pattern=cache:deployments:*"
  }
}
```

---

## Caching Behavior

All GET endpoints use Redis caching:

- **TTL:** 60 seconds
- **Cache Keys:**
  - Deployments list: `cache:deployments:list:{environment}:{status}:{limit}`
  - Single deployment: `cache:deployments:{id}`
  - Services: `cache:services:list`
  - Environments: `cache:environments:list`

**Cache Indicators:**
- All responses include `"cached": true/false` to indicate cache hit/miss
- POST operations automatically invalidate related caches

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (health check failed)

---

## Testing the API

### Quick Test Script

```bash
#!/bin/bash

API="http://localhost:8080"

echo "1. Health Check"
curl $API/health | jq

echo -e "\n2. List Services"
curl $API/api/services | jq

echo -e "\n3. List Environments"
curl $API/api/environments | jq

echo -e "\n4. List Deployments"
curl $API/api/deployments | jq

echo -e "\n5. Create Deployment"
curl -X POST $API/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "environment_id": 2,
    "version": "v2.2.0",
    "deployed_by": "test@wander.com"
  }' | jq

echo -e "\n6. Clear Cache"
curl -X DELETE $API/api/cache | jq
```

Save as `test-api.sh`, make executable (`chmod +x test-api.sh`), and run!
