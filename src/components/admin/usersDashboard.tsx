import UsersTable from "./UsersTable";
import UserStatisticsCards from "./userStatisticsCards";
import { getUsersWithStatus } from "@/app/actions/users";

interface UsersDashboardProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function UsersDashboard({ searchParams }: UsersDashboardProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchQuery = searchParams?.search || "";
  const itemsPerPage = 10;

  // Fetch data on the server
  const data = await getUsersWithStatus(
    searchQuery.trim() || undefined,
    itemsPerPage,
    currentPage
  );

  return (
    <div className="flex flex-col max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users Dashboard</h1>
      <UserStatisticsCards
        totalUsers={data.pagination.totalCount}
        totalTokensUsed={data.statistics.totalTokensUsed}
      />
      <UsersTable
        users={data.users}
        pagination={data.pagination}
        searchQuery={searchQuery}
      />
    </div>
  );
}