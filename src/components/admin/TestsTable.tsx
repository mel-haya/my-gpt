"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parse } from "csv-parse/sync";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Upload, Trash2, Play, Loader2 } from "lucide-react";
import TestDialog from "./TestDialog";
import DeleteTestDialog from "./DeleteTestDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TestWithUser } from "@/services/testsService";
import { createTestAction } from "@/app/actions/tests";
import { runSingleTestAction } from "@/app/actions/tests";

interface TestsTableProps {
  tests: TestWithUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchQuery: string;
  onRefreshRef?: (refreshFn: () => void) => void;
  onDataRefresh?: () => void;
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getColumns = (
  handleRefresh: () => void,
  onDeleteTest: (testId: number, testName: string) => void,
  onEditTest: (test: TestWithUser) => void,
  onViewDetails: (testId: number) => void,
  selectedRows: Set<number>,
  onSelectRow: (testId: number, checked: boolean) => void,
  onSelectAll: (checked: boolean) => void,
  allTests: TestWithUser[],
  onRunTest: (testId: number) => void,
  runningTests: Set<number>
): ColumnDef<TestWithUser>[] => [
  {
    id: "select",
    header: () => (
      <Checkbox
        checked={selectedRows.size === allTests.length && allTests.length > 0}
        onCheckedChange={(checked: boolean | 'indeterminate') => onSelectAll(!!checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedRows.has(row.original.id)}
        onCheckedChange={(checked: boolean | 'indeterminate') => onSelectRow(row.original.id, !!checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
  },
  {
    accessorKey: "name",
    header: "Test Name",
    size: 200, // Make the Test Name column larger
    cell: ({ row }) => {
      const test = row.original;
      return (
        <div className="font-medium">
          <button
            onClick={() => onViewDetails(test.id)}
            className="text-left truncate hover:text-blue-600 hover:underline transition-colors"
            title={row.getValue("name")}
          >
            {row.getValue("name")}
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: "latest_test_result_output",
    header: "Latest Test Output",
    size: 200,
    cell: ({ row }) => {
      const output = row.original.latest_test_result_output as string | undefined;
      const status = row.original.latest_test_result_status as string | undefined;
      
      if (!output && !status) {
        return (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            No output available
          </div>
        );
      }

      return (
        <div className="max-w-xs">
          <div className="text-sm text-neutral-700 dark:text-neutral-300 truncate" title={output || 'No output'}>
            {output || 'No output'}
          </div>
        </div>
      );
    },
  },
  {
    id: "run",
    header: "Run",
    size: 80,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const test = row.original;
      const isRunning = runningTests.has(test.id);
      
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRunTest(test.id)}
          disabled={isRunning}
          className="h-8 w-8 p-0"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      );
    },
  },
  {
    accessorKey: "latest_test_result_status",
    header: "Latest Result",
    size: 150, // Fit content for Latest Result column
    cell: ({ row }) => {
      const status = row.getValue("latest_test_result_status") as string | undefined;
      const lastRunDate = row.original.latest_test_result_created_at;
      
      if (!status) {
        return (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Never run
          </div>
        );
      }

      const getStatusColor = (status: string) => {
        switch (status) {
          case "Success":
            return "text-green-600 dark:text-green-400";
          case "Failed":
            return "text-red-600 dark:text-red-400";
          case "Running":
            return "text-blue-600 dark:text-blue-400";
          case "Evaluating":
            return "text-yellow-600 dark:text-yellow-400";
          default:
            return "text-neutral-600 dark:text-neutral-400";
        }
      };

      return (
        <div className="space-y-1">
          <div className={`text-sm font-medium ${getStatusColor(status)}`}>
            {status}
          </div>
          {lastRunDate && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 hidden xl:block">
              {formatDate(lastRunDate)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    size: 50, // Fit icon size for Actions column
    cell: ({ row }) => {
      const test = row.original;

      return (
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
              Copy test ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(test.id)}>View details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditTest(test)}>Edit test</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onDeleteTest(test.id, test.name)}
            >
              Delete test
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function TestsTable({ tests, pagination, searchQuery, onRefreshRef, onDataRefresh }: TestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    testId: number;
    testName: string;
  }>({
    isOpen: false,
    testId: 0,
    testName: "",
  });  const [editTest, setEditTest] = useState<TestWithUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    isOpen: boolean;
    testIds: number[];
  }>({ isOpen: false, testIds: [] });
  const [runningTests, setRunningTests] = useState<Set<number>>(new Set());

  // Expose refresh function to parent
  useEffect(() => {
    const refreshTable = () => {
      router.refresh();
    };
    onRefreshRef?.(refreshTable);
  }, [onRefreshRef, router]);
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

  const handleViewDetails = (testId: number) => {
    router.push(`/admin/tests/${testId}`);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      testId: 0,
      testName: "",
    });
  };

  const handleDeleteSuccess = () => {
    // Use parent refresh callback if available, fallback to router refresh
    if (onDataRefresh) {
      onDataRefresh();
    } else {
      router.refresh();
    }
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(tests.map(test => test.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialog({
      isOpen: true,
      testIds: Array.from(selectedRows)
    });
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedRows(new Set());
    // Use parent refresh callback if available, fallback to router refresh
    if (onDataRefresh) {
      onDataRefresh();
    } else {
      router.refresh();
    }
  };

  const handleCloseBulkDeleteDialog = () => {
    setBulkDeleteDialog({ isOpen: false, testIds: [] });
  };

  const handleRunTest = async (testId: number) => {
    setRunningTests(prev => new Set(prev).add(testId));
    
    try {
      const result = await runSingleTestAction(testId);
      
      if (result.success) {
        // Refresh the table data to show updated results
        if (onDataRefresh) {
          onDataRefresh();
        } else {
          router.refresh();
        }
      } else {
        console.error('Failed to run test:', result.error);
      }
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  const columns = getColumns(
    () => {
      // Add refresh logic if needed
    }, 
    handleDeleteTest, 
    handleEditTest, 
    handleViewDetails,
    selectedRows,
    handleSelectRow,
    handleSelectAll,
    tests,
    handleRunTest,
    runningTests
  );

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (localSearchQuery.trim()) {
        params.set("search", localSearchQuery);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page
      router.push(`/admin/tests?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`/admin/tests?${params.toString()}`);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      
      if (!text.trim()) {
        console.error('CSV file appears to be empty');
        return;
      }

      // Parse CSV using csv-parse library with semicolon delimiter
      const records = parse(text, {
        delimiter: ';',
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      if (records.length === 0) {
        console.error('CSV file must contain at least one data row');
        return;
      }

      // Find column names (case insensitive)
      const headers = Object.keys(records[0]);
      const promptColumn = headers.find(h => h.toLowerCase().includes('prompt')) || headers[0];
      const expectedColumn = headers.find(h => h.toLowerCase().includes('expected')) || headers[1];

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          const prompt = record[promptColumn]?.trim() || '';
          const expectedResult = record[expectedColumn]?.trim() || '';
          
          if (prompt && expectedResult) {
            // Generate test name from first few words of prompt
            const testName = prompt.split(' ').slice(0, 6).join(' ') + 
              (prompt.split(' ').length > 6 ? '...' : '');

            const result = await createTestAction({
              name: testName,
              prompt: prompt,
              expected_result: expectedResult
            });

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.error('Failed to create test:', result.error);
            }
          }
        } catch (error) {
          errorCount++;
          console.error('Error processing row:', error);
        }
      }

      if (successCount > 0) {
        console.log(`Successfully imported ${successCount} tests!${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
        if (onDataRefresh) {
          onDataRefresh();
        } else {
          router.refresh();
        }
      } else {
        console.error('No tests were imported. Please check your CSV format.');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search tests by name or prompt..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="max-w-sm"
                disabled={isPending}
              />
              <Button 
                onClick={handleSearch} 
                disabled={isPending}
                size="sm"
              >
                Search
              </Button>
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
                  {isImporting ? 'Importing...' : 'Import CSV'}
                </Button>
              </div>
              <TestDialog mode="add" onSuccess={() => onDataRefresh ? onDataRefresh() : router.refresh()} />
            </div>
          </div>

          {/* Data Table */}
          <div className="border rounded-lg">
            <DataTable columns={columns} data={tests} emptyMessage="No tests found." />
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage || isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage || isPending}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <DeleteTestDialog
        testId={deleteDialog.testId}
        testName={deleteDialog.testName}
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDeleteDialog}
        onSuccess={handleDeleteSuccess}
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
            if (onDataRefresh) {
              onDataRefresh();
            } else {
              router.refresh();
            }
          }}
        />
      )}
    </Card>
  );
}