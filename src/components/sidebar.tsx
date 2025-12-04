import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import type { SelectConversation } from "@/lib/db-schema";
import { SignedIn, useAuth } from "@clerk/nextjs";
import UploadFile from "./UploadFile";
import Styles from "@/assets/styles/customScrollbar.module.css";
import { PenLine, PanelLeft, Search } from "lucide-react";
import bgStyles from "@/assets/styles/background.module.css";
import UserComponent from "./userComponent";
import MessagesLimit from "./messagesLimit";

export default function Sidebar({
  reset,
  conversations,
  setCurrentConversation,
  deleteConversation,
  onSignInRequired,
  searchConversations,
}: {
  reset: () => void;
  conversations: SelectConversation[];
  setCurrentConversation: (conversation: SelectConversation) => void;
  deleteConversation: (conversationId: number) => void;
  onSignInRequired: () => void;
  searchConversations: (searchQuery: string) => void;
}) {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleNewConversation = () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }
    reset();
  };

  return (
    <div className={`flex z-20 ${bgStyles.sideBarBackground}`}>
      <SignedIn>
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
      </SignedIn>
      <div
        className={`hidden lg:block h-screen transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "w-[300px]" : "w-0"
        }`}
      >
        <div className="flex flex-col h-screen w-[300px] robert pt-16">
          {/* <h1 className="text-2xl font-bold font-goldman px-4 py-6">My GPT</h1> */}
          {/* {toggleUpload && <UploadFile onSignInRequired={onSignInRequired} />} */}
          <div
            className="px-4 py-3 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex items-center gap-2"
            style={{ background: "linear-gradient(90deg,rgba(2, 0, 36, 1) 0%, rgba(68, 0, 150, 1) 100%)" }}
          >
            <MessagesLimit />
          </div>
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
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setCurrentConversation(conversation)}
                className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex justify-between"
              >
                {conversation.title
                  ? conversation.title.length < 25
                    ? conversation.title
                    : conversation.title?.slice(0, 25) + "..."
                  : "Untitled Conversation"}
                <span
                  className="opacity-0 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </span>
              </div>
            ))}
          </div>
          <UserComponent />
        </div>
      </div>
    </div>
  );
}
