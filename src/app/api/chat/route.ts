import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { tools, webSearchTool } from "./tools";
import { ChatMessage } from "@/types/chatMessage";
import {
  saveMessage,
  getLatestMessageByConversationId,
  updateMessageTextContent,
} from "@/services/messagesService";
import {
  hasReachedDailyLimit,
  getRemainingMessages,
  recordUsage,
} from "@/services/tokenUsageService";
import { getSystemPrompt } from "@/services/settingsService";
import { Tools } from "@/types/Tools";
import { uploadImageToImageKit } from "./imageKit";
import { auth } from "@clerk/nextjs/server";
import { renameConversationAI } from "./renameConversationAI";

import { getDefaultModel } from "@/services/modelsService";

export async function POST(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized - Please sign in", {
        status: 401,
      });
    }

    // Check if user has reached their daily message limit
    const hasReachedLimit = await hasReachedDailyLimit(userId);

    if (hasReachedLimit) {
      const remainingMessages = await getRemainingMessages(userId);
      return new Response(
        JSON.stringify({
          error: "Daily message limit reached",
          message:
            "You have reached your daily limit of 10 messages. Please upgrade for unlimited access or try again tomorrow.",
          remainingMessages,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { messages, conversation, webSearch, trigger } = await req.json();

    const lastMessage = messages[messages.length - 1];
    for (const part of lastMessage.parts) {
      if (part.type === "file" && part.mediaType.startsWith("image/")) {
        part.url = await uploadImageToImageKit(part.url!);
      }
    }

    const modelMessages = await convertToModelMessages(messages);

    const defaultModel = await getDefaultModel();
    const selectedmodel = defaultModel?.model_id || "openai/gpt-5-nano";

    // Count user messages to determine if we should rename
    const userMessageCount = messages.filter(
      (msg: ChatMessage) => msg.role === "user",
    ).length;

    const backgroundTasks = Promise.allSettled(
      [
        trigger === "submit-message" &&
          saveMessage(lastMessage, conversation.id, selectedmodel),
        userMessageCount <= 3 &&
          renameConversationAI(
            modelMessages,
            conversation.id,
            conversation.user_id,
            conversation.title || undefined,
          ),
      ].filter(Boolean),
    );

    const toolsToUse: Tools = { ...tools };

    if (webSearch) toolsToUse.webSearch = webSearchTool;

    // Variable to store token usage from streamText
    let streamUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    } | null = null;

    // Get configurable system prompt
    const systemPrompt = await getSystemPrompt();
    console.log("Model", selectedmodel);
    



    const response = streamText({
      messages: modelMessages,
      model: selectedmodel,
      tools: toolsToUse,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
      onFinish: async ({ usage }) => {
        streamUsage = {
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          totalTokens: usage.totalTokens || 0,
        };
      },
    });

    return response.toUIMessageStreamResponse({
      onFinish: async ({ responseMessage }) => {
        try {
          // Wait for background tasks to complete
          const results = await backgroundTasks;

          // Log any failures but don't fail the response
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.error(`Background task ${index} failed:`, result.reason);
            }
          });

          // Handle regenerate-message trigger
          if (trigger === "regenerate-message") {
            const latestMessage = await getLatestMessageByConversationId(
              conversation.id,
            );

            if (latestMessage && latestMessage.role === "assistant") {
              // Replace the content of the latest assistant message
              const newTextContent = (responseMessage as ChatMessage).parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join(" ");

              await updateMessageTextContent(
                latestMessage.id,
                newTextContent,
                (responseMessage as ChatMessage).parts,
              );
            } else {
              // Latest message is a user message (previous generation failed), save as usual
              await saveMessage(
                responseMessage as ChatMessage,
                conversation.id,
                selectedmodel,
              );
            }
          } else {
            await saveMessage(
              responseMessage as ChatMessage,
              conversation.id,
              selectedmodel,
            );
          }

          // Record message usage with actual token count from AI response
          const actualTokens = streamUsage?.totalTokens || 0;
          const usageResult = await recordUsage(userId, actualTokens);

          console.log(
            `User ${userId} - Messages: ${usageResult.usage.messages_sent}/${usageResult.usage.daily_message_limit}, Actual Tokens: ${usageResult.usage.tokens_used}`,
          );
        } catch (error) {
          console.error("Error in onFinish:", error);
        }
      },
    });
  } catch (error) {
    console.error("Error in /api/chat route:", error);
    return new Response("Error processing request", {
      status: 500,
      statusText: String(error),
    });
  }
}
