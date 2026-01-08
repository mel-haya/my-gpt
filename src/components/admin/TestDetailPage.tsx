"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Play,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { TestDetails, TestRunWithResults } from "@/services/testsService";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { SearchKnowledgeBaseResult } from "@/app/api/chat/tools";

interface TestDetailPageProps {
  testDetails: TestDetails;
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
};

const formatCost = (cost: number | null): string => {
  if (cost === null) return "N/A";
  return (cost).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 6,
  });
};

const formatExecutionTime = (timeMs: number | null): string => {
  if (timeMs === null) return "N/A";
  if (timeMs < 1000) return `${timeMs}ms`;
  return `${(timeMs / 1000).toFixed(2)}s`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Done":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "Failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "Running":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Done":
      return (
        <Badge variant="default" className="bg-green-500">
          Done
        </Badge>
      );
    case "Failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "Running":
      return (
        <Badge variant="secondary" className="bg-blue-500 text-white">
          Running
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getResultStatusBadge = (status: string) => {
  switch (status) {
    case "Success":
      return (
        <Badge variant="default" className="bg-green-500">
          Success
        </Badge>
      );
    case "Failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "Running":
      return (
        <Badge variant="secondary" className="bg-blue-500 text-white">
          Running
        </Badge>
      );
    case "Evaluating":
      return (
        <Badge variant="outline" className="bg-yellow-500 text-white">
          Evaluating
        </Badge>
      );
    case "Pending":
      return (
        <Badge variant="outline" className="bg-gray-500 text-white">
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Component to render tool calls
interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: {
    input?: unknown;
    output?: SearchKnowledgeBaseResult;
  };
}

const ToolCallsDisplay = ({
  toolCalls,
}: {
  toolCalls: unknown;
}): React.ReactElement | null => {
  // Type guard to check if toolCalls is an array of ToolCall objects
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return null;
  }

  // Filter for only search knowledge base tool calls
  const searchKnowledgeBaseCalls = toolCalls.filter(
    (item): item is ToolCall =>
      typeof item === "object" &&
      item !== null &&
      "toolName" in item &&
      item.toolName === "searchKnowledgeBase"
  );

  if (searchKnowledgeBaseCalls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm">Knowledge Base Search:</h5>
      <div className="space-y-2">
        {searchKnowledgeBaseCalls.map((toolCall, index) => (
          <Tool key={toolCall.toolCallId || index} defaultOpen={false}>
            <ToolHeader
              title="Search Knowledge Base"
              type="tool-call"
              state={
                toolCall.result?.output ? "output-available" : "output-error"
              }
            />
            <ToolContent>
              <ToolInput input={toolCall.result?.input} />
              <ToolOutput
                output={toolCall.result?.output}
                errorText={undefined}
                toolName={toolCall.toolName}
              />
            </ToolContent>
          </Tool>
        ))}
      </div>
    </div>
  );
};

export default function TestDetailPage({ testDetails }: TestDetailPageProps) {
  const router = useRouter();
  const { test, latestRun, latestIndividualResult, allRuns } = testDetails;

  // Determine the actual latest test result (individual vs bulk run)
  const getLatestTestResult = () => {
    if (!latestRun && !latestIndividualResult) return null;
    if (!latestRun && latestIndividualResult)
      return { type: "individual" as const, result: latestIndividualResult };
    if (!latestIndividualResult && latestRun)
      return { type: "bulk" as const, result: latestRun };

    // Both exist, compare timestamps - individual results have created_at, bulk runs have launched_at
    if (latestRun && latestIndividualResult) {
      const bulkDate = latestRun.launched_at;
      const individualDate = latestIndividualResult.created_at;

      return individualDate > bulkDate
        ? { type: "individual" as const, result: latestIndividualResult }
        : { type: "bulk" as const, result: latestRun };
    }

    return null;
  };

  const latestTestResult = getLatestTestResult();

  const testRunsColumns: ColumnDef<TestRunWithResults>[] = [
    {
      accessorKey: "id",
      header: "Run ID",
      size: 100,
      cell: ({ row }) => (
        <div className="font-mono text-sm">#{row.getValue("id")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 120,
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "launched_at",
      header: "Launched",
      size: 180,
      cell: ({ row }) => {
        const date = row.getValue("launched_at") as Date;
        return (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      accessorKey: "username",
      header: "User",
      size: 120,
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("username") || "N/A"}</div>
      ),
    },
    {
      id: "results",
      header: "Results",
      cell: ({ row }) => {
        const run = row.original;
        const testResult = run.results.find((r) => r.test_id === test.id);

        if (!testResult) {
          return <span className="text-sm text-gray-500">No results</span>;
        }

        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {getResultStatusBadge(testResult.status)}
              {testResult.score && (
                <Badge variant="outline" className={`text-xs ${
                  testResult.score >= 9 ? "bg-green-100 text-green-800" :
                  testResult.score >= 7 ? "bg-blue-100 text-blue-800" :
                  testResult.score >= 5 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {testResult.score}/10
                </Badge>
              )}
              {testResult.output && (
                <div className="max-w-xs">
                  <div
                    className="text-xs text-gray-600 dark:text-gray-400 truncate"
                    title={testResult.output}
                  >
                    {testResult.output}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests</span>
        </Button>
      </div>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <span>{test.name}</span>
            <Badge variant="outline">Test #{test.id}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>Created by: {test.created_by_username || "Unknown"}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Created: {formatDate(test.created_at)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Latest test result:{" "}
                  {latestTestResult
                    ? latestTestResult.type === "individual"
                      ? latestTestResult.result.status
                      : (latestTestResult.type === "bulk" &&
                          latestTestResult.result.results.find(
                            (r) => r.test_id === test.id
                          )?.status) ||
                        "None"
                    : "None"}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Updated: {formatDate(test.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                Prompt:
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">{test.prompt}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                Expected Result:
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">
                  {test.expected_result}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Test Run */}
      {latestTestResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Latest Test Result</span>
              <Badge variant="outline" className="text-xs">
                {latestTestResult.type === "individual"
                  ? "Individual Run"
                  : "Bulk Run"}
              </Badge>
              {latestTestResult.type === "bulk" &&
                getStatusIcon(latestTestResult.result.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestTestResult.type === "individual" ? (
              /* Individual Test Result */
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Result ID:</span>
                      <Badge variant="outline">
                        #{latestTestResult.result.id}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Status:</span>
                      {getResultStatusBadge(latestTestResult.result.status)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Cost:</span>
                      <span className="text-sm">{formatCost(latestTestResult.result.tokens_cost)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Executed:</span>{" "}
                      {formatDate(latestTestResult.result.created_at)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Type:</span> Individual Test
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Execution Time:</span>{" "}
                      {formatExecutionTime(latestTestResult.result.execution_time_ms)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Result:</h5>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Status:</span>
                      {getResultStatusBadge(latestTestResult.result.status)}
                    </div>
                    {latestTestResult.result.score && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Score:</span>
                        <Badge variant="outline" className={`${
                          latestTestResult.result.score >= 9 ? "bg-green-100 text-green-800" :
                          latestTestResult.result.score >= 7 ? "bg-blue-100 text-blue-800" :
                          latestTestResult.result.score >= 5 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {latestTestResult.result.score}/10
                        </Badge>
                      </div>
                    )}
                    {latestTestResult.result.output && (
                      <div>
                        <span className="text-sm font-medium">Output:</span>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                          <pre className="text-xs whitespace-pre-wrap">
                            {latestTestResult.result.output}
                          </pre>
                        </div>
                      </div>
                    )}
                    {latestTestResult.result.explanation && (
                      <div>
                        <span className="text-sm font-medium">
                          Explanation:
                        </span>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                          <pre className="text-xs whitespace-pre-wrap">
                            {latestTestResult.result.explanation}
                          </pre>
                        </div>
                      </div>
                    )}
                    {Boolean(latestTestResult.result.tool_calls) && (
                      <ToolCallsDisplay
                        toolCalls={latestTestResult.result.tool_calls}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Bulk Test Run Result */
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Run ID:</span>
                      <Badge variant="outline">
                        #{latestTestResult.result.id}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Status:</span>
                      {getStatusBadge(latestTestResult.result.status)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Launched:</span>{" "}
                      {formatDate(latestTestResult.result.launched_at)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">By:</span>{" "}
                      {latestTestResult.result.username || "Unknown"}
                    </div>
                  </div>
                </div>

                {latestTestResult.type === "bulk" &&
                  latestTestResult.result.results.length > 0 &&
                  (() => {
                    const testResult = latestTestResult.result.results.find(
                      (r) => r.test_id === test.id
                    );
                    return testResult ? (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Result:</h5>
                        <div className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Status:</span>
                              {getResultStatusBadge(testResult.status)}
                            </div>
                            {testResult.score && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">Score:</span>
                                <Badge variant="outline" className={`${
                                  testResult.score >= 9 ? "bg-green-100 text-green-800" :
                                  testResult.score >= 7 ? "bg-blue-100 text-blue-800" :
                                  testResult.score >= 5 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {testResult.score}/10
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Cost:</span>{" "}
                                {formatCost(testResult.tokens_cost)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Execution Time:</span>{" "}
                                {formatExecutionTime(testResult.execution_time_ms)}
                              </div>
                            </div>
                          </div>
                          {testResult.output && (
                            <div>
                              <span className="text-sm font-medium">
                                Output:
                              </span>
                              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                                <pre className="text-xs whitespace-pre-wrap">
                                  {testResult.output}
                                </pre>
                              </div>
                            </div>
                          )}
                          {testResult.explanation && (
                            <div>
                              <span className="text-sm font-medium">
                                Explanation:
                              </span>
                              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                                <pre className="text-xs whitespace-pre-wrap">
                                  {testResult.explanation}
                                </pre>
                              </div>
                            </div>
                          )}
                          {Boolean(testResult.tool_calls) && (
                            <ToolCallsDisplay
                              toolCalls={testResult.tool_calls}
                            />
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Test Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Test Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {allRuns.length > 0 ? (
            <DataTable
              columns={testRunsColumns}
              data={allRuns}
              emptyMessage="No test runs found for this test."
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No test runs found for this test.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
