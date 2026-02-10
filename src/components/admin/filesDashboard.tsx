import FilesTable from "./FilesTable";
import { getFilesWithStatus } from "@/app/actions/files";
import StatisticsCards from "./statisticsCards";

interface FilesDashboardProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function FilesDashboard({
  searchParams,
}: FilesDashboardProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchQuery = searchParams?.search || "";
  const itemsPerPage = 10;

  // Fetch data on the server
  const data = await getFilesWithStatus(
    searchQuery.trim() || undefined,
    itemsPerPage,
    currentPage,
  );

  return (
    <div className="flex flex-col max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Files Dashboard
      </h1>
      <StatisticsCards
        totalFiles={data.pagination.totalCount}
        activeFilesCount={data.statistics.activeFilesCount}
        totalDocumentsCount={data.statistics.totalDocumentsCount}
      />
      <FilesTable
        files={data.files}
        pagination={data.pagination}
        searchQuery={searchQuery}
        isAdmin
      />
    </div>
  );
}
