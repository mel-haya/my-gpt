"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileActionButtons from "./FileActionButtons";
import type { UploadedFileWithUser } from "@/services/filesService";
import UploadFile from "./UploadFile";

interface FilesTableProps {
  files: UploadedFileWithUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchQuery: string;
}

function FileStatusBadge({ status }: { status: UploadedFileWithUser["status"] }) {
  const statusStyles = {
    processing: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700",
    completed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
    failed: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
  };

  return (
    <span 
      className={`px-2 py-1 rounded-md text-xs font-medium border ${statusStyles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const getColumns = (handleRefresh: () => void): ColumnDef<UploadedFileWithUser>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "fileName",
    header: "File Name",
    cell: ({ row }) => (
      <div>{row.getValue("fileName")}</div>
    ),
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => (
      <div className="text-neutral-600 dark:text-neutral-400">
        {row.getValue("username") || "Unknown"}
      </div>
    ),
  },
  {
    accessorKey: "documentCount",
    header: "Documents",
    cell: ({ row }) => {
      const count = row.getValue("documentCount") as number;
      return (
        <div className="font-medium text-center">
          <span className="inline-flex items-center justify-center w-8 h-8 text-xs font-bold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/20 dark:text-blue-300">
            {count}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <FileStatusBadge status={row.getValue("status")} />
    ),
  },
  {
    accessorKey: "active",
    header: "Active",
    cell: ({ row }) => {
      const isActive = row.getValue("active") as boolean;
      return (
        <span 
          className={`px-2 py-1 rounded-md text-xs font-medium border ${
            isActive 
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700'
              : 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-900/20 dark:text-neutral-300 dark:border-neutral-700'
          }`}
        >
          {isActive ? "Yes" : "No"}
        </span>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const file = row.original;
      return (
        <FileActionButtons
          fileId={file.id}
          fileName={file.fileName}
          active={file.active}
          onUpdate={handleRefresh}
        />
      );
    },
  },
];


export default function FilesTable({ 
  files, 
  pagination, 
  searchQuery 
}: FilesTableProps) {
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
        params.set('search', searchInput);
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    // Only clear search when input is completely empty, but don't auto-search on every keystroke
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg ">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Uploaded Files</h3>
        <div className="flex gap-2 items-center">
          <UploadFile onUploadComplete={handleRefresh} />
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search files..."
              value={searchInput}
              onChange={handleSearchInputChange}
              className="w-48"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            {searchQuery && (
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
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
      
      <DataTable columns={getColumns(handleRefresh)} data={files} emptyMessage="No files found."/>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">
          Showing {files.length} of {pagination.totalCount} files
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