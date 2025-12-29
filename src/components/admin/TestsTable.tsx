"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import TestDialog from "./TestDialog";
import DeleteTestDialog from "./DeleteTestDialog";
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
  onViewDetails: (testId: number) => void
): ColumnDef<TestWithUser>[] => [
  {
    accessorKey: "name",
    header: "Test Name",
    size: 400, // Make the Test Name column larger
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
    accessorKey: "username",
    header: "User",
    size: 150, // Fit content for User column
    cell: ({ row }) => (
      <div className="font-medium text-sm">
        {row.getValue("username") || "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created Date",
    size: 200, // Fit content for Created Date column
    meta: {
      className: "hidden xl:table-cell",
    },
    cell: ({ row }) => {
      const date = row.getValue("created_at") as Date;
      return (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(date)}
        </div>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: "Updated Date",
    size: 200, // Fit content for Updated Date column
    meta: {
      className: "hidden xl:table-cell",
    },
    cell: ({ row }) => {
      const date = row.getValue("updated_at") as Date;
      return (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(date)}
        </div>
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

export default function TestsTable({ tests, pagination, searchQuery, onRefreshRef }: TestsTableProps) {
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
    // Refresh the page to show updated data
    router.refresh();
  };

  const columns = getColumns(() => {
    // Add refresh logic if needed
  }, handleDeleteTest, handleEditTest, handleViewDetails);

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
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row');
        return;
      }

      // Parse CSV (expecting prompt;expectedResult columns with ; delimiter)
      const header = lines[0].toLowerCase();
      const promptIndex = header.includes('prompt') ? 
        header.split(';').findIndex(col => col.trim().includes('prompt')) : 0;
      const expectedIndex = header.includes('expected') ? 
        header.split(';').findIndex(col => col.trim().includes('expected')) : 1;

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ';' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      // Process data rows (skip header)
      const dataRows = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (const line of dataRows) {
        try {
          const columns = parseCSVLine(line);
          const prompt = columns[promptIndex]?.replace(/^"|"$/g, '') || '';
          const expectedResult = columns[expectedIndex]?.replace(/^"|"$/g, '') || '';
          
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
        alert(`Successfully imported ${successCount} tests!${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
        router.refresh();
      } else {
        alert('No tests were imported. Please check your CSV format.');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error reading CSV file. Please make sure it\'s a valid CSV.');
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
              <TestDialog mode="add" onSuccess={() => router.refresh()} />
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
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}