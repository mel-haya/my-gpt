
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import type { SelectConversation } from "@/lib/db-schema";
import { useAuth } from "@clerk/nextjs";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadClick = async () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }

    if (!file) {
      toast.error("Please select a PDF file first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      setLoading(true);
      const result = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const resultJson = await result.json();
      setLoading(false);
      if (resultJson.success) {
        toast.success("PDF file uploaded and processed successfully.");
        fileInputRef.current!.value = "";
      } else {
        toast.error("Error processing PDF: " + resultJson.error);
      }
    } catch {
      toast.error("Failed to upload the PDF file.");
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  const handleNewConversation = () => {
    if (!isSignedIn) {
      onSignInRequired();
      return;
    }
    reset();
  };

  const checkFile = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setFile(file);
    } else {
      alert("No file chosen");
    }
  };

  return (
    <div className="hidden lg:flex min-w-[300px] bg-gray-100 dark:bg-neutral-900/80 border-r border-gray-300 dark:border-gray-800 flex-col gap-2">
      <h1 className="text-2xl font-bold font-goldman px-4 py-6">My GPT</h1>
      <div className="border-2 border-dashed  mx-4 border-neutral-500 rounded-lg relative">
        {file ? (
          loading ? (
            <div className="text-center text-neutral-700 dark:text-neutral-300 italic px-4 py-12 flex justify-center items-center">
              <h2>Processing PDF...</h2>
            </div>
          ) : (
            <div className="text-center text-neutral-700 dark:text-neutral-300 italic px-4 py-12 flex justify-center items-center gap-1">
              <PdfIcon width="24" height="24" />
              {shortenText(file.name)}
            </div>
          )
        ) : (
          <div className="text-center text-neutral-500 italic px-4 py-12">
            drag or select your PDFs here
          </div>
        )}

        <input
          ref={fileInputRef}
          onChange={checkFile}
          type="file"
          accept=".pdf"
          className="w-full h-full opacity-0 absolute top-0 left-0 cursor-pointer"
        />
      </div>
      <Button className="mx-4 cursor-pointer" onClick={handleUploadClick}>
        Upload PDF to the knowledge base
      </Button>
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
