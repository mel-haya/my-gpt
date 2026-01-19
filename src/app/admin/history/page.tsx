import { getAllConversationsAction } from "@/app/actions/history";
import HistoryPageClient from "@/components/admin/HistoryPageClient";
import { HistoryConversation } from "@/types/history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const result = await getAllConversationsAction();

  const conversations = result.success
    ? (result.data as HistoryConversation[])
    : [];

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <HistoryPageClient initialConversations={conversations} />
    </div>
  );
}
