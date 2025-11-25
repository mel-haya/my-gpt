import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { upload } from "@vercel/blob/client";
import CryptoJS from "crypto-js";

export default function UploadFile({
  onSignInRequired,
}: {
  onSignInRequired: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useAuth();
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
        clientPayload: hash,
      });
      console.log("Upload result:", newBlob);
      setLoading(false);
      if (newBlob) {
        toast.success("PDF file uploaded and processed successfully.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error("Error processing PDF: ");
      }
    } catch (error) {
      toast.error("Failed to upload the PDF file.");
      console.error("Upload error:", error);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };
  return (
    <>
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
    </>
  );
}
