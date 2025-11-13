"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DeploymentStatus } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper to format timestamps
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

// Helper to get status badge variant
const getStatusBadge = (status: DeploymentStatus | string | undefined) => {
  const variants: Record<
    string,
    {
      variant: "success" | "destructive" | "default" | "secondary";
      label: string;
    }
  > = {
    completed: { variant: "success" as const, label: "✓ Completed" },
    failed: { variant: "destructive" as const, label: "✗ Failed" },
    in_progress: { variant: "default" as const, label: "⏳ In Progress" },
    pending: { variant: "secondary" as const, label: "⏸ Pending" },
  };

  if (!status || !variants[status]) {
    return { variant: "secondary" as const, label: status || "Unknown" };
  }

  return variants[status];
};

export const DeploymentsListClient = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/deployments?limit=50`);
      const data = await res.json();
      setDeployments(data.data || []);
      setIsCached(data.cached || false);
      setError(null);
    } catch (err) {
      setError("Failed to fetch deployments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this deployment?")) return;

    try {
      const res = await fetch(`${API_URL}/api/deployments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from local state
        setDeployments(deployments.filter((d) => d.id !== id));
      } else {
        alert("Failed to delete deployment");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete deployment");
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No deployments found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Deployments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Demo CRUD - Try editing or deleting!
            </p>
          </div>
          {isCached && (
            <Badge variant="outline" className="text-xs">
              ⚡ Cache Hit
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deployed By</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => {
              const serviceName = deployment.service_name || "Unknown";
              const environmentName = deployment.environment_name || "Unknown";
              const statusBadge = getStatusBadge(deployment.status);
              const timeStamp = deployment.completed_at || deployment.started_at;

              return (
                <TableRow key={deployment.id}>
                  <TableCell className="font-medium">{serviceName}</TableCell>
                  <TableCell>
                    <span className="capitalize">{environmentName}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {deployment.version || "N/A"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge.variant}>
                      {statusBadge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {deployment.deployed_by}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatTimeAgo(timeStamp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(deployment.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
