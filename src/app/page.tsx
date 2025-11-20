"use client";

import Conversation from "@/components/conversation";
import Sidebar from "@/components/sidebar";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/types/chatMessage";
import { ToastContainer } from "react-toastify";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { buildTransformationUrl } from "@/lib/utils";
import { useEffect, useState } from "react";

import type { SelectConversation } from "@/lib/db-schema";

export default function Home() {
  const [conversations, setConversations] = useState<SelectConversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<SelectConversation | null>(null);
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

  async function send(message: { text: string }) {
    try {
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await initConversation();
      }
      const body = { conversation };
      await sendMessage(message, { body });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  function resetConversation() {
    setMessages([]);
    setCurrentConversation(null);
  }

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    }
    fetchConversations();
  }, []);

  useEffect(() => {
    if(!currentConversation) return;
    async function getMessages() {
      try {
        const res = await fetch("/api/messages?conversationId=" + currentConversation?.id);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    }
    getMessages();
  }, [currentConversation]);

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Sidebar
        reset={resetConversation}
        setCurrentConversation={setCurrentConversation}
        conversations={conversations}
      />
      <Conversation
        messages={messages}
        sendMessage={send}
        status={status}
        error={error}
        stop={stop}
      />
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
    </div>
  );
}
