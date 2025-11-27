import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "./models";
import { tools, webSearchTool } from "./tools";
import { ChatMessage } from "@/types/chatMessage";
import { saveMessage } from "@/services/messagesService";
import { changeConversationTitle } from "@/services/conversationsService";
import { TextUIPart } from "ai";
import { Tools } from "@/types/Tools";
import { uploadImageToImageKit } from "./imageKit";


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
    await saveMessage(lastMessage, conversation.id);
    if (!conversation.title) {
      const part: TextUIPart = messages[0].parts.find(
        (p:TextUIPart) => p.type === "text"
      );
      await changeConversationTitle(
        conversation.user_id,
        conversation.id,
        (part as TextUIPart).text
      );
    }
    const toolsToUse: Tools = {...tools};
    
    const modelMessages = convertToModelMessages(messages);
    if (webSearch)
      toolsToUse.webSearch = webSearchTool;
    const response = streamText({
      messages: modelMessages,
      model: openai.languageModel(model === "GPT-5-nano" ? "fast" : "smart"),
      tools: toolsToUse,
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`,
      stopWhen: stepCountIs(2),
    });

    return response.toUIMessageStreamResponse({
      onFinish: ({ responseMessage }) => {
        saveMessage(responseMessage as ChatMessage, conversation.id);
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
