"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestResult {
  runId: number;
  runDate: Date;
  model: string;
  status: string;
  score: number | null;
  explanation: string | null;
  output: string | null;
  tokens_cost: number | null;
  execution_time_ms: number | null;
  evaluator_model: string | null;
}

interface TestResultsListProps {
  expectedResult: string;
  results: TestResult[];
  onRegenerateModel?: (model: string) => void;
}

export default function TestResultsList({
  expectedResult,
  results,
  onRegenerateModel,
}: TestResultsListProps) {
  const [isExpectedResultOpen, setIsExpectedResultOpen] = useState(false);
  const [openResults, setOpenResults] = useState<Record<string, boolean>>({});

  const toggleResult = (model: string) => {
    setOpenResults((prev) => ({
      ...prev,
      [model]: !prev[model],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Success":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "Failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "Running":
      case "Evaluating":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return "N/A";
    return `$${cost.toFixed(6)}`;
  };

  const formatTime = (ms: number | null) => {
    if (ms === null || ms === undefined) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-200 text-gray-700";
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Expected Result Section */}
      <div className="border rounded-md bg-neutral-50 dark:bg-neutral-900/50">
        <button
          onClick={() => setIsExpectedResultOpen(!isExpectedResultOpen)}
          className="flex items-center justify-between w-full p-3 text-sm font-medium text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors rounded-t-md"
        >
          <span className="flex items-center gap-2">
            {isExpectedResultOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Expected Result / Ground Truth
          </span>
        </button>
        {isExpectedResultOpen && (
          <div className="p-3 border-t bg-white dark:bg-neutral-950 rounded-b-md">
            <pre className="text-xs whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-300">
              {expectedResult}
            </pre>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">
          Latest Model Executions
        </h4>
        {results.length === 0 ? (
          <div className="text-center py-6 text-gray-500 border rounded-md border-dashed">
            <p className="text-sm">No results available yet.</p>
          </div>
        ) : (
          results.map((result) => (
            <div
              key={result.model}
              className="border rounded-md overflow-hidden bg-white dark:bg-neutral-950"
            >
              {/* Result Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                onClick={() => toggleResult(result.model)}
              >
                <div className="flex items-center gap-3">
                  {openResults[result.model] ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-medium text-sm">{result.model}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Regenerate Button */}
                  {onRegenerateModel && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateModel(result.model);
                      }}
                      disabled={
                        result.status === "Running" ||
                        result.status === "Evaluating"
                      }
                      title="Regenerate this model"
                    >
                      <RefreshCcw
                        className={cn(
                          "w-3.5 h-3.5",
                          (result.status === "Running" ||
                            result.status === "Evaluating") &&
                            "animate-spin text-blue-500"
                        )}
                      />
                    </Button>
                  )}

                  {/* Status */}
                  {getStatusBadge(result.status)}

                  {/* Score */}
                  {result.score !== null && (
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold border",
                        getScoreColor(result.score)
                      )}
                    >
                      Score: {result.score}/10
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 border-l pl-3 ml-1 md:flex">
                    <span
                      className="flex items-center gap-1"
                      title="Token Cost"
                    >
                      <Coins className="w-3 h-3" />
                      {formatCost(result.tokens_cost)}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title="Execution Time"
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(result.execution_time_ms)}
                    </span>
                  </div>

                  {/* Evaluator Model */}
                  {result.evaluator_model && (
                    <span className="text-[10px] text-gray-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded sm:block hidden">
                      Eva: {result.evaluator_model.split("/").pop()}
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(result.runDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Collapsible Content */}
              {openResults[result.model] && (
                <div className="border-t">
                  <div className="p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/20">
                    {/* Execution Metrics (Visible on mobile if hidden above, or just always show in detail view too) */}
                    <div className="flex gap-4 text-xs text-gray-500 md:hidden pb-2 border-b">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" /> Cost:{" "}
                        {formatCost(result.tokens_cost)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time:{" "}
                        {formatTime(result.execution_time_ms)}
                      </span>
                    </div>

                    {/* Output */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 mb-1">
                        Model Output
                      </h5>
                      <div className="bg-white dark:bg-black border rounded p-3 text-sm">
                        {result.output ? (
                          <div className="whitespace-pre-wrap">
                            {result.output}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">
                            No output available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Explanation */}
                    {result.explanation && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 mb-1">
                          Evaluation Explanation
                        </h5>
                        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded p-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="whitespace-pre-wrap">
                            {result.explanation}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
