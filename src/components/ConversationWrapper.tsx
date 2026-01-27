"use client";

import { useMemo, useState } from "react";
// import Message from "./message";
import { ChatMessage } from "@/types/chatMessage";
import ActivitySuggestionCard, {
  Activity,
} from "@/components/ActivitySuggestionCard"; // [NEW] Import custom card component
import PromptInput from "./PromptInput";
import {
  ChatRequestOptions,
  FileUIPart,
  ChatStatus,
  isToolUIPart,
  getToolName,
} from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageActions,
  MessageAction,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import Link from "next/link";
import { CopyAction } from "./CopyAction";
import {
  LoaderCircle,
  RefreshCcw,
  ThumbsUp,
  ThumbsDown,
  FlaskConical,
  CheckCircle,
} from "lucide-react";
import TestDialog from "@/components/admin/TestDialog";
import Styles from "@/assets/styles/customScrollbar.module.css";
import Background from "@/components/background";
import { useUser } from "@clerk/nextjs";

import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { toast } from "react-toastify";

const welcomeMessage = "Hello! How can I assist you today?";
const promptExamples = [
  "Generate an image of a kitten",
  "Write me an Email",
  "Who created Linux",
];

export default function ConversationWrapper({
  messages,
  sendMessage,
  status,
  error,
  stop,
  regenerate,
  conversationId,
}: {
  messages: ChatMessage[];
  sendMessage: (
    message: { text: string; files?: FileUIPart[] },
    options?: ChatRequestOptions,
  ) => Promise<void>;
  status: ChatStatus;
  error: Error | undefined;
  stop: () => void;
  regenerate: (options?: ChatRequestOptions) => Promise<void>;
  conversationId?: number;
}) {
  const { usage } = useTokenUsage();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const [showRibbon, setShowRibbon] = useState(true);
  const { user } = useUser();
  const [localFeedback, setLocalFeedback] = useState<
    Record<string, "positive" | "negative">
  >({});
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testDialogQuestion, setTestDialogQuestion] = useState("");
  // Track previous conversation ID to reset state during render
  const [prevConversationId, setPrevConversationId] = useState(conversationId);

  const isAdmin = user?.publicMetadata?.role === "admin";

  // Reset local feedback when conversation changes
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setLocalFeedback({});
  }

  const displayMessages = useMemo(() => {
    return messages.map((message) => {
      const { id, parts, role } = message;

      if (role === "user") {
        const textParts = parts.filter((part) => part.type === "text");
        const fileParts = parts.filter((part) => part.type === "file");

        return {
          key: id,
          role,
          content: textParts.map((part) => part.text).join(""),
          attachments: fileParts.map((part) => ({
            type: "file" as const,
            url: part.url || "",
            mediaType: part.mediaType,
            filename: part.filename,
          })),
        };
      } else {
        // For assistant messages, keep the original structure
        // const fileParts = parts.filter(
        //   (part) =>
        //     part.type === "tool-generateImage" &&
        //     part.state === "output-available"
        // );
        const toolParts = parts.filter((part) => isToolUIPart(part));
        return {
          key: id,
          role,
          content: parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(""),
          // attachments: fileParts.map((part) => ({
          //   type: "file" as const,
          //   url: part.output || "",
          //   mediaType: "image/png",
          // })),
          toolsStatus: toolParts,
        };
      }
    });
  }, [messages]);

  const handleFeedback = async (messageIndex: number, isGood: boolean) => {
    const feedbackType = isGood ? "positive" : "negative";
    const messageKey = displayMessages[messageIndex]?.key;

    if (!messageKey) return;

    // Store feedback locally for visual status
    setLocalFeedback((prev) => ({ ...prev, [messageKey]: feedbackType }));

    try {
      const result = await submitFeedbackAction({
        messageIndex,
        feedback: feedbackType,
        conversationId,
      });

      if (result.success) {
        toast.success("Feedback submitted! Thank you.");
      } else {
        toast.error("Failed to submit feedback.");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("An error occurred while submitting feedback.");
    }
  };

  return (
    <div className="flex flex-col grow h-screen relative items-center pt-6">
      {/* Upgrade Ribbon */}
      {/* Upgrade Ribbon (not full width, dismissible with transition) - Hidden for subscribed users */}
      {!isSubscribed && !subscriptionLoading && user && (
        <div
          className={`z-30 flex justify-center absolute top-3 left-0 w-full pointer-events-none transition-all duration-500 ${
            showRibbon
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-2 md:rounded-md bg-linear-to-r from-blue-500 to-purple-600 shadow-lg text-white text-sm font-semibold w-full md:w-auto mx-auto pointer-events-auto relative whitespace-nowrap">
            <span className="whitespace-nowrap flex-1 overflow-hidden">
              Upgrade for unlimited messages, advanced models, and a better
              experience!
            </span>
            <Link href="/upgrade" className="ml-2">
              <button className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors border border-white/30 cursor-pointer">
                Upgrade
              </button>
            </Link>
            <button
              className="text-white/70 hover:text-white text-lg font-bold px-1 transition-colors cursor-pointer"
              aria-label="Close upgrade ribbon"
              onClick={() => setShowRibbon(false)}
              tabIndex={0}
              style={{ background: "none", border: "none", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      <Background count={messages.length} />
      {/* <Header /> */}
      {!messages.length && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 z-10 w-full">
          <div className="h-full flex-col flex justify-center items-center gap-4 mx-auto text-center">
            <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
            <PromptInput
              sendMessage={sendMessage}
              status={status}
              stop={stop}
            />
            <div className="flex flex-col md:flex-row gap-2">
              {promptExamples.map((p, index) => {
                const isDisabled = usage?.hasReachedLimit;
                return (
                  <div
                    onClick={() => !isDisabled && sendMessage({ text: p })}
                    key={`prompt_${index}`}
                    className={`p-4 rounded-lg transition-colors ${
                      isDisabled
                        ? "bg-neutral-800/20 text-neutral-600 cursor-not-allowed"
                        : "bg-neutral-800/40 cursor-pointer hover:bg-neutral-800/60"
                    }`}
                    title={isDisabled ? "Daily message limit reached" : ""}
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error.message}</div>}
      {messages.length > 0 && (
        <>
          <Conversation
            className={`relative size-full z-10 flex-1 overflow-hidden ${Styles.customScrollbar}`}
          >
            <ConversationContent className="max-w-250 mx-auto">
              {displayMessages.map((message, index) => {
                const isSystemMessage =
                  typeof message.key === "string" &&
                  message.key.startsWith("system-");

                // Find the last user message index
                const lastUserMessageIndex = displayMessages
                  .map((msg, idx) => (msg.role === "user" ? idx : -1))
                  .filter((idx) => idx !== -1)
                  .pop();

                const isLastUserMessage =
                  message.role === "user" && index === lastUserMessageIndex;
                return (
                  <Message from={message.role} key={message.key}>
                    {message.role === "user" &&
                      message.attachments &&
                      message.attachments.length > 0 && (
                        <MessageAttachments className="mb-2">
                          {message.attachments.map((attachment) => (
                            <MessageAttachment
                              data={attachment}
                              key={attachment.url}
                            />
                          ))}
                        </MessageAttachments>
                      )}

                    {/* Tools Status Display for Assistant Messages */}
                    {message.role === "assistant" &&
                      message.toolsStatus &&
                      message.toolsStatus.length > 0 && (
                        <div className="mb-2">
                          {message.toolsStatus.map((tool, index) => {
                            const toolName = getToolName(tool);
                            // console.log("Tool Debug:", { toolName, state: tool.state, output: tool.output });

                            if (
                              toolName === "suggestActivities" &&
                              tool.state === "output-available" &&
                              tool.output
                            ) {
                              let activities = [];
                              try {
                                const outputData =
                                  typeof tool.output === "string"
                                    ? JSON.parse(tool.output)
                                    : tool.output;
                                if (
                                  outputData.activities &&
                                  Array.isArray(outputData.activities)
                                ) {
                                  activities = outputData.activities;
                                } else if (
                                  outputData.data &&
                                  Array.isArray(outputData.data)
                                ) {
                                  // Fallback for previous structure if any
                                  activities = outputData.data;
                                } else if (Array.isArray(outputData)) {
                                  activities = outputData;
                                }
                              } catch (e) {
                                console.error(
                                  "Error parsing activities output:",
                                  e,
                                );
                              }

                              if (activities.length > 0) {
                                return (
                                  <div
                                    key={`${message.key}-tool-${index}`}
                                    className="w-full my-4"
                                  >
                                    {activities.map((activity: Activity) => (
                                      <ActivitySuggestionCard
                                        key={activity.id || Math.random()}
                                        activity={activity}
                                      />
                                    ))}
                                  </div>
                                );
                              }
                            }

                            // Handle createStaffRequest tool
                            if (
                              toolName === "createStaffRequest" &&
                              tool.state === "output-available" &&
                              tool.output
                            ) {
                              let requestData = null;
                              try {
                                const outputData =
                                  typeof tool.output === "string"
                                    ? JSON.parse(tool.output)
                                    : tool.output;
                                if (outputData.success) {
                                  requestData = outputData;
                                }
                              } catch (e) {
                                console.error(
                                  "Error parsing staff request output:",
                                  e,
                                );
                              }

                              if (requestData) {
                                return (
                                  <div
                                    key={`${message.key}-tool-${index}`}
                                    className="my-4"
                                  >
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
                                      <CheckCircle className="size-5 text-emerald-400" />
                                      <span className="text-emerald-100">
                                        {requestData.userMessage ||
                                          "Your request has been submitted to the staff."}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                            }

                            // return (
                            //   <Tool key={`${message.key}-tool-${index}`}>
                            //     <ToolHeader
                            //       title={toolName}
                            //       type={
                            //         tool.type === "dynamic-tool"
                            //           ? "tool-dynamic"
                            //           : (tool.type as `tool-${string}`)
                            //       }
                            //       state={tool.state}
                            //     />
                            //     <ToolContent>
                            //       {tool.input && (
                            //         <ToolInput input={tool.input} />
                            //       )}
                            //       {(tool.output || tool.errorText) &&
                            //         tool.state === "output-available" && (
                            //           <ToolOutput
                            //             output={tool.output}
                            //             errorText={tool.errorText}
                            //             toolName={toolName}
                            //           />
                            //         )}
                            //     </ToolContent>
                            //   </Tool>
                            // );
                          })}
                        </div>
                      )}

                    <MessageContent>
                      {message.content?.trim() && (
                        <div
                          className={
                            isSystemMessage
                              ? "border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 rounded-lg p-4 my-2"
                              : ""
                          }
                        >
                          <MessageResponse key={`${message.key}-content`}>
                            {message.content}
                          </MessageResponse>
                        </div>
                      )}
                    </MessageContent>
                    {message.role === "user" ? (
                      <MessageActions className="flex justify-end gap-0">
                        {isLastUserMessage && (
                          <MessageAction
                            className="cursor-pointer"
                            onClick={() => regenerate()}
                            label="Retry"
                          >
                            <RefreshCcw className="size-4" />
                          </MessageAction>
                        )}
                        {isAdmin && (
                          <MessageAction
                            className="cursor-pointer"
                            onClick={() => {
                              setTestDialogQuestion(message.content);
                              setTestDialogOpen(true);
                            }}
                            label="Add to Tests"
                          >
                            <FlaskConical className="size-4" />
                          </MessageAction>
                        )}
                        <CopyAction content={message.content} />
                      </MessageActions>
                    ) : (
                      <>
                        {/* Show loading spinner above actions for the last assistant message while streaming */}
                        {status !== "ready" &&
                          index === displayMessages.length - 1 && (
                            <div className="mb-2">
                              <LoaderCircle className="animate-spin inline-block size-4" />
                            </div>
                          )}
                        <MessageActions className="flex gap-0">
                          {(!localFeedback[message.key] ||
                            localFeedback[message.key] === "positive") && (
                            <MessageAction
                              className="cursor-pointer"
                              onClick={() => handleFeedback(index, true)}
                              label="Good response"
                            >
                              <ThumbsUp
                                className="size-4"
                                fill={
                                  localFeedback[message.key] === "positive"
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </MessageAction>
                          )}
                          {(!localFeedback[message.key] ||
                            localFeedback[message.key] === "negative") && (
                            <MessageAction
                              className="cursor-pointer"
                              onClick={() => handleFeedback(index, false)}
                              label="Bad response"
                            >
                              <ThumbsDown
                                className="size-4"
                                fill={
                                  localFeedback[message.key] === "negative"
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </MessageAction>
                          )}
                          <CopyAction content={message.content} />
                        </MessageActions>
                      </>
                    )}
                  </Message>
                );
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <PromptInput sendMessage={sendMessage} status={status} stop={stop} />
        </>
      )}
      {/* Admin Test Dialog */}
      {isAdmin && (
        <TestDialog
          mode="add"
          isOpen={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          initialPrompt={testDialogQuestion}
        />
      )}
    </div>
  );
}
