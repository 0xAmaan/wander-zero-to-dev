import { fetchDeployments } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StatsCards = async () => {
  let deploymentsData;
  let error;

  try {
    deploymentsData = await fetchDeployments();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to fetch stats";
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deployments = deploymentsData?.data || [];
  const totalDeployments = deployments.length;
  const completedDeployments = deployments.filter(
    (d) => d.status === "completed"
  ).length;
  const failedDeployments = deployments.filter(
    (d) => d.status === "failed"
  ).length;

  const successRate =
    totalDeployments > 0
      ? ((completedDeployments / totalDeployments) * 100).toFixed(1)
      : "0.0";

  const stats = [
    {
      title: "Total Deployments",
      value: totalDeployments.toString(),
      description: "Across all environments",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      description: `${completedDeployments} successful`,
    },
    {
      title: "Failed Deployments",
      value: failedDeployments.toString(),
      description: "Requiring attention",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
