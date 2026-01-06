"use client";

import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { upload } from "@vercel/blob/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadIcon } from "lucide-react";
import CryptoJS from "crypto-js";

interface UploadFileProps {
  onUploadComplete?: () => void;
}

export default function UploadFile({ onUploadComplete }: UploadFileProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isSignedIn, userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checkFile = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setFile(file);
    } else {
      alert("No file chosen");
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as ArrayBuffer."));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const calculateFileHash = async (file: File) => {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
    return hash;
  };

  const pollFileStatus = async (hash: string, maxAttempts = 30) => {
    let dialogClosed = false;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusRes = await fetch(`/api/upload/status?hash=${hash}`);
        const statusData = await statusRes.json();

        if (statusData.exists && statusData.status === "completed") {
          return { success: true, status: "completed" };
        } else if (statusData.exists && statusData.status === "failed") {
          return { success: false, status: "failed" };
        } else if (statusData.exists && statusData.status === "processing") {
          // Close dialog on first detection of processing status
          if (!dialogClosed) {
            setLoading(false);
            setIsDialogOpen(false);
            setFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            toast.info("File is being processed in the background. You'll be notified when it's complete.");
            // Trigger refresh to show file with processing status
            onUploadComplete?.();
            dialogClosed = true;
          }
          // Wait 2 seconds before next poll
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          // File not found yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      } catch (error) {
        console.error("Error polling file status:", error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
    
    return { success: false, status: "timeout" };
  };

  const handleUploadClick = async () => {
    if (!isSignedIn) {
      toast.error("You must be signed in to upload files.");
      return;
    }

    if (!file) {
      toast.error("Please select a PDF file first.");
      return;
    }

    try {
      setLoading(true);
      const hash = await calculateFileHash(file);

      const checkRes = await fetch(`/api/upload/check-hash?hash=${hash}`);
      const checkJson = await checkRes.json();

      if (checkJson.exists) {
        toast.info("This file has already been processed.");
        setLoading(false);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const newBlob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: `${userId}:${hash}`,
      });

      if (newBlob) {
        // Start background polling - this will close the dialog when processing begins
        pollFileStatus(hash).then(pollResult => {
          if (pollResult.success && pollResult.status === "completed") {
            toast.success("File has been processed and added to the knowledge base successfully!");
            // Only trigger refresh after successful processing
            onUploadComplete?.();
          } else if (pollResult.status === "failed") {
            toast.error("File processing failed. Please try uploading again.");
          } else if (pollResult.status === "timeout") {
            toast.warning("File processing is taking longer than expected. Please refresh manually to see the results.");
          }
        }).catch(error => {
          console.error("Error during background polling:", error);
          toast.error("Error monitoring file processing status.");
        });
      } else {
        toast.error("Error uploading the file.");
        setLoading(false);
      }
    } catch (error) {
      toast.error("Failed to upload the PDF file.");
      console.error("Upload error:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="flex flex-col gap-2">
        <DialogTrigger asChild>
          <Button className="px-4" variant="outline" onClick={() => setIsDialogOpen(true)}> <UploadIcon className="h-4 w-4" /> Upload File</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              You can upload PDF or DOCX files to add information to the
              knowledge base.
            </DialogDescription>
          </DialogHeader>

          <div className="border-2 border-dashed border-neutral-500 rounded-lg relative">
            {file ? (
              loading ? (
                <div className="text-center text-neutral-700 dark:text-neutral-300 italic px-4 py-12 flex justify-center items-center">
                  <h2>Processing file and saving to database...</h2>
                </div>
              ) : (
                <div className="text-center text-neutral-700 dark:text-neutral-300 italic px-4 py-12 flex justify-center items-center gap-1">
                  <PdfIcon width="24" height="24" />
                  {shortenText(file.name)}
                </div>
              )
            ) : (
              <div className="text-center text-neutral-500 italic px-4 py-12">
                drag or select your File here
              </div>
            )}

            <input
              ref={fileInputRef}
              onChange={checkFile}
              type="file"
              accept=".pdf,.docx"
              className="w-full h-full opacity-0 absolute top-0 left-0 cursor-pointer"
            />
          </div>
          <DialogFooter className="flex sm:justify-center">
            <Button className="cursor-pointer mt-2" onClick={handleUploadClick}>
              Upload file to the knowledge base
            </Button>
          </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  );
}
