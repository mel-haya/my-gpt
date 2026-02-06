import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";
import { getHotelById, getHotelStaff } from "@/services/hotelService";
import { getStaffRequestStats } from "@/services/staffRequestsService";
import SlugEditor from "@/components/dashboard/SlugEditor";
import HotelLanguageSelector from "@/components/dashboard/HotelLanguageSelector";
import TeamManagement from "@/components/dashboard/TeamManagement";

export default async function DashboardOverviewPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);

  // Only hotel owners or staff can access overview
  if (user?.role !== "hotel_owner" && user?.role !== "hotel_staff") {
    // If just a user, redirect home or to requests if they have logic for that
    redirect("/dashboard/requests");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  const hotel = await getHotelById(hotelId);
  const stats = await getStaffRequestStats(hotelId);
  const staff = await getHotelStaff(hotelId);

  const formatAvgTime = (minutes: number) => {
    if (minutes <= 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  return (
    <div className="flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Overview for{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {hotel?.name}
          </span>
        </p>
      </div>

      {/* Stats Cards - Elegant & Minimal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Total Requests"
          value={stats.totalRequests}
          trend="All time"
        />
        <StatsCard
          label="Pending"
          value={stats.pendingRequests}
          valueClassName="text-yellow-600 dark:text-yellow-400"
          trend="Needs attention"
        />
        <StatsCard
          label="Completed"
          value={stats.completedRequests}
          valueClassName="text-green-600 dark:text-green-400"
          trend="Resolved"
        />
        <StatsCard
          label="Avg Response"
          value={
            stats.avgResponseTimeMinutes
              ? formatAvgTime(stats.avgResponseTimeMinutes)
              : "-"
          }
          valueClassName="text-blue-600 dark:text-blue-400"
          trend="Speed"
        />
      </div>

      {/* Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Team Management (2/3 width) */}
        <div className="lg:col-span-2">
          <TeamManagement
            hotelId={hotelId}
            initialStaff={staff}
            currentUserId={userId}
            currentUserRole={user?.role}
          />
        </div>

        {/* Side Column: Settings / Slug (1/3 width) */}
        <div className="space-y-6 h-fit">
          <SlugEditor hotelId={hotelId} initialSlug={hotel?.slug || null} />
          <HotelLanguageSelector
            hotelId={hotelId}
            initialLanguage={hotel?.preferred_language || "english"}
          />
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  label,
  value,
  valueClassName = "text-gray-900 dark:text-white",
  trend,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
  trend?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
        {label}
      </h3>
      <div className="mt-2">
        <p className={`text-3xl font-light tracking-tight ${valueClassName}`}>
          {value}
        </p>
        {trend && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
