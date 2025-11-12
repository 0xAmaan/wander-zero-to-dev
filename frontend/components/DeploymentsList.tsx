import { fetchDeployments } from "@/lib/api-client";
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

export const DeploymentsList = async () => {
  let deploymentsData;
  let error;

  try {
    deploymentsData = await fetchDeployments({ limit: 50 });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to fetch deployments";
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

  const deployments = deploymentsData?.data || [];
  const isCached = deploymentsData?.cached || false;

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
          <CardTitle>Recent Deployments</CardTitle>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => {
              // Handle both nested and flat structures from API
              const serviceName =
                (deployment as any).service?.name ||
                (deployment as any).service_name ||
                "Unknown";
              const environmentName =
                (deployment as any).environment?.name ||
                (deployment as any).environment_name ||
                "Unknown";

              // Safely get status badge with fallback
              const status = (deployment as any).status;
              const statusBadge = getStatusBadge(status);
              const timeStamp =
                deployment.completed_at || deployment.started_at;

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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
