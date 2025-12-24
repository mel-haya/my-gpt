"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserWithTokenUsage } from "@/services/userService";

interface UsersTableProps {
  users: UserWithTokenUsage[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchQuery: string;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getColumns = (handleRefresh: () => void): ColumnDef<UserWithTokenUsage>[] => [
  {
    accessorKey: "id",
    header: "User ID",
    cell: ({ row }) => (
      <div className="font-medium text-xs text-neutral-600 dark:text-neutral-400">
        {(row.getValue("id") as string).slice(0, 8)}...
      </div>
    ),
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("username")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-neutral-600 dark:text-neutral-400">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "totalTokensUsed",
    header: "Tokens Used",
    cell: ({ row }) => {
      const tokens = row.getValue("totalTokensUsed") as number;
      return (
        <div className="font-medium text-center">
          <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-bold bg-green-100 text-green-800 rounded-full dark:bg-green-900/20 dark:text-green-300">
            {formatNumber(tokens)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "totalMessagesCount",
    header: "Messages Sent",
    cell: ({ row }) => {
      const messages = row.getValue("totalMessagesCount") as number;
      return (
        <div className="font-medium text-center">
          <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-bold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/20 dark:text-blue-300">
            {formatNumber(messages)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as Date;
      return (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(date)}
        </div>
      );
    },
  },
];

function UsersTableSkeleton() {
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Users</h3>
        <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
      </div>
      <div className="w-full">
        <div className="flex items-center py-4">
          <div className="h-10 w-80 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
        <div className="rounded-md border">
          <div className="w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800">
              <div className="flex">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 px-4 flex items-center text-left font-medium text-neutral-500 dark:text-neutral-400">
                    <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-16 px-4 flex items-center">
                      <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersTable({ 
  users, 
  pagination, 
  searchQuery 
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      if (searchQuery) {
        params.set('search', searchQuery);
      } else {
        params.delete('search');
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('page', '1');
      if (searchInput.trim()) {
        params.set('search', searchInput.trim());
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Users</h3>
        <div className="flex gap-2 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 lg:px-3"
                onClick={() => {
                  setSearchInput("");
                  startTransition(() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('search');
                    params.set('page', '1');
                    router.push(`?${params.toString()}`);
                  });
                }}
              >
                Clear
              </Button>
            )}
          </form>
          <Button 
            onClick={handleRefresh}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            {isPending ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      <DataTable columns={getColumns(handleRefresh)} data={users} />
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">
          Showing {users.length} of {pagination.totalCount} users
          {pagination.totalPages > 1 && (
            <span> (Page {pagination.currentPage} of {pagination.totalPages})</span>
          )}
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || isPending}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  const start = Math.max(1, pagination.currentPage - 2);
                  const end = Math.min(pagination.totalPages, start + 4);
                  const adjustedStart = Math.max(1, end - 4);
                  pageNum = adjustedStart + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isPending}
                    variant={pagination.currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || isPending}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}