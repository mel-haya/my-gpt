import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { getTools } from "./tools";
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
import { uploadImageToImageKit } from "./imageKit";
import { auth } from "@clerk/nextjs/server";
import { renameConversationAI } from "./renameConversationAI";
import { getDefaultModel } from "@/services/modelsService";

export async function POST(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();

    // Check daily message limit only for authenticated users
    if (userId) {
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
    }

    const { messages, conversation, trigger, hotelSlug } = await req.json();

    // Resolve hotel slug to ID for tools if provided
    let hotelId: number | undefined;
    if (hotelSlug) {
      const { getHotelBySlug } = await import("@/services/hotelService");
      const hotel = await getHotelBySlug(hotelSlug);
      if (hotel) {
        hotelId = hotel.id;
      }
    }

    const lastMessage = messages[messages.length - 1];
    for (const part of lastMessage.parts) {
      if (part.type === "file" && part.mediaType.startsWith("image/")) {
        part.url = await uploadImageToImageKit(part.url!);
      }
    }

    const modelMessages = await convertToModelMessages(messages);

    const defaultModel = await getDefaultModel();
    if (!defaultModel) {
      return new Response(
        JSON.stringify({
          error: "Service unavailable",
          message:
            "The chat service is temporarily unavailable. Please try again later.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const selectedmodel = defaultModel.model_id;

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

    // Variable to store token usage from streamText
    let streamUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    } | null = null;

    // Get configurable system prompt
    const systemPromptResult = await getSystemPrompt();
    if (!systemPromptResult) {
      return new Response(
        JSON.stringify({
          error: "Service unavailable",
          message:
            "The chat service is temporarily unavailable. Please try again later.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const systemPrompt = systemPromptResult;

    // Get tools with hotel ID for filtering
    const tools = await getTools(hotelId);

    const getStreamErrorMessage = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const normalized = message.toLowerCase();
      if (
        normalized.includes("insufficient funds") ||
        normalized.includes("insufficient_quota") ||
        normalized.includes("insufficient quota")
      ) {
        return "Insufficient funds. Please update your billing or try again later.";
      }
      if (normalized.includes("rate limit")) {
        return "Rate limit exceeded. Please try again later.";
      }
      if (normalized.includes("timeout")) {
        return "Request timed out. Please try again.";
      }
      return "An error occurred while generating the response.";
    };

    let streamErrorMessage: string | null = null;

    const response = streamText({
      messages: modelMessages,
      model: selectedmodel,
      tools: tools,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
      onError: (error) => {
        streamErrorMessage = getStreamErrorMessage(error);
        console.error("streamText error:", error);
      },
      onFinish: async ({ usage }) => {
        streamUsage = {
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          totalTokens: usage.totalTokens || 0,
        };
      },
    });

    // Handle background task errors without blocking
    backgroundTasks.then((results) => {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Background task ${index} failed:`, result.reason);
        }
      });
    });

    return response.toUIMessageStreamResponse({
      onError: (error) => {
        const message = streamErrorMessage ?? getStreamErrorMessage(error);
        console.error("UI message stream error:", error);
        return message;
      },
      onFinish: async ({ responseMessage }) => {
        try {
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

          // Record message usage with actual token count from AI response (only for authenticated users)
          if (userId) {
            const actualTokens = streamUsage?.totalTokens || 0;
            const usageResult = await recordUsage(userId, actualTokens);

            console.log(
              `User ${userId} - Messages: ${usageResult.usage.messages_sent}/${usageResult.usage.daily_message_limit}, Actual Tokens: ${usageResult.usage.tokens_used}`,
            );
          }
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
