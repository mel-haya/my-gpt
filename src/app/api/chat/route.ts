import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { tools, webSearchTool } from "./tools";
import { ChatMessage } from "@/types/chatMessage";
import { saveMessage } from "@/services/messagesService";
import { changeConversationTitle } from "@/services/conversationsService";
import { TextUIPart } from "ai";
import { Tools } from "@/types/Tools";
import { uploadImageToImageKit } from "./imageKit";

const supportedModels = [
  "openai/gpt-5-nano",
  "google/gemini-2.5-flash",
  "anthropic/claude-haiku-4.5",
  "xai/grok-4-fast-non-reasoning"
];



export async function POST(req: Request) {
  try {
    const {
      messages,
      conversation,
      model,
      webSearch,
    } =
      await req.json();
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
    const response = streamText({
      messages: modelMessages,
      model: selectedmodel,
      tools: toolsToUse,
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`,
      stopWhen: stepCountIs(2),
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
