-- Migration 001: Initial Schema
-- Description: Create tables for services, environments, and deployments

-- =============================================================================
-- TABLES
-- =============================================================================

-- Services table: Stores information about each service in the system
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  repository_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environments table: Stores deployment environments (dev, staging, production)
CREATE TABLE IF NOT EXISTS environments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments table: Stores deployment records for services in environments
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  environment_id INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  deployed_by VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for quickly finding deployments by service
CREATE INDEX IF NOT EXISTS idx_deployments_service
  ON deployments(service_id);

-- Index for quickly finding deployments by environment
CREATE INDEX IF NOT EXISTS idx_deployments_environment
  ON deployments(environment_id);

-- Index for filtering deployments by status
CREATE INDEX IF NOT EXISTS idx_deployments_status
  ON deployments(status);

-- Index for sorting deployments by start time (most recent first)
CREATE INDEX IF NOT EXISTS idx_deployments_started_at
  ON deployments(started_at DESC);

-- Composite index for common query patterns (environment + status + time)
CREATE INDEX IF NOT EXISTS idx_deployments_env_status_time
  ON deployments(environment_id, status, started_at DESC);

-- =============================================================================
-- COMMENTS (PostgreSQL Documentation)
-- =============================================================================

COMMENT ON TABLE services IS 'Microservices tracked in the deployment system';
COMMENT ON TABLE environments IS 'Deployment environments (development, staging, production)';
COMMENT ON TABLE deployments IS 'Historical record of all deployments across services and environments';

COMMENT ON COLUMN deployments.status IS 'Current deployment status: pending, in_progress, completed, failed, rolled_back';
COMMENT ON COLUMN deployments.metadata IS 'Additional deployment metadata stored as JSON (commit hash, build info, etc.)';
COMMENT ON COLUMN deployments.error_message IS 'Error details if deployment failed';
