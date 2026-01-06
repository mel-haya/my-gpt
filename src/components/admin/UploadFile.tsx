"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { upload } from "@vercel/blob/client";
import { UploadIcon } from "lucide-react";
import CryptoJS from "crypto-js";

interface UploadFileProps {
  onUploadComplete?: () => void;
}

export default function UploadFile({ onUploadComplete }: UploadFileProps) {
  const [loading, setLoading] = useState(false);
  const { isSignedIn, userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleUpload(file);
      // Reset the input to allow selecting the same file again
      event.target.value = '';
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
    let processingNotified = false;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusRes = await fetch(`/api/upload/status?hash=${hash}`);
        const statusData = await statusRes.json();

        if (statusData.exists && statusData.status === "completed") {
          return { success: true, status: "completed" };
        } else if (statusData.exists && statusData.status === "failed") {
          return { success: false, status: "failed" };
        } else if (statusData.exists && statusData.status === "processing") {
          // Only trigger refresh on first detection of processing
          if (!processingNotified) {
            onUploadComplete?.();
            processingNotified = true;
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

  const handleUpload = async (file: File) => {
    if (!isSignedIn) {
      toast.error("You must be signed in to upload files.");
      return;
    }

    try {
      setLoading(true);
      toast.info(`Uploading ${file.name}...`);
      
      const hash = await calculateFileHash(file);

      const checkRes = await fetch(`/api/upload/check-hash?hash=${hash}`);
      const checkJson = await checkRes.json();

      if (checkJson.exists) {
        toast.info("This file has already been processed.");
        setLoading(false);
        return;
      }

      const newBlob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: `${userId}:${hash}`,
      });

      if (newBlob) {
        setLoading(false); // Reset loading state after successful upload
        
        // Start background polling
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
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };
  return (
    <div className="flex flex-col gap-2">
      <Button 
        className="px-4" 
        variant="outline" 
        onClick={handleButtonClick}
        disabled={loading}
      >
        <UploadIcon className="h-4 w-4" />
        {loading ? "Uploading..." : "Upload File"}
      </Button>
      <input
        ref={fileInputRef}
        onChange={handleFileSelect}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
      />
    </div>
  );
}
