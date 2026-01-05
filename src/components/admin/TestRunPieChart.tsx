"use client";

import { useEffect, useState, useCallback } from "react";
import { getLatestTestRunStatsAction } from "@/app/actions/tests";
import type { LatestTestRunStats } from "@/services/testsService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";
import { FlaskConical, TrendingUp } from "lucide-react";

interface TestRunPieChartProps {
  onRefreshRef?: (refreshFn: () => void) => void;
}

export default function TestRunPieChart({ onRefreshRef }: TestRunPieChartProps) {
  const [stats, setStats] = useState<LatestTestRunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getLatestTestRunStatsAction();
      setStats(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load test stats"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Expose refresh function to parent
  useEffect(() => {
    onRefreshRef?.(fetchStats);
  }, [onRefreshRef, fetchStats]);

  if (loading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Latest Test Run Results</CardTitle>
          <CardDescription>Loading test statistics...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Latest Test Run Results</CardTitle>
          <CardDescription>Error loading test statistics</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-48">
            <div className="text-red-500 dark:text-red-400">
              <svg
                className="h-16 w-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-center text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  // Handle different states
  if (stats.status === "never_run") {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Latest Test Run Results</CardTitle>
          <CardDescription>No tests have been executed</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-400 dark:text-gray-500">
              <FlaskConical className="h-16 w-16 mx-auto mb-4" />
              <p className="text-center text-gray-600 dark:text-gray-400">
                No tests have been run yet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.status === "running") {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Latest Test Run Results</CardTitle>
          <CardDescription>
            Tests are currently running...
            {stats.lastRunAt && (
              <span className="block text-xs mt-1">
                Started: {new Date(stats.lastRunAt).toLocaleString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-48">
            <div className="text-blue-500 dark:text-blue-400">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle completed state with results
  if (stats.status === "completed" && stats.results) {
    const { success, failed, evaluating, running } = stats.results;
    const total = success + failed + evaluating + running;

    if (total === 0) {
      return (
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Latest Test Run Results</CardTitle>
            <CardDescription>No test results found</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-400 dark:text-gray-500">
                <FlaskConical className="h-16 w-16 mx-auto mb-4" />
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No test results found
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Prepare data for the chart
    const chartData = [];
    if (success > 0) {
      chartData.push({ 
        status: "success", 
        count: success, 
        fill: "var(--color-success)" 
      });
    }
    if (failed > 0) {
      chartData.push({ 
        status: "failed", 
        count: failed, 
        fill: "var(--color-failed)" 
      });
    }
    if (evaluating > 0) {
      chartData.push({ 
        status: "evaluating", 
        count: evaluating, 
        fill: "var(--color-evaluating)" 
      });
    }
    if (running > 0) {
      chartData.push({ 
        status: "running", 
        count: running, 
        fill: "var(--color-running)" 
      });
    }

    const chartConfig = {
      count: {
        label: "Tests",
      },
      success: {
        label: "Success",
        color: "#10b981", // green
      },
      failed: {
        label: "Failed", 
        color: "#ef4444", // red
      },
      evaluating: {
        label: "Evaluating",
        color: "#f59e0b", // amber
      },
      running: {
        label: "Running",
        color: "#3b82f6", // blue
      },
    } satisfies ChartConfig;

    const successRate = ((success / total) * 100).toFixed(1);

    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Test Run Results</CardTitle>
          <CardDescription>
            {stats.lastRunAt && `Completed: ${new Date(stats.lastRunAt).toLocaleString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-62.5"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie 
                data={chartData} 
                dataKey="count" 
                nameKey="status"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            Success rate: {successRate}% <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground leading-none">
            Total: {total} tests executed
          </div>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
