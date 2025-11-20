.PHONY: help check dev start down logs clean setup-backend k8s-start k8s-cluster k8s-build k8s-deploy k8s-status k8s-logs k8s-down k8s-clean

# Default target
help:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Wander - Zero to Running Developer Environment"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Getting Started:"
	@echo "  make check        - Check if prerequisites are installed"
	@echo "  make start        - Start EVERYTHING (DB + Redis + Backend + Frontend)"
	@echo ""
	@echo "Docker Compose Commands (Local Dev):"
	@echo "  make dev          - Start infrastructure (DB + Redis)"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - Show logs from all services"
	@echo "  make clean        - Stop services and remove volumes"
	@echo "  make setup-backend - Set up backend only (deps + DB)"
	@echo ""
	@echo "Kubernetes Commands (Kind Cluster):"
	@echo "  make k8s-start    - Start EVERYTHING in Kubernetes (cluster + build + deploy)"
	@echo "  make k8s-cluster  - Create Kind cluster with port mappings"
	@echo "  make k8s-build    - Build Docker images and load into Kind"
	@echo "  make k8s-deploy   - Deploy all manifests to Kind cluster"
	@echo "  make k8s-status   - Check deployment status"
	@echo "  make k8s-logs     - View logs from all pods"
	@echo "  make k8s-down     - Delete all resources from cluster"
	@echo "  make k8s-clean    - Tear down entire Kind cluster"
	@echo ""

# Check prerequisites (interactive version)
check:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Checking Prerequisites"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Loop until all prerequisites are met
	@while true; do \
		missing=0; \
		\
		printf "→ Docker: "; \
		if command -v docker > /dev/null 2>&1; then \
			echo "✓ Installed"; \
		else \
			echo "✗ Not found"; \
			missing=1; \
		fi; \
		\
		if command -v docker > /dev/null 2>&1; then \
			printf "→ Docker daemon: "; \
			if docker info > /dev/null 2>&1; then \
				echo "✓ Running"; \
			else \
				echo "✗ Not running"; \
				missing=1; \
			fi; \
		fi; \
		\
		printf "→ Bun: "; \
		if command -v bun > /dev/null 2>&1; then \
			echo "✓ Installed ($$(bun --version))"; \
		else \
			echo "✗ Not found"; \
			missing=1; \
		fi; \
		\
		if [ $$missing -eq 0 ]; then \
			echo ""; \
			echo "✓ All prerequisites are installed!"; \
			echo ""; \
			break; \
		fi; \
		\
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "Missing prerequisites detected. Please install:"; \
		echo ""; \
		if ! command -v docker > /dev/null 2>&1; then \
			echo "📦 Docker Desktop:"; \
			echo "  macOS:   https://docs.docker.com/desktop/install/mac-install/"; \
			echo "  Linux:   https://docs.docker.com/desktop/install/linux/"; \
			echo "  Windows: https://docs.docker.com/desktop/install/windows-install/"; \
			echo ""; \
		fi; \
		if command -v docker > /dev/null 2>&1 && ! docker info > /dev/null 2>&1; then \
			echo "🐳 Docker daemon not running:"; \
			echo "  → Start Docker Desktop application"; \
			echo ""; \
		fi; \
		if ! command -v bun > /dev/null 2>&1; then \
			echo "⚡ Bun runtime:"; \
			echo "  macOS/Linux: curl -fsSL https://bun.sh/install | bash"; \
			echo "  Windows:     powershell -c \"irm bun.sh/install.ps1 | iex\""; \
			echo "  Alternative: Use Node.js v18+ instead"; \
			echo ""; \
		fi; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo ""; \
		read -p "Press Enter after installing to re-check (or Ctrl+C to exit)... " _; \
		echo ""; \
		echo "Rechecking..."; \
		echo ""; \
	done

# Start development environment (zero-to-running!)
dev: check
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Starting Development Environment"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Install dependencies if needed
	@echo "→ Checking dependencies..."
	@if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then \
		echo "→ Installing dependencies..."; \
		bun install; \
	else \
		echo "✓ Dependencies already installed"; \
	fi
	@echo ""
	@# Create .env files from examples if they don't exist
	@echo "→ Checking environment files..."
	@if [ ! -f "backend/.env" ]; then \
		if [ -f "backend/.env.example" ]; then \
			echo "→ Creating backend/.env from backend/.env.example..."; \
			cp backend/.env.example backend/.env; \
			echo "✓ Created backend/.env"; \
		else \
			echo "⚠ Warning: backend/.env.example not found"; \
		fi; \
	else \
		echo "✓ backend/.env exists"; \
	fi
	@echo "→ Setting up frontend/.env.local for Docker Compose..."
	@if [ -f "frontend/.env.local.docker" ]; then \
		cp frontend/.env.local.docker frontend/.env.local; \
		echo "✓ Created frontend/.env.local (Docker Compose mode)"; \
	else \
		echo "⚠ Warning: frontend/.env.local.docker not found"; \
	fi
	@echo ""
	@# Start PostgreSQL and Redis
	@echo "→ Starting PostgreSQL and Redis..."
	@docker compose -f docker-compose.dev.yml up -d
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
	@echo "Database Connection (Beekeeper Studio):"
	@echo "  postgresql://wander:wander123@localhost:5432/wander_dev"
	@echo ""
	@echo "Start the backend:"
	@echo "  cd backend && bun run dev"
	@echo ""
	@echo "Start the frontend:"
	@echo "  cd frontend && bun run dev"
	@echo ""
	@echo "Or start everything at once:"
	@echo "  make start"
	@echo ""

# Start everything (infrastructure + backend + frontend)
start: dev
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Starting Backend + Frontend"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "→ Launching backend and frontend servers..."
	@bun run dev
	@echo ""

# Stop all services
down:
	@echo "→ Stopping services..."
	@docker compose -f docker-compose.dev.yml down
	@echo "✓ Services stopped"

# Show logs
logs:
	@docker compose -f docker-compose.dev.yml logs -f

# Clean everything (including volumes)
clean:
	@echo "→ Stopping and removing services..."
	@docker compose -f docker-compose.dev.yml down -v
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

# Start everything in Kubernetes (zero-to-running!)
k8s-start:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Kubernetes Zero-to-Running"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Check prerequisites
	@printf "→ Checking prerequisites...\n"
	@if ! command -v kind > /dev/null 2>&1; then \
		echo "✗ kind not found. Install with: brew install kind"; \
		exit 1; \
	fi
	@if ! command -v kubectl > /dev/null 2>&1; then \
		echo "✗ kubectl not found. Install with: brew install kubectl"; \
		exit 1; \
	fi
	@if ! docker info > /dev/null 2>&1; then \
		echo "✗ Docker is not running. Please start Docker Desktop."; \
		exit 1; \
	fi
	@echo "✓ Prerequisites OK"
	@echo ""
	@# Setup frontend env for Kubernetes
	@echo "→ Setting up frontend/.env.local for Kubernetes..."
	@if [ -f "frontend/.env.local.k8s" ]; then \
		cp frontend/.env.local.k8s frontend/.env.local; \
		echo "✓ Created frontend/.env.local (Kubernetes mode)"; \
	else \
		echo "⚠ Warning: frontend/.env.local.k8s not found"; \
	fi
	@echo ""
	@# Step 1: Create cluster if needed
	@if kind get clusters 2>/dev/null | grep -q "^kind$$"; then \
		echo "✓ Kind cluster 'kind' already exists"; \
	else \
		echo "→ Creating Kind cluster..."; \
		$(MAKE) k8s-cluster; \
	fi
	@echo ""
	@# Step 2: Build and load images
	@echo "→ Building Docker images..."
	@$(MAKE) k8s-build
	@echo ""
	@# Step 3: Deploy everything
	@echo "→ Deploying to Kubernetes..."
	@$(MAKE) k8s-deploy
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  ✓ Kubernetes Environment Ready!"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "Access your application:"
	@echo "  Frontend: http://localhost:30000"
	@echo "  Backend:  http://localhost:30080"
	@echo ""
	@echo "Check status:"
	@echo "  make k8s-status"
	@echo ""
	@echo "View logs:"
	@echo "  make k8s-logs"
	@echo ""
	@echo "Tear down:"
	@echo "  make k8s-down     (delete resources)"
	@echo "  make k8s-clean    (delete entire cluster)"
	@echo ""

# Create Kind cluster with port mappings
k8s-cluster:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  Creating Kind Cluster"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@# Check if cluster already exists
	@if kind get clusters 2>/dev/null | grep -q "^kind$$"; then \
		echo "⚠ Kind cluster 'kind' already exists."; \
		echo ""; \
		echo "To recreate with proper port mappings:"; \
		echo "  make k8s-clean"; \
		echo "  make k8s-cluster"; \
		echo ""; \
		exit 1; \
	fi
	@echo "→ Creating Kind cluster with port mappings..."
	@kind create cluster --config=kind-config.yaml
	@echo ""
	@echo "✓ Kind cluster created successfully"
	@echo ""
	@echo "Port mappings:"
	@echo "  • localhost:30000 → Frontend (Next.js)"
	@echo "  • localhost:30080 → Backend API (Hono)"
	@echo ""
	@echo "Next steps:"
	@echo "  make k8s-build"
	@echo "  make k8s-deploy"
	@echo ""

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
		echo "✗ Kind cluster 'kind' not found."; \
		echo ""; \
		echo "Create it with:"; \
		echo "  make k8s-cluster"; \
		echo ""; \
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
