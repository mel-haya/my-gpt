"use client";

import Conversation from "@/components/conversation";
import Sidebar from "@/components/sidebar";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/types/chatMessage";
import { ToastContainer } from "react-toastify";
import {
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessagePart,
  UIDataTypes,
} from "ai";
import { buildTransformationUrl } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  addConversation,
  getConversationsByUserId,
} from "@/services/conversationsService";
import type { SelectConversation } from "@/lib/db-schema";

export default function Home() {
  const userId = 1; // Replace with actual user id logic
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

  useEffect(() => {
    // async function initConversation() {
    //   const conversations = await getConversationsByUserId(userId);
    //   if (conversations.length === 0) {
    //     const newConv = await addConversation(userId);
    //     setCurrentConversation(newConv);
    //   } else {
    //     setCurrentConversation(conversations[0]);
    //   }
    // }
    // initConversation();
    fetch('/api/conversations').then(res => {
      console.log(res);
      return res.json();
    });
  }, []);

  // useEffect(() => {
  //   async function loadMessages() {
  //     if (currentConversation) {
        
  //       setMessages([]);
  //     }
  //   }
  //   loadMessages();
  // }, [currentConversation]);

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Sidebar setMessages={setMessages} />
      <Conversation
        messages={messages}
        sendMessage={sendMessage}
        status={status}
        error={error}
        stop={stop}
      />
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
    </div>
  );
}
