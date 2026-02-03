import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getUserHotelId } from "@/lib/checkRole";
import HotelHistoryPageClient from "@/components/dashboard/HotelHistoryPageClient";
import { getHotelConversationsAction } from "@/app/actions/dashboardMessages";

export default async function DashboardMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string; messageId?: string }>;
}) {
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

  const resolvedSearchParams = await searchParams;
  const initialConversationId = resolvedSearchParams?.conversationId
    ? parseInt(resolvedSearchParams.conversationId, 10)
    : null;

  const initialMessageId = resolvedSearchParams?.messageId
    ? parseInt(resolvedSearchParams.messageId, 10)
    : null;

  const result = await getHotelConversationsAction(hotelId);

  const initialData = result.success
    ? result.data
    : { data: [], hasMore: false, nextCursor: null };

  return (
    <div className="flex flex-col max-w-350 mx-4 2xl:mx-auto my-4 gap-4 h-[calc(100vh-32px)] box-border">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Message Logs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View conversation history with your hotel&apos;s AI assistant
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <HotelHistoryPageClient
          initialConversations={initialData.data}
          initialHasMore={initialData.hasMore}
          initialNextCursor={initialData.nextCursor}
          initialConversationId={initialConversationId}
          initialMessageId={initialMessageId}
          hotelId={hotelId}
        />
      </div>
    </div>
  );
}
