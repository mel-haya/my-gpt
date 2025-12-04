import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { tools, webSearchTool } from "./tools";
import { ChatMessage } from "@/types/chatMessage";
import { saveMessage } from "@/services/messagesService";
import { changeConversationTitle } from "@/services/conversationsService";
import { TokenUsageService } from "@/services/tokenUsageService";
import { TextUIPart } from "ai";
import { Tools } from "@/types/Tools";
import { uploadImageToImageKit } from "./imageKit";
import { auth } from "@clerk/nextjs/server";

const supportedModels = [
  "openai/gpt-5-nano",
  "google/gemini-2.5-flash",
  "anthropic/claude-haiku-4.5",
  "xai/grok-4-fast-non-reasoning"
];



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
    const hasReachedLimit = await TokenUsageService.hasReachedDailyLimit(userId);

    if (hasReachedLimit) {
      const remainingMessages = await TokenUsageService.getRemainingMessages(userId);
      return new Response(
        JSON.stringify({
          error: "Daily message limit reached",
          message: "You have reached your daily limit of 10 messages. Please try again tomorrow.",
          remainingMessages,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const {
      messages,
      conversation,
      model,
      webSearch,
    } = await req.json();
    
    const lastMessage = messages[messages.length - 1];
    for (const part of lastMessage.parts) {
      if (part.type === "file" && part.mediaType.startsWith("image/")) {
        part.url = await uploadImageToImageKit(part.url!);
      }
    }
    
    // Start background operations but don't wait
    const backgroundTasks = Promise.allSettled([
      saveMessage(lastMessage, conversation.id),
      !conversation.title && changeConversationTitle(
        conversation.user_id,
        conversation.id,
        (messages[0].parts.find((p: TextUIPart) => p.type === "text") as TextUIPart).text
      )
    ].filter(Boolean));
    
    const toolsToUse: Tools = {...tools};
    
    // Check if model is in supported models and set selectedmodel
    const selectedmodel = supportedModels.includes(model) ? model : 'openai/gpt-5-nano';
    
    const modelMessages = convertToModelMessages(messages);
    if (webSearch)
      toolsToUse.webSearch = webSearchTool;
    
    // Variable to store token usage from streamText
    let streamUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | null = null;
    
    const response = streamText({
      messages: modelMessages,
      model: selectedmodel,
      tools: toolsToUse,
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`,
      stopWhen: stepCountIs(2),
      onFinish: async ({usage}) => {
        streamUsage = {
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          totalTokens: usage.totalTokens || 0,
        };
        console.log(`AI Response Usage - Prompt Tokens: ${usage.inputTokens}, Completion Tokens: ${usage.outputTokens}, Total Tokens: ${usage.totalTokens}`);
      }
    });

    return response.toUIMessageStreamResponse({
      onFinish: async ({ responseMessage }) => {
        try {
          // Wait for background tasks to complete
          const results = await backgroundTasks;
          
          // Log any failures but don't fail the response
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Background task ${index} failed:`, result.reason);
            }
          });

          // Save AI response
          await saveMessage(responseMessage as ChatMessage, conversation.id);

          // Record message usage with actual token count from AI response
          const actualTokens = streamUsage?.totalTokens || 0;
          const usageResult = await TokenUsageService.recordUsage(userId, actualTokens);
          
          console.log(`User ${userId} - Messages: ${usageResult.usage.messages_sent}/${usageResult.usage.daily_message_limit}, Actual Tokens: ${usageResult.usage.tokens_used}`);
        } catch (error) {
          console.error('Error in onFinish:', error);
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
