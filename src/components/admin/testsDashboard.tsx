
import TestsTable from "./TestsTable";
import TestRunPieChart from "./TestRunPieChart";
import TestRunner from "./TestRunner";
import { getTestsWithStatus } from "@/app/actions/tests";

interface TestsDashboardProps {
  searchParams: {
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
    <div className="flex flex-col w-full max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tests Dashboard</h1>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 items-start px-3">
        <div className="w-full lg:w-1/2 order-2 lg:order-1">
          <TestRunPieChart />
        </div>
        <div className="w-full lg:w-1/2 h-full flex justify-start lg:justify-center items-center order-1 lg:order-2">
          <TestRunner />
        </div>
      </div>
      
      <TestsTable
        tests={data.tests}
        pagination={data.pagination}
        searchQuery={searchQuery}
      />
    </div>
  );
}