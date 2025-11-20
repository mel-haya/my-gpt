import { ChatMessage } from "@/types/chatMessage";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import type { SelectConversation } from "@/lib/db-schema";

export default function Sidebar({
  reset,
  setCurrentConversation,
}: {
  reset: () => void;
  setCurrentConversation: (conversation: SelectConversation) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadClick = async () => {
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
    } catch (error) {
      toast.error("Failed to upload the PDF file.");
    }
    finally {
      setLoading(false);
      setFile(null);
    }
  };

  const handleNewConversation = () => {
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
    </div>
  );
}
