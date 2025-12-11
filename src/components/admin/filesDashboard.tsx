"use client";

import { useState, useEffect, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SelectUploadedFile } from "@/lib/db-schema";
import UploadFile from "@/components/UploadFile";
import { getFilesWithStatus } from "@/app/actions/files";
import { DataTable } from "@/components/ui/data-table";

function FileStatusBadge({ status }: { status: SelectUploadedFile["status"] }) {
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

const columns: ColumnDef<SelectUploadedFile>[] = [
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <FileStatusBadge status={row.getValue("status")} />
    ),
  },
  {
    accessorKey: "fileHash",
    header: "File Hash",
    cell: ({ row }) => {
      const fileHash = row.getValue("fileHash") as string;
      return (
        <div className="font-mono text-neutral-500 dark:text-neutral-400">
          {fileHash.substring(0, 12)}...
        </div>
      );
    },
  },
];

function FilesTable() {
  const [files, setFiles] = useState<SelectUploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchFiles = () => {
    startTransition(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getFilesWithStatus();
        setFiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (loading && !isPending) {
    return <FilesTableSkeleton />;
  }

  if (error) {
    return (
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Uploaded Files</h3>
          <button 
            onClick={fetchFiles}
            disabled={isPending}
            className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded border disabled:opacity-50"
          >
            {isPending ? 'Loading...' : 'Retry'}
          </button>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Uploaded Files</h3>
        <button 
          onClick={fetchFiles}
          disabled={isPending}
          className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded border disabled:opacity-50"
        >
          {isPending ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <DataTable columns={columns} data={files} />
    </div>
  );
}

function FilesTableSkeleton() {
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Uploaded Files</h3>
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
                <div className="h-12 px-4 flex items-center text-left font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                </div>
                <div className="h-12 px-4 flex items-center text-left font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                </div>
                <div className="h-12 px-4 flex items-center text-left font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                </div>
                <div className="h-12 px-4 flex items-center text-left font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b transition-colors hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50">
                  <div className="flex">
                    <div className="p-4 align-middle">
                      <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                    <div className="p-4 align-middle">
                      <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                    <div className="p-4 align-middle">
                      <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                    <div className="p-4 align-middle">
                      <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            </div>
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FilesDashboard() {
  return (
    <div className="flex flex-col">
      <UploadFile />
      <FilesTable />
    </div>
  );
}
