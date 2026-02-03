import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";

export default async function DashboardMessagesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);

  // Only hotel owners can access message logs
  if (user?.role !== "hotel_owner") {
    redirect("/dashboard/requests");
  }

  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Message Logs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View conversation history with your hotel&apos;s AI assistant
        </p>
      </div>

      {/* Message Logs Placeholder */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
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
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No messages yet
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Conversation logs will appear here once guests start chatting with
            your AI assistant.
          </p>
        </div>
      </div>
    </div>
  );
}
