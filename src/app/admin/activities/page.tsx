import {
  getActivitiesAction,
  getActivityStatsAction,
} from "@/app/actions/activities";
import { ActivitiesPageClient } from "@/components/admin/ActivitiesPageClient";
import { SelectActivity } from "@/lib/db-schema";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || "1");
  const pageSize = 9;
  const search = resolvedSearchParams.search || "";
  const category = resolvedSearchParams.category || "all";

  const [activitiesResult, statsResult] = await Promise.all([
    getActivitiesAction({
      page: currentPage,
      limit: pageSize,
      search,
      category,
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
    />
  );
}
