import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { SelectConversation } from "@/lib/db-schema";
import { useAuth } from "@clerk/nextjs";
import UploadFile from "./UploadFile";
import Styles from "@/assets/styles/customScrollbar.module.css";
import { History, Upload, PenLine  } from "lucide-react";
import bgStyles from "@/assets/styles/background.module.css";

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
  const [isOpen, setIsOpen] = useState(false);
  const [toggleHistory, setToggleHistory] = useState(true);
  const [toggleUpload, setToggleUpload] = useState(true);
  const handleNewConversation = () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }
    reset();
  };

  return (
    <div className={`flex ${bgStyles.sideBarBackground}`}>
      <div
        className={`hidden lg:block h-screen transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "w-[300px]" : "w-0"
        }`}
      >
        <div className="flex flex-col h-screen w-[300px] robert">
          <h1 className="text-2xl font-bold font-goldman px-4 py-6">My GPT</h1>
          {toggleUpload && <UploadFile onSignInRequired={onSignInRequired} />}
          {toggleHistory && <div>
            <div
              className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer border-b border-gray-300 dark:border-gray-800 flex items-center gap-2"
              onClick={handleNewConversation}
            >
              <PenLine size={18}/>
              New Conversation
            </div>
            <div
              className={`flex-1 overflow-y-auto mt-4 ${Styles.customScrollbar}`}
            >
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
          </div>}
        </div>
      </div>
      <div className="flex flex-col py-4 bg-black/40">
        <div
          onClick={() => {
            setIsOpen(toggleHistory ? false : true);
            setToggleHistory(!toggleHistory);
            setToggleUpload(false);
          }}
        >
          <History size={24} className="m-4 text-gray-100 cursor-pointer" />
        </div>
        <div
          onClick={() => {
            setIsOpen(toggleUpload ? false : true);
            setToggleUpload(!toggleUpload);
            setToggleHistory(false);
          }}
        >
          <Upload size={24} className="m-4 text-gray-100 cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
