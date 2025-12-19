import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import type { SelectConversation } from "@/lib/db-schema";
import { SignedIn, useAuth } from "@clerk/nextjs";

import Styles from "@/assets/styles/customScrollbar.module.css";
import { PenLine, PanelLeft, Search } from "lucide-react";
import bgStyles from "@/assets/styles/background.module.css";
import UserComponent from "./userComponent";
import MessagesLimit from "./messagesLimit";
import ConversationActionMenu from "@/components/conversationActionMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareX } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function Sidebar({
  reset,
  conversations,
  setCurrentConversation,
  deleteConversation,
  onSignInRequired,
  searchConversations,
  loading,
}: {
  reset: () => void;
  conversations: SelectConversation[];
  setCurrentConversation: (conversation: SelectConversation) => void;
  deleteConversation: (conversationId: number) => void;
  onSignInRequired: () => void;
  searchConversations: (searchQuery: string) => void;
  loading: boolean;
}) {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skeletonWidths = [25, 22, 30, 18, 27, 20, 24, 28, 21];

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchConversations(searchQuery);
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  const handleNewConversation = () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }
    reset();
  };

  return (
    <div className={`flex z-30 ${bgStyles.sideBarBackground}`}>
      <div
        className={`fixed top-0 left-0 mt-4 ml-2 flex gap-2 p-1 rounded-lg transition-all ${
          isOpen ? "bg-gray-transparent" : "bg-gray-200 dark:bg-neutral-800"
        }`}
      >
        <div
          className="p-1"
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          <PanelLeft size={20} className=" text-gray-100 cursor-pointer" />
        </div>
        {!isOpen && (
          <div
            className="p-1"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            <Search size={20} className=" text-gray-100 cursor-pointer" />
          </div>
        )}
      </div>
      <div
        className={`lg:block h-screen transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "w-[300px] " : "w-0"
        }`}
      >
        <div className="flex flex-col h-screen w-[300px] robert pt-16">
          {/* <h1 className="text-2xl font-bold font-goldman px-4 py-6">My GPT</h1> */}

          <SignedIn>
            {!isSubscribed && !subscriptionLoading && (
              <div
                className="px-4 py-3 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex items-center gap-2"
                style={{
                  background:
                    "linear-gradient(90deg,rgba(2, 0, 36, 1) 0%, rgba(68, 0, 150, 1) 100%)",
                }}
              >
                <MessagesLimit />
              </div>
            )}
          </SignedIn>
          <div
            className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex items-center gap-2"
            onClick={handleNewConversation}
          >
            <PenLine size={18} />
            New Conversation
          </div>
          <div
            className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex items-center gap-2"
            onClick={handleNewConversation}
          >
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:ring-0"
              placeholder="Search your conversations..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className={`flex-1 overflow-y-auto ${Styles.customScrollbar}`}>
            {!loading &&
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setCurrentConversation(conversation)}
                  className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex justify-between group"
                >
                  {conversation.title
                    ? conversation.title.length < 25
                      ? conversation.title
                      : conversation.title?.slice(0, 25) + "..."
                    : "Untitled Conversation"}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {/* <i className="fa-solid fa-xmark"></i> */}
                    <ConversationActionMenu
                      onDelete={() => deleteConversation(conversation.id)}
                    />
                  </div>
                </div>
              ))}
            {loading && (
              <>
                {skeletonWidths.map((_, index) => (
                  <div key={index} className="px-4 py-3 text-gray-500">
                    <Skeleton
                      className={`h-4 mb-2`}
                      style={{ width: `${skeletonWidths[index] * 3}%` }}
                    />
                  </div>
                ))}
              </>
            )}
            {!loading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 my-2 text-gray-500">
                <MessageSquareX size={70} className="mb-4 text-gray-500" />
                {!isSignedIn ? (
                  <p className="mb-2 text-center mx-4">
                    No conversations found. Please sign in to start a
                    conversation.
                  </p>
                ) : (
                  <p className="">No conversations found.</p>
                )}
              </div>
            )}
          </div>
          <UserComponent />
        </div>
      </div>
    </div>
  );
}
