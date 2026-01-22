import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import type { SessionRunResult } from "@/app/actions/testSessions";

interface RecentRunsListProps {
  runs: SessionRunResult[];
  loading: boolean;
  onRunSelected?: (runId: number) => void;
}

export function RecentRunsList({
  runs,
  loading,
  onRunSelected,
}: RecentRunsListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Recent Runs</h3>
      {loading ? (
        <Card>
          <CardContent className="pt-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading recent runs...</p>
          </CardContent>
        </Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="pt-4 text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No recent runs found</p>
            <p className="text-sm">Run this session to see results here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Card
              key={run.testRunId}
              className="hover:shadow-sm transition-shadow"
              onClick={() => onRunSelected?.(run.testRunId)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">Run #{run.testRunId}</h4>
                      {run.status === "Running" ? (
                        <Badge variant="default" className="bg-blue-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Running
                        </Badge>
                      ) : run.status === "Done" ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : run.status === "Failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Stopped
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Total: {run.totalTests}</span>
                      {run.results && (
                        <>
                          <span className="text-green-600">
                            ✓ {run.results.success}
                          </span>
                          <span className="text-red-600">
                            ✗ {run.results.failed}
                          </span>
                          {run.results.pending > 0 && (
                            <span className="text-gray-600">
                              ⏳ {run.results.pending}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {run.completedTests}/{run.totalTests}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(
                          (run.completedTests / run.totalTests) * 100,
                        )}
                        %
                      </div>
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          run.status === "Done"
                            ? "bg-green-500"
                            : run.status === "Failed"
                              ? "bg-red-500"
                              : "bg-blue-500"
                        }`}
                        style={{
                          width: `${
                            (run.completedTests / run.totalTests) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
