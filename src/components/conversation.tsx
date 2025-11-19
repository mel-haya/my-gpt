"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Message from "./message";
import { ChatMessage } from "@/types/chatMessage";
import Header from "./header";

const welcomeMessage = "Hello! How can I assist you today?";
const promptExamples = [
  "Generate an image of a kitten",
  "Write me an Email",
  "Who created Linux",
];

export default function Conversation({
  messages,
  sendMessage,
  status,
  error,
  stop,
}: {
  messages: ChatMessage[];
  sendMessage: (message: { text: string }) => void;
  status: string;
  error: Error | undefined;
  stop: () => void;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col grow h-screen">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4">
        {messages.length === 0 && (
          <div className="h-full flex-col flex justify-center items-center gap-4">
            <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
            <div className="flex gap-2">
              {promptExamples.map((p, index) => {
                return (
                  <div
                    onClick={() => setInput(p)}
                    key={`prompt_${index}`}
                    className="bg-neutral-800 p-4 cursor-pointer rounded-lg"
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {error && <div className="text-red-500 mb-4">{error.message}</div>}

        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            streaming={
              status === "streaming" &&
              message.id === messages[messages.length - 1].id
            }
          />
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
