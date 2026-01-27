import { StaffRequestsPageClient } from "@/components/admin/StaffRequestsPageClient";
import { getStaffRequests } from "@/services/staffRequestsService";
import { rolesEnum } from "@/lib/db-schema";

export default async function StaffRequestsPage() {


  // Fetch initial data
  const { requests, pagination } = await getStaffRequests(
    undefined,
    undefined,
    "pending",
    10,
    1,
  );

  return (
    <div className="container mx-auto py-6">
      <StaffRequestsPageClient
        initialRequests={requests}
        totalCount={pagination.totalCount}
        initialPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}
