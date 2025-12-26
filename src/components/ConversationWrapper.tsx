"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
// import Message from "./message";
import { ChatMessage } from "@/types/chatMessage";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import PromptInput from "./PromptInput";
import { ChatRequestOptions, FileUIPart, ChatStatus, isToolOrDynamicToolUIPart, getToolOrDynamicToolName } from "ai";
import {
  Conversation,
  ConversationContent,
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
import { useUser } from "@clerk/nextjs";

import { useTokenUsage } from '@/hooks/useTokenUsage';
import { useSubscription } from '@/hooks/useSubscription';

const welcomeMessage = "Hello! How can I assist you today?";
const promptExamples = [
  "Generate an image of a kitten",
  "Write me an Email",
  "Who created Linux",
];

import Link from "next/link";

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
    const { isSubscribed, loading: subscriptionLoading } = useSubscription();
    const [showRibbon, setShowRibbon] = useState(true);
    const { user } = useUser();

  // Load models and set default to gpt-4o if available
  useEffect(() => {
    const setDefaultModel = async () => {
      try {
        const { getAvailableModels } = await import("@/app/actions/models");
        const availableModels = await getAvailableModels();
        
        // Check if gpt-4o is available and set it as default
        const gpt4oModel = availableModels.find(model => model.id === "openai/gpt-4o");
        if (gpt4oModel) {
          setSelectedModel("openai/gpt-4o");
        }
      } catch (error) {
        console.error("Failed to load models for default selection:", error);
      }
    };
    
    setDefaultModel();
  }, [isSubscribed]); // Re-run when subscription status changes

  // Memoize the model change callback to prevent unnecessary rerenders
  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
  }, []);

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
        const toolParts = parts.filter(
          (part) =>
            isToolOrDynamicToolUIPart(part)
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
          toolsStatus: toolParts
        };
      }
    });
  }, [messages]);

  return (
    <div className="flex flex-col grow h-screen relative items-center">
      {/* Upgrade Ribbon */}
      {/* Upgrade Ribbon (not full width, dismissible with transition) - Hidden for subscribed users */}
      {!isSubscribed && !subscriptionLoading && user && (
        <div
          className={`z-30 flex justify-center absolute top-3 left-0 w-full pointer-events-none transition-all duration-500 ${
            showRibbon ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-2 md:rounded-md bg-linear-to-r from-blue-500 to-purple-600 shadow-lg text-white text-sm font-semibold w-full md:w-auto mx-auto pointer-events-auto relative whitespace-nowrap">
            <span className="whitespace-nowrap flex-1 overflow-hidden">Upgrade for unlimited messages, advanced models, and a better experience!</span>
            <Link href="/upgrade" className="ml-2">
              <button className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors border border-white/30 cursor-pointer">Upgrade</button>
            </Link>
            <button
              className="text-white/70 hover:text-white text-lg font-bold px-1 transition-colors cursor-pointer"
              aria-label="Close upgrade ribbon"
              onClick={() => setShowRibbon(false)}
              tabIndex={0}
              style={{ background: "none", border: "none", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
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
              onModelChange={handleModelChange}
            />
            <div className="flex flex-col md:flex-row gap-2">
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
                    
                    {/* Tools Status Display for Assistant Messages */}
                    {message.role === "assistant" && 
                      message.toolsStatus && 
                      message.toolsStatus.length > 0 && (
                        <div className="mb-2">
                          {message.toolsStatus.map((tool, index) => (
                            <Tool key={`${message.key}-tool-${index}`}>
                              <ToolHeader
                                title={getToolOrDynamicToolName(tool)}
                                type={tool.type === "dynamic-tool" ? "tool-dynamic" : tool.type as `tool-${string}`}
                                state={tool.state}
                              />
                              <ToolContent>
                                {tool.input && (
                                  <ToolInput input={tool.input} />
                                )}
                                {(tool.output || tool.errorText) && tool.state === "output-available" && (
                                  <ToolOutput output={tool.output} errorText={tool.errorText} />
                                )}
                              </ToolContent>
                            </Tool>
                          ))}
                        </div>
                      )}
                    
                    <MessageContent>
                      {message.content?.trim() && (
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
          <PromptInput sendMessage={sendMessage} status={status} stop={stop} selectedModel={selectedModel} onModelChange={handleModelChange} />
        </>
      )}
    </div>
  );
}
