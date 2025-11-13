import type {
  HealthStatus,
  ApiResponse,
  Deployment,
  Service,
  Environment,
  DeploymentFilters,
} from "@/types";

// Use internal Kubernetes service for server-side calls (SSR)
// Use localhost:30080 for client-side calls (browser)
const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL_INTERNAL || "http://backend-service:8080" // Server-side (inside K8s pod)
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:30080"; // Client-side (browser)

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const fetchApi = async <T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> => {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      // Disable caching for Next.js - we want fresh data from the API
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

/**
 * Fetch health status from the API
 */
export const fetchHealth = async (): Promise<HealthStatus> => {
  return fetchApi<HealthStatus>("/health");
};

/**
 * Fetch all deployments with optional filters
 */
export const fetchDeployments = async (
  filters?: DeploymentFilters,
): Promise<ApiResponse<Deployment[]>> => {
  const params = new URLSearchParams();
  if (filters?.environment) params.set("environment", filters.environment);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());

  const query = params.toString();
  const endpoint = query ? `/api/deployments?${query}` : "/api/deployments";

  return fetchApi<ApiResponse<Deployment[]>>(endpoint);
};

/**
 * Fetch a single deployment by ID
 */
export const fetchDeployment = async (
  id: number,
): Promise<ApiResponse<Deployment>> => {
  return fetchApi<ApiResponse<Deployment>>(`/api/deployments/${id}`);
};

/**
 * Create a new deployment
 */
export const createDeployment = async (data: {
  service_id: number;
  environment_id: number;
  version: string;
  deployed_by: string;
}): Promise<ApiResponse<Deployment>> => {
  return fetchApi<ApiResponse<Deployment>>("/api/deployments", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Fetch all services
 */
export const fetchServices = async (): Promise<ApiResponse<Service[]>> => {
  return fetchApi<ApiResponse<Service[]>>("/api/services");
};

/**
 * Fetch all environments
 */
export const fetchEnvironments = async (): Promise<
  ApiResponse<Environment[]>
> => {
  return fetchApi<ApiResponse<Environment[]>>("/api/environments");
};

/**
 * Clear the cache
 */
export const clearCache = async (): Promise<{ message: string }> => {
  return fetchApi<{ message: string }>("/api/cache", {
    method: "DELETE",
  });
};

export { ApiError };
