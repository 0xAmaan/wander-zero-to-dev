import { fetchHealth } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ServiceHealthPanel = async () => {
  let healthData;
  let error;

  try {
    healthData = await fetchHealth();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to fetch health data";
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  const isHealthy = healthData.status === "healthy";
  const services = [
    {
      name: "API",
      connected: isHealthy,
      latency: 0, // API itself - we just connected to it
    },
    {
      name: "PostgreSQL",
      connected: healthData.services.postgres.connected,
      latency: healthData.services.postgres.latency,
    },
    {
      name: "Redis",
      connected: healthData.services.redis.connected,
      latency: healthData.services.redis.latency,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Service Health</CardTitle>
          <Badge variant={isHealthy ? "success" : "destructive"}>
            {isHealthy ? "All Systems Operational" : "Degraded"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-accent/50"
            >
              {/* Status indicator */}
              <div
                className={`h-3 w-3 rounded-full ${
                  service.connected ? "bg-green-500" : "bg-red-500"
                }`}
                aria-label={service.connected ? "Connected" : "Disconnected"}
              />

              {/* Service info */}
              <div className="flex-1">
                <div className="font-medium text-sm">{service.name}</div>
                <div className="text-xs text-muted-foreground">
                  {service.connected ? `${service.latency}ms` : "Offline"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
