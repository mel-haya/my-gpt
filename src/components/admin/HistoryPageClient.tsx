"use client";

import { useState } from "react";
import ConversationsList from "./ConversationsList";
import HistoryMessagesPanel from "./HistoryMessagesPanel";
import { HistoryConversation } from "@/types/history";

interface HistoryPageClientProps {
  initialConversations: HistoryConversation[];
}

export default function HistoryPageClient({
  initialConversations,
}: HistoryPageClientProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedConversation = initialConversations.find(
    (c) => c.id === selectedId,
  );

  return (
    <div className="flex bg-neutral-950 h-[calc(100vh-0px)] overflow-hidden">
      <ConversationsList
        conversations={initialConversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        className="w-80 shrink-0"
      />
      <HistoryMessagesPanel
        conversationId={selectedId}
        conversationTitle={selectedConversation?.title || null}
      />
    </div>
  );
}
