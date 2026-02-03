import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";
import { getHotelById } from "@/services/hotelService";
import { getStaffRequestStats } from "@/services/staffRequestsService";
import Link from "next/link";

export default async function DashboardOverviewPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);

  // Only hotel owners can access overview
  if (user?.role !== "hotel_owner") {
    redirect("/dashboard/requests");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  const hotel = await getHotelById(hotelId);
  const stats = await getStaffRequestStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome to {hotel?.name || "your hotel"} management dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Requests
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.totalRequests}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Pending
          </h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            {stats.pendingRequests}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Completed
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {stats.completedRequests}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Avg Response Time
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {stats.avgResponseTimeMinutes
              ? `${stats.avgResponseTimeMinutes}m`
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/files"
            className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Upload Files
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add knowledge base documents
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/requests"
            className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                View Requests
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage guest requests
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/messages"
            className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Message Logs
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View conversation history
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
