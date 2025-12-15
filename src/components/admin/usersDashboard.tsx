"use client";

import { useState, useEffect, useTransition } from "react";
import UsersTable from "./UsersTable";
import UserStatisticsCards from "./userStatisticsCards";
import type { UserWithTokenUsage } from "@/services/userService";

// This will be imported from the actions file we'll create
import { getUsersWithStatus } from "@/app/actions/users";

export default function UsersDashboard() {
  const [users, setUsers] = useState<UserWithTokenUsage[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [statistics, setStatistics] = useState({
    totalUsersCount: 0,
    totalTokensUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchUsers = (
    page: number = currentPage,
    search: string = searchQuery
  ) => {
    startTransition(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUsersWithStatus(
          search || undefined,
          itemsPerPage,
          page
        );
        setUsers(data.users);
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
    fetchUsers();
  }, []);

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchQuery);
  };

  const handleSearch = (query: string) => {
    fetchUsers(1, query);
  };

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-4 2xl:mx-auto my-4 gap-4">
      <UserStatisticsCards
        totalUsers={pagination.totalCount}
        totalTokensUsed={statistics.totalTokensUsed}
      />
      <UsersTable
        users={users}
        loading={loading}
        error={error}
        isPending={isPending}
        pagination={pagination}
        onRefresh={() => fetchUsers(currentPage, searchQuery)}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
      />
    </div>
  );
}