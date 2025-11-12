# ============================================
# Stage 1: Builder - Install dependencies and prepare for build
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
# This layer only rebuilds if package.json or bun.lock changes
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig.json ./

# Type check (optional but good practice)
RUN bun run --bun tsc --noEmit || true

# ============================================
# Stage 2: Runtime - Minimal production image
# ============================================
FROM oven/bun:1-slim AS runtime

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/src ./src
COPY --from=builder --chown=hono:nodejs /app/scripts ./scripts
COPY --from=builder --chown=hono:nodejs /app/package.json ./
COPY --from=builder --chown=hono:nodejs /app/tsconfig.json ./

# Switch to non-root user
USER hono

# Expose application port
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:8080/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start the application
CMD ["bun", "run", "src/index.ts"]
