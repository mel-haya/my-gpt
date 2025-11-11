
import { chatMessage } from "@/app/api/chat/route";
import { Button } from "@/components/ui/button";
import { toast } from 'react-toastify';
import { useRef } from "react";


export default function Sidebar({
    setMessages,
}
: {
    setMessages: (messages: chatMessage[]) => void;
}) {

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const handleUploadClick = () => {
        toast.info("Upload feature coming soon!");
    };

    const checkFile = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      alert("File exists: " + file.name);
    } else {
      alert("No file chosen");
    }
  };

    return (
        <div className="hidden lg:flex min-w-[300px] bg-gray-100 dark:bg-neutral-900/80 pt-26 border-r border-gray-300 dark:border-gray-800 flex-col gap-2">
            <div className="border-2 border-dashed  mx-4 border-neutral-500 rounded-lg relative">
                <div className="text-center text-neutral-500 italic px-4 py-12">drag or select your PDFs here</div>
                <input ref={fileInputRef} onChange={checkFile} type="file" accept=".pdf" multiple className="w-full h-16 opacity-0 absolute top-0 left-0 cursor-pointer"/>
            </div>
            <Button className="mx-4 cursor-pointer" onClick={handleUploadClick}>Upload PDF to the knowledge base</Button>
            <Button className="mx-4 cursor-pointer" onClick={() => setMessages([])}>New Conversation</Button>
            
        </div>
    );
}