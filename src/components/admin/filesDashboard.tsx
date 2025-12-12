"use client";

import { useState, useEffect, useTransition } from "react";
import UploadFile from "@/components/admin/UploadFile";
import FilesTable from "./FilesTable";
import { getFilesWithStatus } from "@/app/actions/files";
import type { UploadedFileWithUser, PaginatedUploadedFiles } from "@/services/filesService";

export default function FilesDashboard() {
  const [files, setFiles] = useState<UploadedFileWithUser[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchFiles = (page: number = currentPage, search: string = searchQuery) => {
    startTransition(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getFilesWithStatus(search || undefined, itemsPerPage, page);
        setFiles(data.files);
        setPagination(data.pagination);
        setCurrentPage(page);
        setSearchQuery(search);
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

  const handlePageChange = (page: number) => {
    fetchFiles(page, searchQuery);
  };

  const handleSearch = (query: string) => {
    fetchFiles(1, query);
  };

  return (
    <div className="flex flex-col">
      <UploadFile />
      <FilesTable 
        files={files}
        loading={loading}
        error={error}
        isPending={isPending}
        pagination={pagination}
        onRefresh={() => fetchFiles(currentPage, searchQuery)}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
      />
    </div>
  );
}
