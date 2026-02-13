"use client";

import { Input } from "@/components/ui/input";
import { Search, MessageSquare, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { HistoryConversation } from "@/types/history";
import { Loader2 } from "lucide-react";

interface ConversationsListProps {
  conversations: HistoryConversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  className?: string;
  showHotelName?: boolean;
}

export default function ConversationsList({
  conversations,
  selectedId,
  onSelect,
  onLoadMore,
  hasMore,
  isLoading,
  className,
  showHotelName = false,
}: ConversationsListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (c.title?.toLowerCase() || "").includes(searchLower) ||
      (c.username?.toLowerCase() || "").includes(searchLower) ||
      (c.email?.toLowerCase() || "").includes(searchLower)
    );
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only set up observer if we're not searching (search filters locally for now)
    if (searchTerm) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, searchTerm]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-neutral-900 border-r border-white/5",
        className,
      )}
    >
      <div className="p-4 border-b border-white/5 space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Conversations
        </h2>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 bg-neutral-800/50 border-white/10 text-white placeholder:text-neutral-500 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-neutral-500 text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  selectedId === conv.id
                    ? "bg-blue-600/10 border border-blue-500/20"
                    : "hover:bg-white/5 border border-transparent",
                )}
              >
                {selectedId === conv.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3
                        className={cn(
                          "font-semibold text-sm line-clamp-1 transition-colors",
                          selectedId === conv.id
                            ? "text-blue-400"
                            : "text-neutral-200 group-hover:text-white",
                        )}
                      >
                        {conv.title || "Untitled Conversation"}
                      </h3>
                    </div>
                    {showHotelName && conv.hotelName && (
                      <span className="self-start text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {conv.hotelName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 italic">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-neutral-600" />
                      <span className="truncate max-w-25">
                        {conv.username || "Anonymous"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={12} className="text-neutral-600" />
                      <span>{conv.messageCount} messages</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Pagination Sentinel */}
            {!searchTerm && (
              <div
                ref={observerTarget}
                className="py-4 flex justify-center items-center"
              >
                {isLoading ? (
                  <Loader2 className="size-5 text-blue-500 animate-spin" />
                ) : hasMore ? (
                  <div className="h-4" /> // Invisible trigger
                ) : conversations.length > 0 ? (
                  <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">
                    No more conversations
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
