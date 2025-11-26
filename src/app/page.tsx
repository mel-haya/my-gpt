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
import { CreateUIMessage, ChatRequestOptions } from "ai";

import type { SelectConversation } from "@/lib/db-schema";

export default function Home() {
  const { isSignedIn } = useAuth();
  const [conversations, setConversations] = useState<SelectConversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<SelectConversation | null>(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
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
      if (userMessages.length === 1) await fetchConversations();
    },
  });

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

    try {
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await initConversation();
      }
      const body = { conversation };
      await sendMessage(message, { ...options, body });
    } catch (error) {
      console.error("Error sending message:", error);
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
        await fetchConversations();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }
  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }

  const onSignOut = useEffectEvent(() => {
    resetConversation();
    setConversations([]);
  });

  const onSignin = useEffectEvent(async () => {
    await fetchConversations();
  });

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
        conversations={conversations}
        deleteConversation={deleteConversation}
        onSignInRequired={() => setShowSignInPopup(true)}
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
