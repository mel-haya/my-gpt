"use client";

import { useEffect, useState } from "react";
import { getConversationMessagesAction } from "@/app/actions/history";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Loader2, AlertCircle } from "lucide-react";
import { SelectMessage } from "@/lib/db-schema";
import { HistoryMessagePart } from "@/types/history";

interface HistoryMessagesPanelProps {
  conversationId: number | null;
  conversationTitle: string | null;
}

export default function HistoryMessagesPanel({
  conversationId,
  conversationTitle,
}: HistoryMessagesPanelProps) {
  const [messages, setMessages] = useState<SelectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const loadMessages = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getConversationMessagesAction(id);
      if (result.success && result.data) {
        setMessages(result.data);
      } else {
        setError(result.error || "Failed to load messages");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950">
        <ConversationEmptyState
          title="Select a conversation"
          description="Choose a conversation from the sidebar to view its details and messages."
          className="text-neutral-400"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4 text-neutral-500">
          <Loader2 className="size-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Fetching messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4 text-red-500 max-w-md text-center p-8">
          <AlertCircle className="size-12" />
          <h3 className="text-lg font-semibold">Error Loading Messages</h3>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden">
      <header className="px-6 py-4 border-b border-white/5 bg-neutral-900/50 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white truncate">
          {conversationTitle || "Untitled Conversation"}
        </h2>
        <p className="text-xs text-neutral-500 italic mt-0.5">
          ID: {conversationId}
        </p>
      </header>

      <Conversation className="flex-1 custom-scrollbar">
        <ConversationContent className="max-w-4xl mx-auto px-6 py-12 gap-10">
          {messages.map((message) => {
            const parts = message.parts as HistoryMessagePart[];

            return (
              <Message
                key={message.id}
                from={message.role as "user" | "assistant" | "system"}
              >
                <MessageContent>
                  {parts.map((part, idx) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <MessageResponse key={idx}>{part.text}</MessageResponse>
                      );
                    }

                    if (
                      part.type === "tool-call" &&
                      part.toolName &&
                      part.toolCallId
                    ) {
                      const toolResult = parts.find(
                        (p) =>
                          p.type === "tool-result" &&
                          p.toolCallId === part.toolCallId,
                      ) as { type: "tool-result"; result: unknown } | undefined;
                      return (
                        <Tool
                          key={idx}
                          defaultValue="open"
                          className="bg-neutral-900/40 border-white/5 mt-4"
                        >
                          <ToolHeader
                            title={part.toolName}
                            state="output-available"
                            type="tool-call"
                            className="hover:bg-white/5"
                          />
                          <ToolInput input={part.args} />
                          {toolResult && (
                            <ToolOutput
                              output={toolResult.result}
                              errorText={undefined}
                              toolName={part.toolName}
                            />
                          )}
                        </Tool>
                      );
                    }

                    // Tool results are handled inside tool-call part for better rendering
                    return null;
                  })}
                </MessageContent>
                <div className={`flex
                     ${message.role === "assistant" ? "justify-start" : "justify-end"}
                     gap-1 mt-2 opacity-50 text-[10px] text-neutral-400`}>
                  {message.role === "assistant" && message.model_used && (
                    <span>  {message.model_used}</span>
                  )}
                  {message.created_at && (
                    <span>
                      {new Date(message.created_at).toLocaleString([], {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </Message>
            );
          })}
        </ConversationContent>
      </Conversation>
    </div>
  );
}
