
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import type { SelectConversation } from "@/lib/db-schema";
import { useAuth } from "@clerk/nextjs";
import UploadFile from "./UploadFile";

export default function Sidebar({
  reset,
  conversations,
  setCurrentConversation,
  deleteConversation,
  onSignInRequired,
}: {
  reset: () => void;
  conversations: SelectConversation[];
  setCurrentConversation: (conversation: SelectConversation) => void;
  deleteConversation: (conversationId: number) => void;
  onSignInRequired: () => void;
}) {
  const { isSignedIn } = useAuth();

  const handleNewConversation = () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }
    reset();
  };

  return (
    <div className="hidden lg:flex min-w-[300px] bg-gray-100 dark:bg-neutral-900/80 border-r border-gray-300 dark:border-gray-800 flex-col gap-2">
      <h1 className="text-2xl font-bold font-goldman px-4 py-6">My GPT</h1>
      <UploadFile onSignInRequired={onSignInRequired} />
      <Button className="mx-4 cursor-pointer" onClick={handleNewConversation}>
        New Conversation
      </Button>
      <div>
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => setCurrentConversation(conversation)}
            className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex justify-between"
          >
            {conversation.title
              ? (conversation.title.length < 30)
                ? conversation.title
                : conversation.title?.slice(0, 30) + "..."
              : "Untitled Conversation"}
            <span className="opacity-0 hover:opacity-100" onClick={(e) => {
              e.stopPropagation();
              deleteConversation(conversation.id);
            }}><i className="fa-solid fa-xmark"></i></span>
          </div>
        ))}
      </div>
    </div>
  );
}
