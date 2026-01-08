"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TestWithUser } from "@/services/testsService";

import { Checkbox } from "@/components/ui/checkbox";

interface QuestionsListProps {
  tests: TestWithUser[];
  onEditTest: (test: TestWithUser) => void;
  onDeleteTest: (testId: number, testName: string) => void;
  selectedTests: Set<number>;
  onSelectTest: (testId: number, checked: boolean) => void;
}

export default function QuestionsList({ tests, onEditTest, onDeleteTest, selectedTests, onSelectTest }: QuestionsListProps) {
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
        <Card key={test.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="px-4 py-4">
            <div className="flex justify-between items-start gap-3">
              <div className="pt-1">
                <Checkbox
                  checked={selectedTests.has(test.id)}
                  onCheckedChange={(checked) => onSelectTest(test.id, !!checked)}
                  aria-label={`Select test ${test.id}`}
                />
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-tight">
                    {test.prompt}
                  </h3>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Expected Result:</h2>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 break-words">
                    {test.expected_result.replace(/[\n\r]+/g, " ")}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 -mt-1 -mr-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(test.id.toString())}
                    >
                      Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditTest(test)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => onDeleteTest(test.id, test.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
