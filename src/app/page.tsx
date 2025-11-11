"use client";
import { Button } from "@/components/ui/button";
import Conversation from "@/components/conversation";
import Image from "next/image";
import Sidebar from "@/components/sidebar";
import { useChat } from "@ai-sdk/react";
import { chatMessage } from "./api/chat/route";
import { ToastContainer } from 'react-toastify';



export default function Home() {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat<chatMessage>();


  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Sidebar 
        setMessages={setMessages}
      />
      <Conversation 
        messages={messages}
        sendMessage={sendMessage}
        status={status}
        error={error}
        stop={stop}
      />
      <ToastContainer
        autoClose={3000}
        theme="dark"
        pauseOnHover={false}
      />
    </div>
  );
}
