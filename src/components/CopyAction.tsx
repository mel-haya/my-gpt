"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { MessageAction } from "./ai-elements/message";

interface CopyActionProps {
  content: string;
}

export function CopyAction({ content }: CopyActionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <MessageAction
      className="cursor-pointer"
      onClick={handleCopy}
      label={copied ? "Copied" : "Copy"}
    >
      {copied ? (
        <CheckIcon className="size-4 text-green-500" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </MessageAction>
  );
}
