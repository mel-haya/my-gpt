"use client";

import { useState } from "react";
import { getHotelConversationsAction } from "@/app/actions/dashboardMessages";
import ConversationsList from "@/components/admin/ConversationsList";
import HistoryMessagesPanel from "@/components/admin/HistoryMessagesPanel";
import { HistoryConversation } from "@/types/history";

interface HotelHistoryPageClientProps {
  initialConversations: HistoryConversation[];
  initialHasMore: boolean;
  initialNextCursor: number | null;
  initialConversationId?: number | null;
  initialMessageId?: number | null;
  hotelId: number;
}

export default function HotelHistoryPageClient({
  initialConversations,
  initialHasMore,
  initialNextCursor,
  initialConversationId = null,
  initialMessageId = null,
  hotelId,
}: HotelHistoryPageClientProps) {
  const [conversations, setConversations] =
    useState<HistoryConversation[]>(initialConversations);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<number | null>(
    initialNextCursor,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialConversationId,
  );
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(
    initialMessageId,
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleSelectConversation = (id: number | null) => {
    setSelectedId(id);
    // Clear highlight when changing conversations
    if (id !== initialConversationId) {
      setHighlightMessageId(null);
    }
  };

  const loadMoreConversations = async () => {
    if (isLoading || !hasMore || !nextCursor) return;

    setIsLoading(true);
    const result = await getHotelConversationsAction(
      hotelId,
      undefined,
      20,
      nextCursor,
    );

    if (result.success) {
      setConversations((prev) => [...prev, ...result.data.data]);
      setHasMore(result.data.hasMore);
      setNextCursor(result.data.nextCursor);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex bg-neutral-950 h-full overflow-hidden rounded-lg border border-neutral-800">
      <ConversationsList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={handleSelectConversation}
        onLoadMore={loadMoreConversations}
        hasMore={hasMore}
        isLoading={isLoading}
        className="w-80 shrink-0 border-r border-neutral-800"
      />
      <div className="flex-1 min-w-0">
        <HistoryMessagesPanel
          conversationId={selectedId}
          conversationTitle={selectedConversation?.title || null}
          highlightMessageId={highlightMessageId}
        />
      </div>
    </div>
  );
}
