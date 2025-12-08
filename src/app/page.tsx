"use client";

import Conversation from "@/components/ConversationWrapper";
import Sidebar from "@/components/sidebar";
import SignInPopup from "@/components/sign-in-popup";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/types/chatMessage";
import { ToastContainer } from "react-toastify";
import { FileUIPart, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { buildTransformationUrl } from "@/lib/utils";
import { useEffect, useState, useEffectEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChatRequestOptions } from "ai";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useConversations } from "@/hooks/useConversations";

import type { SelectConversation } from "@/lib/db-schema";

export default function Home() {
  const { isSignedIn } = useAuth();
  const [currentConversation, setCurrentConversation] =
    useState<SelectConversation | null>(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { usage, refreshUsage } = useTokenUsage();
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    isFetching: conversationsFetching,
    error: conversationsError,
    refetch,
  } = useConversations(searchQuery);

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    addToolOutput,
  } = useChat<ChatMessage>({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      switch (toolCall.toolName) {
        case "changeBackground":
          {
            const { imageUrl, background } = toolCall.input;

            const transformation = `e-changebg-prompt-${background}`;
            const transformedUrl = buildTransformationUrl(
              imageUrl,
              transformation
            );

            addToolOutput({
              tool: "changeBackground",
              toolCallId: toolCall.toolCallId,
              output: transformedUrl,
            });
          }
          break;
        case "removeBackground":
          {
            const { imageUrl } = toolCall.input;

            const transformation = `e-bgremove`;
            const transformedUrl = buildTransformationUrl(
              imageUrl,
              transformation
            );

            addToolOutput({
              tool: "removeBackground",
              toolCallId: toolCall.toolCallId,
              output: transformedUrl,
            });
          }
          break;
      }
    },
    async onFinish({ messages }) {
      const userMessages = messages.filter((m) => m.role === "user");
      if (userMessages.length === 1) await refetch();
      await refreshUsage();
    },
  });

  // Helper function to add system messages to the conversation
  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: content,
        },
      ],
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  async function initConversation() {
    try {
      const convesation = await fetch("/api/conversations/new", {
        method: "POST",
      });
      const data = await convesation.json();
      setCurrentConversation(data);
      return data;
    } catch (error) {
      console.error("Error initializing conversation:", error);
    }
  }

  async function send(
    message: { text: string; files?: FileUIPart[] },
    options?: ChatRequestOptions
  ): Promise<void> {
    // Check if user is signed in
    if (!isSignedIn) {
      setShowSignInPopup(true);
      return;
    }

    // Frontend validation: Check if user has reached their daily limit
    if (usage?.hasReachedLimit) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Next midnight
      const hoursUntilReset = Math.ceil(
        (resetTime.getTime() - Date.now()) / (1000 * 60 * 60)
      );

      addSystemMessage(
        `⚠️ **Daily message limit reached!**\n\nYou've used all your messages for today. Your limit will reset in ${hoursUntilReset} hour${
          hoursUntilReset !== 1 ? "s" : ""
        }.\n\nPlease try again tomorrow.`
      );
      return;
    }

    try {
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await initConversation();
      }
      const body = { conversation, ...options?.body };
      await sendMessage(message, { body });
      // Refresh usage immediately after sending (in addition to onFinish)
      await refreshUsage();
    } catch (error: unknown) {
      console.error("Error sending message:", error);

      // Handle 429 rate limit error specifically
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMessage.includes("429") ||
        errorMessage.includes("Rate limit") ||
        errorMessage.includes("Daily message limit reached");

      if (isRateLimit) {
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Next midnight
        const hoursUntilReset = Math.ceil(
          (resetTime.getTime() - Date.now()) / (1000 * 60 * 60)
        );

        addSystemMessage(
          `🚫 **Rate limit exceeded!**\n\nYou've reached your daily message limit. Your limit will reset in ${hoursUntilReset} hour${
            hoursUntilReset !== 1 ? "s" : ""
          }.\n\nPlease try again tomorrow. We appreciate your patience! ✨`
        );
      } else {
        // Handle other errors
        addSystemMessage(
          `❌ **Message failed to send**\n\nThere was an issue sending your message. Please try again.\n\nIf the problem persists, please check your connection or contact support.`
        );
      }

      // Still refresh usage even if there's an error, in case the message was processed
      await refreshUsage();
    }
  }

  function resetConversation() {
    setMessages([]);
    setCurrentConversation(null);
  }

  async function deleteConversation(conversationId: number) {
    try {
      const res = await fetch(
        `/api/conversations?conversationId=${conversationId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res;
      console.log("Delete response data:", data);
      if (data.ok) {
        if (currentConversation?.id === conversationId) {
          resetConversation();
        }
        await refetch();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }
  // const fetchConversations = useCallback(async (searchQuery?: string) => {
  //   try {
  //     const url = searchQuery
  //       ? `/api/conversations?search=${encodeURIComponent(searchQuery)}`
  //       : "/api/conversations";
  //     const res = await fetch(url);
  //     const data = await res.json();
  //     setConversations(data);
  //   } catch (error) {
  //     console.error("Error fetching conversations:", error);
  //   }
  // }, []);

  const onSignOut = useEffectEvent(() => {
    resetConversation();
    // setConversations([]);
  });

  const onSignin = useEffectEvent(async () => {
    await refetch();
  });

  const searchConversations = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    if (!isSignedIn) onSignOut();
    else onSignin();
  }, [isSignedIn]);

  async function changeConversation(conversation: SelectConversation) {
    setCurrentConversation(conversation);
    try {
      const res = await fetch(
        "/api/messages?conversationId=" + conversation?.id
      );
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Sidebar
        reset={resetConversation}
        setCurrentConversation={changeConversation}
        loading={conversationsLoading || conversationsFetching}
        conversations={conversationsData || []}
        deleteConversation={deleteConversation}
        onSignInRequired={() => setShowSignInPopup(true)}
        searchConversations={searchConversations}
      />
      <Conversation
        messages={messages}
        sendMessage={send}
        status={status}
        error={error}
        stop={stop}
      />
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
      <SignInPopup
        isOpen={showSignInPopup}
        onClose={() => setShowSignInPopup(false)}
      />
    </div>
  );
}
