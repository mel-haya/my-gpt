"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// import Message from "./message";
import { ChatMessage } from "@/types/chatMessage";
import Header from "./header";
import Background from "@/components/background";
import PromptInput from "./PromptInput";
import {
  CreateUIMessage,
  ChatRequestOptions,
  FileUIPart,
  ChatStatus,
} from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { MessageSquareIcon } from "lucide-react";
import Styles from "@/assets/styles/customScrollbar.module.css";

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
  const [input, setInput] = useState("");

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   await sendMessage({ text: input });
  //   setInput("");
  // };

  return (
    <div className="flex flex-col grow h-screen relative items-center">
      <Background count={messages.length} />
      <Header />
      {!messages.length && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 z-10 w-full">
          <div className="h-full flex-col flex justify-center items-center gap-4 w-[1200px] mx-auto text-center">
            <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
            <PromptInput
              sendMessage={sendMessage}
              status={status}
              stop={stop}
            />
            <div className="flex gap-2">
              {promptExamples.map((p, index) => {
                return (
                  <div
                    onClick={() => setInput(p)}
                    key={`prompt_${index}`}
                    className="bg-neutral-800/40 p-4 cursor-pointer rounded-lg"
                  >
                    {p}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error.message}</div>}
      {messages.length > 0 && (
        <>
          <Conversation className={`relative size-full z-10 flex-1 overflow-hidden ${Styles.customScrollbar}`}>
            <ConversationContent className="max-w-[1200px] mx-auto">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  description="Messages will appear here as the conversation progresses."
                  icon={<MessageSquareIcon className="size-6" />}
                  title="Start a conversation"
                />
              ) : (
                messages.map(({ id, parts, role }) => (
                  <Message from={role} key={id}>
                    <MessageContent>
                      {parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse  key={`${id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <PromptInput sendMessage={sendMessage} status={status} stop={stop} />
        </>
      )}
      
    </div>
  );
}
