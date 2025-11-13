# Kubernetes Deployment Guide

## Overview

This project includes production-ready Kubernetes manifests for deploying the Wander application to a Kubernetes cluster. The setup supports both local development (using Kind) and cloud deployment (GKE, EKS, AKS).

## Architecture

The application consists of 4 containerized services:

1. **PostgreSQL** - Database (StatefulSet with persistent storage)
2. **Redis** - Cache layer (Deployment with ephemeral storage)
3. **Backend API** - Hono API server (Deployment, 2 replicas)
4. **Frontend** - Next.js web application (Deployment, 2 replicas)

## Prerequisites

### Local Development (Kind)
- Docker Desktop installed and running
- Kind installed: `brew install kind` (macOS) or see [Kind installation](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- kubectl installed: `brew install kubectl` (macOS) or see [kubectl installation](https://kubernetes.io/docs/tasks/tools/)

### Cloud Deployment
- Access to a Kubernetes cluster (GKE, EKS, AKS)
- kubectl configured to access your cluster
- Container registry (Docker Hub, GCR, ECR, ACR)

## Quick Start (Local Kind Cluster)

### 1. Create Kind Cluster
```bash
kind create cluster
```

### 2. Build and Load Docker Images
```bash
make k8s-build
```

This will:
- Build `wander-backend:latest` from `backend/Dockerfile`
- Build `wander-frontend:latest` from `frontend/Dockerfile`
- Load both images into the Kind cluster

### 3. Deploy to Kubernetes
```bash
make k8s-deploy
```

This will deploy:
- Namespace (`wander`)
- ConfigMap and Secrets
- PostgreSQL StatefulSet with PersistentVolumeClaim
- Redis Deployment
- Backend API Deployment
- Frontend Deployment
- All associated Services

### 4. Check Deployment Status
```bash
make k8s-status
```

### 5. Access the Application

**Frontend**: http://localhost:30000

The frontend is exposed via NodePort on port 30000.

### 6. View Logs
```bash
make k8s-logs
```

### 7. Tear Down
```bash
# Delete all resources but keep cluster
make k8s-down

# Delete entire Kind cluster
make k8s-clean
```

## Project Structure

```
wander-ztrde/
├── backend/
│   ├── Dockerfile              # Multi-stage Bun backend build
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile              # Multi-stage Next.js build
│   └── .dockerignore
└── k8s/
    ├── namespace.yaml          # wander namespace
    ├── configmap.yaml          # Non-sensitive configuration
    ├── secrets.yaml            # Sensitive data (passwords, keys)
    ├── postgres/
    │   ├── statefulset.yaml    # PostgreSQL with persistence
    │   ├── service.yaml        # Headless service for stable DNS
    │   └── pvc.yaml            # 10Gi persistent volume claim
    ├── redis/
    │   ├── deployment.yaml     # Redis cache
    │   └── service.yaml        # ClusterIP service
    ├── backend/
    │   ├── deployment.yaml     # Hono API (2 replicas)
    │   └── service.yaml        # ClusterIP service
    └── frontend/
        ├── deployment.yaml     # Next.js app (2 replicas)
        └── service.yaml        # NodePort service (port 30000)
```

## Configuration

### ConfigMap (`k8s/configmap.yaml`)
Non-sensitive configuration:
- Database name
- Redis host/port
- API port
- Cache settings
- Frontend API URL

### Secrets (`k8s/secrets.yaml`)
Sensitive data (base64 encoded in cluster):
- PostgreSQL credentials
- Database connection URL
- Redis connection URL
- API secret key

**⚠️ Security Note**: For production, use a proper secret management solution like:
- HashiCorp Vault
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault

## Service Communication

Services communicate via Kubernetes DNS:

```
Frontend (Next.js)
    ↓
    http://backend-service:8080
    ↓
Backend API (Hono)
    ↓                              ↓
postgresql://postgres-service:5432    redis://redis-service:6379
    ↓                              ↓
PostgreSQL                        Redis
```

## Resource Limits

### PostgreSQL
- **Requests**: 250m CPU, 512Mi RAM
- **Limits**: 1000m CPU, 2Gi RAM
- **Storage**: 10Gi persistent volume

### Redis
- **Requests**: 100m CPU, 128Mi RAM
- **Limits**: 500m CPU, 512Mi RAM
- **Storage**: Ephemeral (emptyDir)

### Backend API
- **Requests**: 200m CPU, 256Mi RAM
- **Limits**: 1000m CPU, 1Gi RAM
- **Replicas**: 2

### Frontend
- **Requests**: 200m CPU, 256Mi RAM
- **Limits**: 1000m CPU, 1Gi RAM
- **Replicas**: 2

## Health Checks

All services include readiness and liveness probes:

- **PostgreSQL**: `pg_isready` checks
- **Redis**: `redis-cli ping` checks
- **Backend API**: HTTP GET `/health` endpoint
- **Frontend**: HTTP GET `/` endpoint

## Init Containers

### Backend Deployment
Includes `wait-for-postgres` init container that waits for PostgreSQL to be ready before starting the API.

### Frontend Deployment
Includes `wait-for-backend` init container that waits for the backend API to be ready before starting the frontend.

## Makefile Commands

### Docker Compose (Local Dev)
```bash
make dev              # Start Docker Compose environment
make down             # Stop services
make logs             # View logs
make clean            # Stop and remove volumes
make setup-backend    # Install deps and start services
```

### Kubernetes (Kind Cluster)
```bash
make k8s-build        # Build and load Docker images into Kind
make k8s-deploy       # Deploy all manifests to cluster
make k8s-status       # Check deployment status
make k8s-logs         # View pod logs
make k8s-down         # Delete all resources
make k8s-clean        # Destroy Kind cluster
```

## Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n wander

# Describe pod for events
kubectl describe pod <pod-name> -n wander

# Check logs
kubectl logs <pod-name> -n wander
```

### Database Connection Issues
```bash
# Check if PostgreSQL is ready
kubectl exec -it postgres-0 -n wander -- pg_isready -U wander

# Test connection from backend
kubectl exec -it <backend-pod-name> -n wander -- bun run -e "console.log(process.env.DATABASE_URL)"
```

### Image Not Found
If you see `ImagePullBackOff`:
```bash
# Ensure images are loaded into Kind
kind load docker-image wander-backend:latest
kind load docker-image wander-frontend:latest
```

## Cloud Deployment

### 1. Build and Push Images

```bash
# Tag images for registry
docker tag wander-backend:latest <registry>/wander-backend:v1.0.0
docker tag wander-frontend:latest <registry>/wander-frontend:v1.0.0

# Push to registry
docker push <registry>/wander-backend:v1.0.0
docker push <registry>/wander-frontend:v1.0.0
```

### 2. Update Manifests

Update image references in deployments:
- `k8s/backend/deployment.yaml`
- `k8s/frontend/deployment.yaml`

Change `image: wander-backend:latest` to `image: <registry>/wander-backend:v1.0.0`

### 3. Update Service Type

For cloud, change `frontend/service.yaml` from `NodePort` to `LoadBalancer`:

```yaml
spec:
  type: LoadBalancer  # Cloud provider will create load balancer
```

### 4. Deploy

```bash
kubectl apply -f k8s/
```

## Production Considerations

### Security
- [ ] Use proper secret management (Vault, cloud provider secrets)
- [ ] Enable network policies to restrict pod communication
- [ ] Run containers as non-root users (already configured)
- [ ] Scan images for vulnerabilities
- [ ] Use private container registry

### High Availability
- [ ] Increase replica counts for stateless services
- [ ] Set up PostgreSQL replication (primary/replica)
- [ ] Configure Redis Sentinel or Redis Cluster
- [ ] Use pod anti-affinity to spread replicas across nodes
- [ ] Set up cluster autoscaling

### Monitoring & Observability
- [ ] Deploy Prometheus for metrics
- [ ] Deploy Grafana for dashboards
- [ ] Configure log aggregation (ELK, Loki, CloudWatch)
- [ ] Set up alerting (AlertManager, PagerDuty)
- [ ] Implement distributed tracing (Jaeger, Zipkin)

### Persistence
- [ ] Use cloud storage classes for better performance
- [ ] Configure backup/restore for PostgreSQL
- [ ] Set up volume snapshots
- [ ] Implement disaster recovery plan

### CI/CD
- [ ] Automate image builds on commit
- [ ] Implement GitOps (ArgoCD, Flux)
- [ ] Add automated testing before deployment
- [ ] Set up rolling update strategy
- [ ] Configure deployment approvals

## Next Steps

1. Test local deployment with Kind
2. Set up cloud Kubernetes cluster
3. Configure CI/CD pipeline
4. Implement monitoring and logging
5. Set up database backups
6. Configure autoscaling
7. Implement ingress controller for better routing
8. Set up TLS certificates (cert-manager)

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kind Documentation](https://kind.sigs.k8s.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
