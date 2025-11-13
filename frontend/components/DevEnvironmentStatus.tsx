"use client";

import { useEffect, useState } from "react";

interface DockerContainer {
  name: string;
  status: string;
  image: string;
  uptime: string;
  cpu: string;
  memory: string;
  memoryPercent: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const DevEnvironmentStatus = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainerStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/docker/status`);
      const data = await res.json();
      setContainers(data.containers || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch container status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainerStatus();
    // Refresh every 5 seconds
    const interval = setInterval(fetchContainerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Local Dev Environment</h2>
        <span className="text-xs text-muted-foreground">
          Real-time container status
        </span>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {containers.map((container) => (
          <div
            key={container.name}
            className="border border-border rounded-lg p-4 bg-background"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-sm">
                  {container.name.replace("wander-", "").replace("-dev", "")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {container.image}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  container.status === "running"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {container.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono">{container.uptime}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-mono">{container.cpu}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-mono">
                  {container.memory} ({container.memoryPercent})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {containers.length === 0 && !error && (
        <div className="text-center text-muted-foreground py-8">
          No containers running. Run <code className="bg-muted px-2 py-1 rounded text-xs">make dev</code> to start.
        </div>
      )}
    </div>
  );
};
