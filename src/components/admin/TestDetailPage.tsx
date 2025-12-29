"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, User, Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { TestDetails, TestRunWithResults } from "@/services/testsService";

interface TestDetailPageProps {
  testDetails: TestDetails;
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Done':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'Running':
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Done':
      return <Badge variant="default" className="bg-green-500">Done</Badge>;
    case 'Failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'Running':
      return <Badge variant="secondary" className="bg-blue-500 text-white">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getResultStatusBadge = (status: string) => {
  switch (status) {
    case 'Success':
      return <Badge variant="default" className="bg-green-500">Success</Badge>;
    case 'Failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'Running':
      return <Badge variant="secondary" className="bg-blue-500 text-white">Running</Badge>;
    case 'Evaluating':
      return <Badge variant="outline" className="bg-yellow-500 text-white">Evaluating</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function TestDetailPage({ testDetails }: TestDetailPageProps) {
  const router = useRouter();
  const { test, latestRun, allRuns } = testDetails;

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
        <div className="text-sm">
          {row.getValue("username") || "N/A"}
        </div>
      ),
    },
    {
      id: "results",
      header: "Results",
      cell: ({ row }) => {
        const run = row.original;
        const testResult = run.results.find(r => r.test_id === test.id);
        
        if (!testResult) {
          return <span className="text-sm text-gray-500">No results</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            {getResultStatusBadge(testResult.status)}
            {testResult.output && (
              <div className="max-w-xs">
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={testResult.output}>
                  {testResult.output}
                </div>
              </div>
            )}
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
        <Button variant="ghost" onClick={handleGoBack} className="flex items-center space-x-2">
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
                <span>Latest test result: {
                  latestRun && latestRun.results.length > 0 
                    ? latestRun.results[0].status 
                    : "None"
                }</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Updated: {formatDate(test.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Prompt:</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">{test.prompt}</pre>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Expected Result:</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">{test.expected_result}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Test Run */}
      {latestRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Latest Test Run</span>
              {getStatusIcon(latestRun.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Run ID:</span>
                  <Badge variant="outline">#{latestRun.id}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(latestRun.status)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Launched:</span> {formatDate(latestRun.launched_at)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">By:</span> {latestRun.username || "Unknown"}
                </div>
              </div>
            </div>

            {latestRun.results.length > 0 && (() => {
              const testResult = latestRun.results.find(r => r.test_id === test.id);
              return testResult ? (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Result:</h5>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Status:</span>
                      {getResultStatusBadge(testResult.status)}
                    </div>
                    {testResult.output && (
                      <div>
                        <span className="text-sm font-medium">Output:</span>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                          <pre className="text-xs whitespace-pre-wrap">{testResult.output}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
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