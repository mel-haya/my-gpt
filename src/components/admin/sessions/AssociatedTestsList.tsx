import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Play,
  RefreshCcw,
  ListTodo,
  Eye,
  Medal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import TestResultsList from "@/components/admin/TestResultsList";
import type { DetailedTestProfile } from "@/services/testProfilesService";
import type { TestInProfileDetailResult } from "@/app/actions/testSessions";

interface AssociatedTestsListProps {
  tests: DetailedTestProfile["tests"];
  selectedTestId: number | string | null;
  testDetailsData: TestInProfileDetailResult | null;
  testDetailsLoading: boolean;
  regeneratingTests: Set<number | string>;
  reEvaluatingTests: Set<number | string>;
  onRegenerateTest: (testId: number | string, model?: string) => void;
  onReEvaluateTest: (testId: number | string) => void;
  onToggleTestDetails: (testId: number | string) => void;
}

export function AssociatedTestsList({
  tests,
  selectedTestId,
  testDetailsData,
  testDetailsLoading,
  regeneratingTests,
  reEvaluatingTests,
  onRegenerateTest,
  onReEvaluateTest,
  onToggleTestDetails,
}: AssociatedTestsListProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        className="flex items-center gap-2 mb-3 cursor-pointer group select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
        )}
        <h3 className="text-lg font-semibold">
          Associated Tests ({tests.length})
        </h3>
      </div>
      {expanded &&
        (tests.length === 0 ? (
          <Card>
            <CardContent className="pt-4 text-center text-gray-500">
              <p>No tests associated with this session</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tests.map((test) => (
              <Card
                key={test.test_id}
                className="hover:shadow-sm transition-shadow py-4"
              >
                <CardContent>
                  <div className="flex items-center justify-between mb-2 gap-4">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-base font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-tight"
                        title={test.test_prompt}
                      >
                        {test.test_prompt}
                      </h4>
                    </div>
                    {test.best_model && test.best_score !== null && (
                      <Badge
                        variant="secondary"
                        className="bg-neutral-800 text-[10px] gap-1 py-0 px-2 h-5 border-neutral-700 shrink-0"
                      >
                        <Medal className="w-3 h-3 text-blue-400" />
                        <span className="text-gray-400 font-normal">
                          {test.best_model}:
                        </span>
                        <span className="font-bold text-white">
                          {test.best_score}/10
                        </span>
                      </Badge>
                    )}
                    <div>
                      <Button
                        title={
                          test.best_score === null
                            ? "Run Test"
                            : "Regenerate Test"
                        }
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerateTest(test.test_id);
                        }}
                        disabled={regeneratingTests.has(test.test_id)}
                      >
                        {regeneratingTests.has(test.test_id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : test.best_score === null ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <RefreshCcw className="w-4 h-4" />
                        )}
                      </Button>
                      {test.best_score !== null && (
                        <Button
                          title="Re-evaluate Results"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReEvaluateTest(test.test_id);
                          }}
                          disabled={reEvaluatingTests.has(test.test_id)}
                        >
                          {reEvaluatingTests.has(test.test_id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ListTodo className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-3">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTestDetails(test.test_id);
                        }}
                        disabled={testDetailsLoading}
                      >
                        {testDetailsLoading &&
                        selectedTestId === test.test_id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4 mr-1" />
                        )}
                        {selectedTestId === test.test_id
                          ? "Hide Details"
                          : "View Details"}
                      </Button>
                    </div>

                    {selectedTestId === test.test_id && testDetailsData && (
                      <TestResultsList
                        expectedResult={testDetailsData.test.expected_result}
                        results={testDetailsData.results}
                        onRegenerateModel={(model: string) =>
                          onRegenerateTest(test.test_id, model)
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
