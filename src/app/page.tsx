"use client";

import Conversation from "@/components/ConversationWrapper";
import Sidebar from "@/components/sidebar";
import SignInPopup from "@/components/sign-in-popup";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/types/chatMessage";
import { ToastContainer } from "react-toastify";
import { FileUIPart, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useState, useEffectEvent, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChatRequestOptions } from "ai";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useConversations } from "@/hooks/useConversations";
import { useQueryClient } from "@tanstack/react-query";
import type { SelectConversation } from "@/lib/db-schema";

export default function Home({ hotelName }: { hotelName?: string }) {
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
    refetch,
  } = useConversations(searchQuery, { enabled: isSignedIn });
  const queryClient = useQueryClient();
  // Track user message count for current conversation to refresh only first 3 times
  const userMessageCountRef = useRef(0);
  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    stop,
    setMessages,
  } = useChat<ChatMessage>({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish() {
      userMessageCountRef.current++;
      // Refresh usage immediately
      refreshUsage().catch(console.error);
      // Delay conversation refresh to allow background rename to complete
      if (userMessageCountRef.current <= 3) {
        setTimeout(() => {
          refetch().catch(console.error);
        }, 4000);
      }
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
    options?: ChatRequestOptions,
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
        (resetTime.getTime() - Date.now()) / (1000 * 60 * 60),
      );

      addSystemMessage(
        `⚠️ **Daily message limit reached!**\n\nYou've used all your messages for today. Your limit will reset in ${hoursUntilReset} hour${
          hoursUntilReset !== 1 ? "s" : ""
        }.\n\nPlease try again tomorrow.`,
      );
      return;
    }

    try {
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await initConversation();
      }
      const body = {
        conversation,
        hotelName, // Include hotelName in request body
        ...options?.body,
      };
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
          (resetTime.getTime() - Date.now()) / (1000 * 60 * 60),
        );

        addSystemMessage(
          `🚫 **Rate limit exceeded!**\n\nYou've reached your daily message limit. Your limit will reset in ${hoursUntilReset} hour${
            hoursUntilReset !== 1 ? "s" : ""
          }.\n\nPlease try again tomorrow. We appreciate your patience! ✨`,
        );
      } else {
        // Handle other errors
        addSystemMessage(
          `❌ **Message failed to send**\n\nThere was an issue sending your message. Please try again.\n\nIf the problem persists, please check your connection or contact support.`,
        );
      }

      // Still refresh usage even if there's an error, in case the message was processed
      await refreshUsage();
    }
  }

  async function regenerateMessage(
    options?: ChatRequestOptions,
  ): Promise<void> {
    // Check if user is signed in
    if (!isSignedIn) {
      setShowSignInPopup(true);
      return;
    }

    if (usage?.hasReachedLimit) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Next midnight
      const hoursUntilReset = Math.ceil(
        (resetTime.getTime() - Date.now()) / (1000 * 60 * 60),
      );

      addSystemMessage(
        `⚠️ **Daily message limit reached!**\n\nYou've used all your messages for today. Your limit will reset in ${hoursUntilReset} hour${
          hoursUntilReset !== 1 ? "s" : ""
        }.\n\nPlease try again tomorrow.`,
      );
      return;
    }
    try {
      const conversation = currentConversation;
      const body = { conversation, ...options?.body };
      await regenerate({ body });
      // Refresh usage immediately after sending (in addition to onFinish)
      await refreshUsage();
    } catch (error: unknown) {
      console.error("Error regenerating message:", error);

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
          (resetTime.getTime() - Date.now()) / (1000 * 60 * 60),
        );

        addSystemMessage(
          `🚫 **Rate limit exceeded!**\n\nYou've reached your daily message limit. Your limit will reset in ${hoursUntilReset} hour${
            hoursUntilReset !== 1 ? "s" : ""
          }.\n\nPlease try again tomorrow. We appreciate your patience! ✨`,
        );
      } else {
        // Handle other errors
        addSystemMessage(
          `❌ **Message failed to send**\n\nThere was an issue sending your message. Please try again.\n\nIf the problem persists, please check your connection or contact support.`,
        );
      }

      // Still refresh usage even if there's an error, in case the message was processed
      await refreshUsage();
    }
  }
  function resetConversation() {
    setMessages([]);
    setCurrentConversation(null);
    userMessageCountRef.current = 0; // Reset counter for new conversation
  }

  async function deleteConversation(conversationId: number) {
    try {
      const res = await fetch(
        `/api/conversations?conversationId=${conversationId}`,
        {
          method: "DELETE",
        },
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
    queryClient.removeQueries({ queryKey: ["conversations"] });
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
    userMessageCountRef.current = 0; // Reset counter when changing conversation
    try {
      const res = await fetch(
        "/api/messages?conversationId=" + conversation?.id,
      );
      const data = await res.json();
      setMessages(data);
      // Set the counter based on existing user messages
      const userMessages = data.filter((m: ChatMessage) => m.role === "user");
      userMessageCountRef.current = userMessages.length;
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
        regenerate={regenerateMessage}
        conversationId={currentConversation?.id}
      />
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
      <SignInPopup
        isOpen={showSignInPopup}
        onClose={() => setShowSignInPopup(false)}
      />
    </div>
  );
}
