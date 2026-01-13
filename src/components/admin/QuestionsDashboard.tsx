"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parse } from "csv-parse/sync";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TestDialog from "./TestDialog";
import DeleteTestDialog from "./DeleteTestDialog";
import QuestionsList from "./QuestionsList";
import type { TestWithUser } from "@/services/testsService";
import { createTestAction, getTestCategoriesAction } from "@/app/actions/tests";

interface QuestionsDashboardProps {
  initialData: {
    tests: TestWithUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  searchQuery: string;
  categoryQuery: string;
}

export default function QuestionsDashboard({
  initialData,
  searchQuery,
  categoryQuery,
}: QuestionsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [categories, setCategories] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    testId: number;
    testName: string;
  }>({
    isOpen: false,
    testId: 0,
    testName: "",
  });

  const [editTest, setEditTest] = useState<TestWithUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    isOpen: boolean;
    testIds: number[];
  }>({ isOpen: false, testIds: [] });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getTestCategoriesAction();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  // Keep local search query in sync with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (localSearchQuery.trim()) {
        params.set("search", localSearchQuery);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page
      router.push(`/admin/questions?${params.toString()}`);
    });
  };

  const handleCategoryChange = (category: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (category && category !== "all") {
        params.set("category", category);
      } else {
        params.delete("category");
      }
      params.delete("page"); // Reset to first page
      router.push(`/admin/questions?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`/admin/questions?${params.toString()}`);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleDeleteTest = (testId: number, testName: string) => {
    setDeleteDialog({
      isOpen: true,
      testId,
      testName,
    });
  };

  const handleEditTest = (test: TestWithUser) => {
    setEditTest(test);
    setEditDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      testId: 0,
      testName: "",
    });
  };

  const handleDataRefresh = () => {
    router.refresh();
    setSelectedRows(new Set());
  };

  const handleSelectRow = (testId: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(testId);
    } else {
      newSelected.delete(testId);
    }
    setSelectedRows(newSelected);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialog({
      isOpen: true,
      testIds: Array.from(selectedRows),
    });
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedRows(new Set());
    handleDataRefresh();
  };

  const handleCloseBulkDeleteDialog = () => {
    setBulkDeleteDialog({ isOpen: false, testIds: [] });
  };

  const handleImportCSV = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();

      if (!text.trim()) {
        console.error("CSV file appears to be empty");
        return;
      }

      // Parse CSV using csv-parse library with semicolon delimiter
      const records = parse(text, {
        delimiter: ";",
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      if (records.length === 0) {
        console.error("CSV file must contain at least one data row");
        return;
      }

      // Find column names (case insensitive)
      const headers = Object.keys(records[0]);
      const promptColumn =
        headers.find((h) => h.toLowerCase().includes("prompt")) || headers[0];
      const expectedColumn =
        headers.find((h) => h.toLowerCase().includes("expected")) || headers[1];

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          const prompt = record[promptColumn]?.trim() || "";
          const expectedResult = record[expectedColumn]?.trim() || "";

          if (prompt && expectedResult) {
            const result = await createTestAction({
              prompt: prompt,
              expected_result: expectedResult,
            });

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.error("Failed to create test:", result.error);
            }
          }
        } catch (error) {
          errorCount++;
          console.error("Error processing row:", error);
        }
      }

      if (successCount > 0) {
        console.log(
          `Successfully imported ${successCount} tests!${
            errorCount > 0 ? ` ${errorCount} failed.` : ""
          }`
        );
        router.refresh();
      } else {
        console.error("No tests were imported. Please check your CSV format.");
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto my-4 gap-4 px-3">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Questions Pool
        </h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
                <Search className="h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search questions by prompt..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="max-w-sm"
                  disabled={isPending}
                />
                <Button onClick={handleSearch} disabled={isPending} size="sm">
                  Search
                </Button>
                <Select
                  value={categoryQuery || "all"}
                  onValueChange={handleCategoryChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {selectedRows.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedRows.size})
                  </Button>
                )}
                <div className="relative flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 mr-2 text-neutral-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>CSV Format:</p>
                        <p>
                          Headers: <code>prompt;expected_result</code>
                        </p>
                        <p>Delimiter: Semicolon (;)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isImporting || isPending}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isImporting || isPending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isImporting ? "Importing..." : "Import CSV"}
                    </Button>
                  </div>
                </div>

                <TestDialog
                  mode="add"
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Test
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Questions List */}
            <QuestionsList
              tests={initialData.tests}
              onEditTest={handleEditTest}
              onDeleteTest={handleDeleteTest}
              selectedTests={selectedRows}
              onSelectTest={handleSelectRow}
            />

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Page {initialData.pagination.currentPage} of{" "}
                {initialData.pagination.totalPages} (
                {initialData.pagination.totalCount} total questions)
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handlePageChange(initialData.pagination.currentPage - 1)
                  }
                  disabled={
                    !initialData.pagination.hasPreviousPage || isPending
                  }
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handlePageChange(initialData.pagination.currentPage + 1)
                  }
                  disabled={!initialData.pagination.hasNextPage || isPending}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteTestDialog
        testId={deleteDialog.testId}
        testName={deleteDialog.testName}
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDeleteDialog}
        onSuccess={handleDataRefresh}
      />

      {bulkDeleteDialog.testIds.length > 0 && (
        <DeleteTestDialog
          testId={bulkDeleteDialog.testIds[0]} // Pass the first ID for the dialog
          testName={`${bulkDeleteDialog.testIds.length} selected tests`}
          isOpen={bulkDeleteDialog.isOpen}
          onClose={handleCloseBulkDeleteDialog}
          onSuccess={handleBulkDeleteSuccess}
          isBulkDelete={true}
          bulkTestIds={bulkDeleteDialog.testIds}
        />
      )}

      {editTest && (
        <TestDialog
          mode="edit"
          test={editTest}
          isOpen={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditTest(null);
            }
          }}
          onSuccess={() => {
            setEditTest(null);
            setEditDialogOpen(false);
            handleDataRefresh();
          }}
        />
      )}
    </div>
  );
}
