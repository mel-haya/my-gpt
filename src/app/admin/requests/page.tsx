import { StaffRequestsPageClient } from "@/components/admin/StaffRequestsPageClient";
import {
  getStaffRequests,
  getStaffRequestStats,
} from "@/services/staffRequestsService";

export const dynamic = "force-dynamic";

export default async function StaffRequestsPage() {
  // Fetch initial data and stats in parallel
  const [{ requests, pagination }, stats] = await Promise.all([
    getStaffRequests(undefined, undefined, "pending", 10, 1),
    getStaffRequestStats(),
  ]);

  return (
    <div className="container mx-auto py-6 px-6">
      <StaffRequestsPageClient
        initialRequests={requests}
        totalCount={pagination.totalCount}
        initialPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        stats={stats}
        showHotelColumn={true}
        userRole="admin"
      />
    </div>
  );
}
