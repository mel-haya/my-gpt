"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
// import Message from "./message";
import { ChatMessage } from "@/types/chatMessage";
import Header from "./header";

import PromptInput from "./PromptInput";
import { ChatRequestOptions, FileUIPart, ChatStatus } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { LoaderCircle } from 'lucide-react';
import Styles from "@/assets/styles/customScrollbar.module.css";
import Background from "@/components/background";
import UsageDisplay from "./UsageDisplay";
import { useTokenUsage } from '@/hooks/useTokenUsage';

const welcomeMessage = "Hello! How can I assist you today?";
const promptExamples = [
  "Generate an image of a kitten",
  "Write me an Email",
  "Who created Linux",
];

export default function ConversationWrapper({
  messages,
  sendMessage,
  status,
  error,
  stop,
}: {
  messages: ChatMessage[];
  sendMessage: (
    message: { text: string; files?: FileUIPart[] },
    options?: ChatRequestOptions
  ) => Promise<void>;
  status: ChatStatus;
  error: Error | undefined;
  stop: () => void;
}) {
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-5-nano");
  const { usage } = useTokenUsage();
  
  const displayMessages = useMemo(() => {
    return messages.map((message) => {
      const { id, parts, role } = message;

      if (role === "user") {
        const textParts = parts.filter((part) => part.type === "text");
        const fileParts = parts.filter((part) => part.type === "file");

        return {
          key: id,
          role,
          content: textParts.map((part) => part.text).join(""),
          attachments: fileParts.map((part) => ({
            type: "file" as const,
            url: part.url || "",
            mediaType: part.mediaType,
            filename: part.filename,
          })),
        };
      } else {
        // For assistant messages, keep the original structure
        const fileParts = parts.filter(
          (part) =>
            part.type === "tool-generateImage" &&
            part.state === "output-available"
        );
        return {
          key: id,
          role,
          content: parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(""),
          attachments: fileParts.map((part) => ({
            type: "file" as const,
            url: part.output || "",
            mediaType: "image/png",
          })),
        };
      }
    });
  }, [messages]);

  return (
    <div className="flex flex-col grow h-screen relative items-center">
      <Background count={messages.length} />
      {/* <Header /> */}
      {!messages.length && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 z-10 w-full">
          <div className="h-full flex-col flex justify-center items-center gap-4 mx-auto text-center">
            <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
            <PromptInput
              sendMessage={sendMessage}
              status={status}
              stop={stop}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <div className="flex gap-2">
              {promptExamples.map((p, index) => {
                const isDisabled = usage?.hasReachedLimit;
                return (
                  <div
                    onClick={() => !isDisabled && sendMessage({ text: p })}
                    key={`prompt_${index}`}
                    className={`p-4 rounded-lg transition-colors ${
                      isDisabled 
                        ? "bg-neutral-800/20 text-neutral-600 cursor-not-allowed" 
                        : "bg-neutral-800/40 cursor-pointer hover:bg-neutral-800/60"
                    }`}
                    title={isDisabled ? "Daily message limit reached" : ""}
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error.message}</div>}
      {messages.length > 0 && (
        <>
          <Conversation
            className={`relative size-full z-10 flex-1 overflow-hidden ${Styles.customScrollbar}`}
          >
            <ConversationContent className="max-w-[1000px] mx-auto">
              {displayMessages.map((message) => {
                const isSystemMessage = typeof message.key === 'string' && message.key.startsWith('system-');
                return (
                  <Message from={message.role} key={message.key}>
                    {message.role === "user" &&
                      message.attachments &&
                      message.attachments.length > 0 && (
                        <MessageAttachments className="mb-2">
                          {message.attachments.map((attachment) => (
                            <MessageAttachment
                              data={attachment}
                              key={attachment.url}
                            />
                          ))}
                        </MessageAttachments>
                      )}
                    <MessageContent>
                      {message.content && (
                        <div className={isSystemMessage ? "border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 rounded-lg p-4 my-2" : ""}>
                          <MessageResponse key={`${message.key}-content`}>
                            {message.content}
                          </MessageResponse>
                        </div>
                      )}
                      {message.role === "assistant" &&
                        message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((attachment, i) => (
                              <Image
                                key={`${message.key}-img-${i}`}
                                src={attachment.url}
                                alt="Generated image"
                                width={500}
                                height={500}
                                className="max-w-full h-auto rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                    </MessageContent>
                  </Message>
                );
              })}
              {status !== "ready" && (
                <Message from="assistant">
                  <MessageContent>
                      <LoaderCircle className="animate-spin mr-2 inline-block" />
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <PromptInput sendMessage={sendMessage} status={status} stop={stop} selectedModel={selectedModel} onModelChange={setSelectedModel} />
        </>
      )}
    </div>
  );
}
