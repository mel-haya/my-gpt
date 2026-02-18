import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";
import {
  getActivitiesAction,
  getActivityStatsAction,
} from "@/app/actions/activities";
import { ActivitiesPageClient } from "@/components/admin/ActivitiesPageClient";
import { SelectActivity } from "@/lib/db-schema";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    category?: string;
  }>;
}

export default async function DashboardActivitiesPage({
  searchParams,
}: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);

  // Only hotel owners can manage activities
  if (user?.role !== "hotel_owner") {
    redirect("/dashboard/requests");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const search = resolvedSearchParams?.search || "";
  const category = resolvedSearchParams?.category || "all";
  const pageSize = 9;

  const [activitiesResult, statsResult] = await Promise.all([
    getActivitiesAction({
      page: currentPage,
      limit: pageSize,
      search,
      category,
      hotelId,
    }),
    getActivityStatsAction(),
  ]);

  const activitiesData =
    activitiesResult.success && activitiesResult.data
      ? activitiesResult.data
      : {
          activities: [] as SelectActivity[],
          pagination: { totalCount: 0, totalPages: 0 },
        };

  const stats =
    statsResult.success && statsResult.data ? statsResult.data : { total: 0 };

  return (
    <ActivitiesPageClient
      initialActivities={activitiesData.activities}
      totalCount={stats.total}
      initialPage={currentPage}
      totalPages={activitiesData.pagination.totalPages}
      hideHotelControls
      fixedHotelId={hotelId}
    />
  );
}
