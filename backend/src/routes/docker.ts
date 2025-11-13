import { Hono } from "hono";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const docker = new Hono();

/**
 * Get Docker container status
 * GET /api/docker/status
 *
 * Returns real-time status of all Docker containers
 */
docker.get("/status", async (c) => {
  try {
    // Get container status with docker ps
    const { stdout: psOutput } = await execAsync(
      'docker ps -a --filter "name=wander-" --format "{{json .}}"',
    );

    const containers = psOutput
      .trim()
      .split("\n")
      .filter((line) => line)
      .map((line) => JSON.parse(line));

    // Get stats for running containers
    const statsPromises = containers
      .filter((c) => c.State === "running")
      .map(async (container) => {
        try {
          const { stdout } = await execAsync(
            `docker stats ${container.Names} --no-stream --format "{{json .}}"`,
          );
          return JSON.parse(stdout);
        } catch {
          return null;
        }
      });

    const stats = await Promise.all(statsPromises);
    const statsMap = new Map(stats.filter(Boolean).map((s) => [s.Name, s]));

    // Combine container info with stats
    const containerStatus = containers.map((container) => {
      const stat = statsMap.get(container.Names);

      return {
        name: container.Names,
        status: container.State,
        image: container.Image,
        ports: container.Ports,
        created: container.CreatedAt,
        uptime: container.Status,
        cpu: stat?.CPUPerc || "0%",
        memory: stat?.MemUsage || "0B / 0B",
        memoryPercent: stat?.MemPerc || "0%",
      };
    });

    return c.json({
      containers: containerStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Docker status:", error);
    return c.json(
      {
        error: "Failed to fetch Docker status",
        message: error.message,
        containers: [],
      },
      500,
    );
  }
});

/**
 * Get container logs
 * GET /api/docker/logs/:name
 *
 * Returns recent logs from a specific container
 */
docker.get("/logs/:name", async (c) => {
  const containerName = c.req.param("name");
  const lines = c.req.query("lines") || "50";

  try {
    const { stdout } = await execAsync(
      `docker logs ${containerName} --tail ${lines}`,
    );

    return c.json({
      container: containerName,
      logs: stdout.split("\n"),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`Error fetching logs for ${containerName}:`, error);
    return c.json(
      {
        error: "Failed to fetch container logs",
        message: error.message,
        container: containerName,
      },
      500,
    );
  }
});

export default docker;
