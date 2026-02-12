import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserHotelId } from "@/lib/checkRole";
import {
  getStaffRequests,
  getStaffRequestStats,
} from "@/services/staffRequestsService";
import { StaffRequestsPageClient } from "@/components/admin/StaffRequestsPageClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  const [{ requests, pagination }, stats] = await Promise.all([
    getStaffRequests(undefined, undefined, "pending", 10, 1, hotelId),
    getStaffRequestStats(hotelId),
  ]);

  return (
    <div className="flex flex-col max-w-350 px-6 2xl:mx-auto my-4 gap-4 ">
      <StaffRequestsPageClient
        initialRequests={requests}
        totalCount={pagination.totalCount}
        initialPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        stats={stats}
        hotelId={hotelId}
        showHotelColumn={false}
      />
    </div>
  );
}
