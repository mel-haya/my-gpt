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
import { GlobeIcon, Crown } from "lucide-react";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  CreateUIMessage,
  ChatRequestOptions,
  FileUIPart,
  ChatStatus,
} from "ai";
import { getAvailableModels, ModelOption } from "@/app/actions/models";
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
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const availableModels = await getAvailableModels();
        setModels(availableModels);
        
        // Set gpt-4o as default if available and current model is the initial default
        const gpt4oModel = availableModels.find(model => model.id === "openai/gpt-4o");
        if (gpt4oModel && selectedModel === "openai/gpt-5-nano") {
          onModelChange("openai/gpt-4o");
        }
      } catch (error) {
        console.error("Failed to load models:", error);
        // Fallback to basic models
        setModels([
          { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
          { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash" },
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    loadModels();
  }, [selectedModel, onModelChange]);

  // Memoize the models dropdown options to prevent unnecessary rerenders
  const modelOptions = useMemo(() => 
    models.map((model) => (
      <PromptInputSelectItem key={model.id} value={model.id}>
        <div className="flex items-center gap-2">
          {model.name}
          {model.premium && (
            <Crown size={12} className="text-yellow-500" />
          )}
        </div>
      </PromptInputSelectItem>
    )), 
    [models]
  );

  // Memoize the submit handler to prevent recreating the function on every render
  const handleSubmit = useCallback((message: PromptInputMessage) => {
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
  }, [sendMessage, selectedModel, useWebSearch]);

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
                disabled={isLoadingModels}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue 
                    placeholder={isLoadingModels ? "Loading models..." : "Select a model"}
                  />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {modelOptions}
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
