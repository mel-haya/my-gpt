"use client";

import { useState } from "react";
import { getAllConversationsAction } from "@/app/actions/history";
import ConversationsList from "./ConversationsList";
import HistoryMessagesPanel from "./HistoryMessagesPanel";
import { HistoryConversation } from "@/types/history";

interface HistoryPageClientProps {
  initialConversations: HistoryConversation[];
  initialHasMore: boolean;
  initialNextCursor: number | null;
  initialConversationId?: number | null;
  initialMessageId?: number | null;
}

export default function HistoryPageClient({
  initialConversations,
  initialHasMore,
  initialNextCursor,
  initialConversationId = null,
  initialMessageId = null,
}: HistoryPageClientProps) {
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
    const result = await getAllConversationsAction(undefined, 20, nextCursor);

    if (result.success) {
      setConversations((prev) => [...prev, ...result.data.data]);
      setHasMore(result.data.hasMore);
      setNextCursor(result.data.nextCursor);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex bg-neutral-950 h-[calc(100vh-0px)] overflow-hidden">
      <ConversationsList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={handleSelectConversation}
        onLoadMore={loadMoreConversations}
        hasMore={hasMore}
        isLoading={isLoading}
        className="w-80 shrink-0"
        showHotelName={true}
      />
      <HistoryMessagesPanel
        conversationId={selectedId}
        conversationTitle={selectedConversation?.title || null}
        highlightMessageId={highlightMessageId}
      />
    </div>
  );
}
