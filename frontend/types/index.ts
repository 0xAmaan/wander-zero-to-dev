// Service types
export interface Service {
  id: number;
  name: string;
  description?: string;
  repository_url?: string;
  created_at?: string;
}

// Environment types
export interface Environment {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

// Deployment types
export type DeploymentStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface Deployment {
  id: number;
  service: Service;
  environment: Environment;
  version: string;
  status: DeploymentStatus;
  deployed_by: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

// Health status types
export interface ServiceHealth {
  connected: boolean;
  latency: number;
}

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  services: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  cached?: boolean;
  count?: number;
  message?: string;
}

// Deployment filters
export interface DeploymentFilters {
  environment?: string;
  status?: DeploymentStatus;
  limit?: number;
}
