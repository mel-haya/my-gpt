import { getAllConversationsAction } from "@/app/actions/history";
import HistoryPageClient from "@/components/admin/HistoryPageClient";
import { HistoryConversation } from "@/types/history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const result = await getAllConversationsAction();

  const initialData = result.success ? result.data : { data: [], hasMore: false, nextCursor: null };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <HistoryPageClient
        initialConversations={initialData.data}
        initialHasMore={initialData.hasMore}
        initialNextCursor={initialData.nextCursor}
      />
    </div>
  );
}
