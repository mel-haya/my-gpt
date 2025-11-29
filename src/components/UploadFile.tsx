import { useRef, useState } from "react";
import PdfIcon from "@/components/Icons/pdfIcon";
import { shortenText } from "@/lib/utils";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { upload } from "@vercel/blob/client";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CryptoJS from "crypto-js";
import { vi } from "zod/v4/locales";

export default function UploadFile({
  onSignInRequired,
}: {
  onSignInRequired: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("public");
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
    <div className="px-4 flex flex-col gap-2 mb-4">
      <h2 className="py-2 text-lg ">Upload File</h2>
      <p className="text-stone-400">
       You can upload PDF or DOCX files to add information to the knowledge
        base.
      </p>
      <div className="border-2 border-dashed border-neutral-500 rounded-lg relative">
        {file ? (
          loading ? (
            <div className="text-center text-neutral-700 dark:text-neutral-300 italic px-4 py-12 flex justify-center items-center">
              <h2>Processing File...</h2>
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

      <FieldSet>
        <FieldLabel>Visibility </FieldLabel>
        <FieldDescription>
          {visibility === "public"
            ? "Anyone can access the uploaded file data."
            : "Only you can access the uploaded file data."}
        </FieldDescription>
        <RadioGroup defaultValue="public" onValueChange={setVisibility}>
          <Field orientation="horizontal">
            <RadioGroupItem value="public" id="public" className="cursor-pointer"/>
            <FieldLabel htmlFor="public" className="font-normal">
              Public
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="private" id="private" className="cursor-pointer"/>
            <FieldLabel htmlFor="private" className="font-normal">
              Private
            </FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
      <Button className="cursor-pointer mt-2" onClick={handleUploadClick}>
        Upload PDF to the knowledge base
      </Button>
    </div>
  );
}
