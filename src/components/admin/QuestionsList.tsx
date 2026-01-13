"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit } from "lucide-react";
import type { TestWithUser } from "@/services/testsService";

import { Checkbox } from "@/components/ui/checkbox";

interface QuestionsListProps {
  tests: TestWithUser[];
  onEditTest: (test: TestWithUser) => void;
  onDeleteTest: (testId: number, testName: string) => void;
  selectedTests: Set<number>;
  onSelectTest: (testId: number, checked: boolean) => void;
}

export default function QuestionsList({
  tests,
  onEditTest,
  onDeleteTest,
  selectedTests,
  onSelectTest,
}: QuestionsListProps) {
  if (tests.length === 0) {
    return (
      <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
        No questions found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => (
        <Card
          key={test.id}
          className="relative overflow-hidden hover:shadow-md transition-shadow"
        >
          <CardContent className="px-4 py-4">
            <div className="flex justify-between items-start gap-3">
              <div className="pt-1">
                <Checkbox
                  checked={selectedTests.has(test.id)}
                  onCheckedChange={(checked) =>
                    onSelectTest(test.id, !!checked)
                  }
                  aria-label={`Select test ${test.id}`}
                />
              </div>

              <div className="space-y-2 flex-1">
                {test.category && (
                  <div>
                    <Badge variant="secondary">{test.category}</Badge>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-tight">
                    {test.prompt}
                  </h3>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Expected Result:
                  </h2>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 wrap-break-word">
                    {test.expected_result.replace(/[\n\r]+/g, " ")}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditTest(test)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteTest(test.id, `Test #${test.id}`)}
                  title="Delete"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
