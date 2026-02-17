import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";
import { getHotelFilesWithStatus } from "@/app/actions/files";
import { getHotelById } from "@/services/hotelService";
import FilesTable from "@/components/admin/FilesTable";
import StatisticsCards from "@/components/admin/statisticsCards";

interface PageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function DashboardFilesPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);

  // Only hotel owners can access files
  if (user?.role !== "hotel_owner") {
    redirect("/dashboard/requests");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  const hotel = await getHotelById(hotelId);
  const hotels = hotel ? [{ id: hotel.id, name: hotel.name }] : [];

  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const searchQuery = resolvedSearchParams?.search || "";

  const data = await getHotelFilesWithStatus(
    searchQuery.trim() || undefined,
    10,
    currentPage,
  );

  return (
    <div className="flex flex-col max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Knowledge Base Files
      </h1>
      <p className="text-gray-600 dark:text-gray-400 -mt-2">
        Manage documents for your hotel&apos;s AI assistant
      </p>
      <StatisticsCards
        totalFiles={data.pagination.totalCount}
        activeFilesCount={data.statistics.activeFilesCount}
        totalDocumentsCount={data.statistics.totalDocumentsCount}
      />
      <FilesTable
        files={data.files}
        pagination={data.pagination}
        searchQuery={searchQuery}
        hotels={hotels}
        showHotelInfo={false}
      />
    </div>
  );
}
