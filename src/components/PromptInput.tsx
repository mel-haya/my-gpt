"use client";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputHeader,
  PromptInputProvider,
} from "@/components/ai-elements/prompt-input";
import { useRef, useState, useCallback } from "react";
import { ChatRequestOptions, FileUIPart, ChatStatus } from "ai";

const InputDemo = ({
  sendMessage,
  status,
}: {
  sendMessage: (
    message: { text: string; files?: FileUIPart[] },
    options?: ChatRequestOptions,
  ) => Promise<void>;
  status: ChatStatus;
  stop: () => void;
}) => {
  const [text, setText] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize the submit handler to prevent recreating the function on every render
  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);
      if (!(hasText || hasAttachments)) {
        return;
      }
      sendMessage(
        {
          text: message.text || "Sent with attachments",
          files: message.files,
        },
      );
      setText("");
    },
    [sendMessage],
  );

  //   const { messages, status, sendMessage } = useChat();
  return (
    <PromptInputProvider>
      <PromptInput
        onSubmit={handleSubmit}
        className="my-4 max-w-[1000px] mx-6"
        globalDrop
        accept="image/*"
        multiple={true}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>
        <div className="w-full grid">
          <PromptInputBody className="flex w-full gap-2 items-center px-2">
            <PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              ref={textareaRef}
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputSpeechButton
                onTranscriptionChange={setText}
                textareaRef={textareaRef}
              />
            </PromptInputTools>
            <PromptInputSubmit disabled={!text && !status} status={status} />
          </PromptInputFooter>
        </div>
      </PromptInput>
    </PromptInputProvider>
  );
};
export default InputDemo;
