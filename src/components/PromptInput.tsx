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
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputHeader,
  PromptInputProvider,
} from "@/components/ai-elements/prompt-input";
import { ChatMessage } from "@/types/chatMessage";
import { GlobeIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  CreateUIMessage,
  ChatRequestOptions,
  FileUIPart,
  ChatStatus,
} from "ai";

const models = [
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "xai/grok-4-fast-non-reasoning", name: "Grok 4 Fast" },
];
const InputDemo = ({
  sendMessage,
  status,
  stop,
  selectedModel,
  onModelChange,
}: {
  sendMessage: (
    message: { text: string; files?: FileUIPart[] },
    options?: ChatRequestOptions
  ) => Promise<void>;
  status: ChatStatus;
  stop: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}) => {
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  //   const { messages, status, sendMessage } = useChat();
  const handleSubmit = (message: PromptInputMessage) => {
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
      {
        body: {
          model: selectedModel,
          webSearch: useWebSearch,
        },
      }
    );
    setText("");
  };
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
              <PromptInputButton
                onClick={() => setUseWebSearch(!useWebSearch)}
                variant={useWebSearch ? "default" : "ghost"}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputSelect
                onValueChange={onModelChange}
                value={selectedModel}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!text && !status} status={status} />
          </PromptInputFooter>
        </div>
      </PromptInput>
    </PromptInputProvider>
  );
};
export default InputDemo;
