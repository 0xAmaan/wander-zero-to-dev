import { Suspense } from "react";
import { ServiceHealthPanel } from "@/components/ServiceHealthPanel";
import { StatsCards } from "@/components/StatsCards";
import { DeploymentsList } from "@/components/DeploymentsList";
import { RefreshButton } from "@/components/RefreshButton";
import { AutoRefreshWrapper } from "@/components/AutoRefreshWrapper";
import { DevEnvironmentStatus } from "@/components/DevEnvironmentStatus";
import { DeploymentsListClient } from "@/components/DeploymentsListClient";

// Loading components
const HealthPanelSkeleton = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-32 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
};

const StatsCardsSkeleton = () => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-6 animate-pulse"
        >
          <div className="h-4 bg-muted rounded w-24 mb-4"></div>
          <div className="h-8 bg-muted rounded w-16"></div>
        </div>
      ))}
    </div>
  );
};

const DeploymentsListSkeleton = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-40 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <AutoRefreshWrapper intervalMs={10000}>
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground mt-2">
                Monitor your local dev environment and demo deployment tracker
              </p>
            </div>
            <RefreshButton />
          </div>

          {/* Dev Environment Status - Real data */}
          <DevEnvironmentStatus />

          {/* Service Health Panel */}
          <Suspense fallback={<HealthPanelSkeleton />}>
            <ServiceHealthPanel />
          </Suspense>

          {/* Stats Cards */}
          <Suspense fallback={<StatsCardsSkeleton />}>
            <StatsCards />
          </Suspense>

          {/* Deployments List - Editable demo data */}
          <DeploymentsListClient />
        </div>
      </div>
    </AutoRefreshWrapper>
  );
};

export default DashboardPage;
