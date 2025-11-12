.PHONY: help dev down logs clean setup-backend k8s-build k8s-deploy k8s-status k8s-logs k8s-down k8s-clean

# Default target
help:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Wander - Zero to Running Developer Environment"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Docker Compose Commands (Local Dev):"
	@echo "  make dev          - Start entire development environment"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - Show logs from all services"
	@echo "  make clean        - Stop services and remove volumes"
	@echo "  make setup-backend - Set up backend only (deps + DB)"
	@echo ""
	@echo "Kubernetes Commands (Kind Cluster):"
	@echo "  make k8s-build    - Build Docker images and load into Kind"
	@echo "  make k8s-deploy   - Deploy all manifests to Kind cluster"
	@echo "  make k8s-status   - Check deployment status"
	@echo "  make k8s-logs     - View logs from all pods"
	@echo "  make k8s-down     - Delete all resources from cluster"
	@echo "  make k8s-clean    - Tear down entire Kind cluster"
	@echo ""

# Start development environment (zero-to-running!)
dev:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Starting Development Environment"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Check Docker is running
	@if ! docker info > /dev/null 2>&1; then \
		echo "✗ Docker is not running. Please start Docker Desktop."; \
		exit 1; \
	fi
	@echo "✓ Docker is running"
	@echo ""
	@# Start PostgreSQL and Redis
	@echo "→ Starting PostgreSQL and Redis..."
	@docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "→ Waiting for services to be ready..."
	@# Wait for PostgreSQL
	@printf "  - PostgreSQL: "
	@for i in $$(seq 1 30); do \
		if docker exec wander-postgres-dev pg_isready -U wander > /dev/null 2>&1; then \
			echo "✓ Ready"; \
			break; \
		fi; \
		printf "."; \
		sleep 1; \
		if [ $$i -eq 30 ]; then \
			echo " ✗ Timeout"; \
			exit 1; \
		fi; \
	done
	@# Wait for Redis
	@printf "  - Redis: "
	@for i in $$(seq 1 30); do \
		if docker exec wander-redis-dev redis-cli ping > /dev/null 2>&1; then \
			echo "✓ Ready"; \
			break; \
		fi; \
		printf "."; \
		sleep 1; \
		if [ $$i -eq 30 ]; then \
			echo " ✗ Timeout"; \
			exit 1; \
		fi; \
	done
	@echo ""
	@# Check if database is initialized
	@echo "→ Checking database initialization..."
	@if docker exec wander-postgres-dev psql -U wander -d wander_dev -c "SELECT 1 FROM services LIMIT 1" > /dev/null 2>&1; then \
		echo "✓ Database already initialized"; \
	else \
		echo "→ Running database migrations..."; \
		cd backend && bun run migrate; \
	fi
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  ✓ Development Environment Ready!"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Services running:"
	@echo "  • PostgreSQL: localhost:5432"
	@echo "  • Redis:      localhost:6379"
	@echo ""
	@echo "Start the backend:"
	@echo "  cd backend && bun run dev"
	@echo ""
	@echo "Start the frontend:"
	@echo "  cd frontend && bun run dev"
	@echo ""

# Stop all services
down:
	@echo "→ Stopping services..."
	@docker-compose -f docker-compose.dev.yml down
	@echo "✓ Services stopped"

# Show logs
logs:
	@docker-compose -f docker-compose.dev.yml logs -f

# Clean everything (including volumes)
clean:
	@echo "→ Stopping and removing services..."
	@docker-compose -f docker-compose.dev.yml down -v
	@echo "✓ Cleanup complete"

# Backend-only setup (for development)
setup-backend:
	@echo "→ Installing backend dependencies..."
	@cd backend && bun install
	@echo "✓ Backend dependencies installed"
	@make dev

# ═══════════════════════════════════════════════
# Kubernetes Commands (Kind Cluster)
# ═══════════════════════════════════════════════

# Build Docker images and load into Kind cluster
k8s-build:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Building Docker Images"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Check Docker is running
	@if ! docker info > /dev/null 2>&1; then \
		echo "✗ Docker is not running. Please start Docker Desktop."; \
		exit 1; \
	fi
	@# Check Kind cluster exists
	@if ! kind get clusters 2>/dev/null | grep -q "^kind$$"; then \
		echo "✗ Kind cluster 'kind' not found. Create one with: kind create cluster"; \
		exit 1; \
	fi
	@echo "→ Building backend image..."
	@docker build -t wander-backend:latest ./backend
	@echo "→ Building frontend image..."
	@docker build -t wander-frontend:latest ./frontend
	@echo ""
	@echo "→ Loading images into Kind cluster..."
	@kind load docker-image wander-backend:latest
	@kind load docker-image wander-frontend:latest
	@echo ""
	@echo "✓ Images built and loaded into Kind cluster"
	@echo ""

# Deploy all Kubernetes manifests
k8s-deploy:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Deploying to Kubernetes"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Check kubectl is available
	@if ! command -v kubectl > /dev/null 2>&1; then \
		echo "✗ kubectl not found. Please install kubectl."; \
		exit 1; \
	fi
	@# Check Kind cluster exists
	@if ! kind get clusters 2>/dev/null | grep -q "^kind$$"; then \
		echo "✗ Kind cluster 'kind' not found. Create one with: kind create cluster"; \
		exit 1; \
	fi
	@echo "→ Creating namespace..."
	@kubectl apply -f k8s/namespace.yaml
	@echo ""
	@echo "→ Creating ConfigMap and Secrets..."
	@kubectl apply -f k8s/configmap.yaml
	@kubectl apply -f k8s/secrets.yaml
	@echo ""
	@echo "→ Deploying PostgreSQL..."
	@kubectl apply -f k8s/postgres/
	@echo ""
	@echo "→ Deploying Redis..."
	@kubectl apply -f k8s/redis/
	@echo ""
	@echo "→ Deploying Backend API..."
	@kubectl apply -f k8s/backend/
	@echo ""
	@echo "→ Deploying Frontend..."
	@kubectl apply -f k8s/frontend/
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  ✓ Deployment Complete!"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Access the application:"
	@echo "  Frontend: http://localhost:30000"
	@echo ""
	@echo "Check status:"
	@echo "  make k8s-status"
	@echo ""
	@echo "View logs:"
	@echo "  make k8s-logs"
	@echo ""

# Check deployment status
k8s-status:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Kubernetes Deployment Status"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Pods:"
	@kubectl get pods -n wander
	@echo ""
	@echo "Services:"
	@kubectl get services -n wander
	@echo ""
	@echo "Deployments:"
	@kubectl get deployments -n wander
	@echo ""
	@echo "StatefulSets:"
	@kubectl get statefulsets -n wander
	@echo ""
	@echo "PersistentVolumeClaims:"
	@kubectl get pvc -n wander
	@echo ""

# View logs from all pods
k8s-logs:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Kubernetes Pod Logs"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Choose a pod to view logs:"
	@echo ""
	@kubectl get pods -n wander -o custom-columns=NAME:.metadata.name --no-headers | nl
	@echo ""
	@read -p "Enter pod number (or press Enter for all): " pod_num; \
	if [ -z "$$pod_num" ]; then \
		kubectl logs -n wander --all-containers=true --tail=100 -l app; \
	else \
		pod_name=$$(kubectl get pods -n wander -o custom-columns=NAME:.metadata.name --no-headers | sed -n "$${pod_num}p"); \
		kubectl logs -n wander $$pod_name --tail=100 -f; \
	fi

# Delete all Kubernetes resources
k8s-down:
	@echo ""
	@echo "→ Deleting all resources from wander namespace..."
	@kubectl delete namespace wander --ignore-not-found=true
	@echo "✓ All resources deleted"
	@echo ""

# Tear down entire Kind cluster
k8s-clean:
	@echo ""
	@echo "→ Deleting Kind cluster..."
	@kind delete cluster
	@echo "✓ Kind cluster deleted"
	@echo ""
