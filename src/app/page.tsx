"use client";
import { Button } from "@/components/ui/button";
import Conversation from "@/components/conversation";
import Image from "next/image";

export default function Home() {

  async function getUser() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    console.log(data);
  }
  

  return (
    <div className="flex min-h-screen  bg-zinc-50 font-sans dark:bg-black">
      <Conversation />
    </div>
  );
}
