"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Message from "./message";
import { chatMessage } from "@/app/api/chat/route";
import Header from "./header";
export default function Conversation({
  messages,
  sendMessage,
  status,
  error,
  stop,
}: {
  messages: chatMessage[];
  sendMessage: (message: { text: string }) => void;
  status: string;
  error: Error | undefined;
  stop: () => void;
}) {
  const [input, setInput] = useState("");

  // const { messages, sendMessage, status, error, stop, setMessages } = useChat<chatMessage>();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col grow h-screen">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4">
        {error && <div className="text-red-500 mb-4">{error.message}</div>}

        {messages.map((message) => (
          <Message key={message.id} message={message} streaming={status === "streaming" && message.id === messages[messages.length - 1].id} />
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shadow-lg"
      >
        <div className="flex gap-2">
          <Input
            className="flex-1 dark:bg-zinc-800 p-2 border border-zinc-300 dark:border-zinc-700 rounded shadow-xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can I help you?"
          />
          {status === "submitted" || status === "streaming" ? (
            <button
              onClick={stop}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          ) : (
            <Button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={status !== "ready" || input.trim() === ""}
            >
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}