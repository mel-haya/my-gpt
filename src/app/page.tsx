"use client";

import Conversation from "@/components/conversation";
import Sidebar from "@/components/sidebar";
import { useChat } from "@ai-sdk/react";
import { chatMessage } from "./api/chat/route";
import { ToastContainer } from "react-toastify";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { buildTransformationUrl } from "@/lib/utils";

export default function Home() {
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    addToolOutput,
  } = useChat<chatMessage>({
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
