
import TestsTable from "./TestsTable";
import { getTestsWithStatus } from "@/app/actions/tests";

interface TestsDashboardProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function TestsDashboard({ searchParams }: TestsDashboardProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchQuery = searchParams?.search || "";
  const itemsPerPage = 10;

  // Fetch data on the server
  const data = await getTestsWithStatus(
    searchQuery.trim() || undefined,
    itemsPerPage,
    currentPage
  );

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-4 2xl:mx-auto my-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tests Dashboard</h1>
      </div>
      
      <TestsTable
        tests={data.tests}
        pagination={data.pagination}
        searchQuery={searchQuery}
      />
    </div>
  );
}