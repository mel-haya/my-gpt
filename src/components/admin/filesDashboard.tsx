"use client";

import { useState, useEffect, useTransition } from "react";
import FilesTable from "./FilesTable";
import { getFilesWithStatus } from "@/app/actions/files";
import type {
  UploadedFileWithUser,
} from "@/services/filesService";
import StatisticsCards from "./statisticsCards";

export default function FilesDashboard() {
  const [files, setFiles] = useState<UploadedFileWithUser[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [statistics, setStatistics] = useState({
    activeFilesCount: 0,
    totalDocumentsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchFiles = (
    page: number = currentPage,
    search: string = searchQuery
  ) => {
    startTransition(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getFilesWithStatus(
          search || undefined,
          itemsPerPage,
          page
        );
        setFiles(data.files);
        setPagination(data.pagination);
        setStatistics(data.statistics);
        setCurrentPage(page);
        setSearchQuery(search);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
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
    <div className="flex flex-col w-full max-w-[1400px] mx-4 2xl:mx-auto my-4 gap-4">

      <StatisticsCards
        totalFiles={pagination.totalCount}
        activeFilesCount={statistics.activeFilesCount}
        totalDocumentsCount={statistics.totalDocumentsCount}
      />
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
