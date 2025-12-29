"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Search, ChevronLeft, ChevronRight } from "lucide-react";
import AddTestDialog from "./AddTestDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TestWithUser } from "@/services/testsService";

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

const getColumns = (handleRefresh: () => void): ColumnDef<TestWithUser>[] => [
  {
    accessorKey: "name",
    header: "Test Name",
    cell: ({ row }) => (
      <div className="font-medium">
        <div className="truncate" title={row.getValue("name")}>
          {row.getValue("name")}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => (
      <div className="font-medium text-sm">
        {row.getValue("username") || "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created Date",
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
    header: "Updated",
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
    id: "actions",
    enableHiding: false,
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
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit test</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete test</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function TestsTable({ tests, pagination, searchQuery }: TestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const columns = getColumns(() => {
    // Add refresh logic if needed
  });

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (localSearchQuery.trim()) {
        params.set("search", localSearchQuery);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page
      router.push(`?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
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
            
            <AddTestDialog />
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
    </Card>
  );
}