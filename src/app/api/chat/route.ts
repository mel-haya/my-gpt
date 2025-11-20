import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "./models";
import { tools } from "./tools";
import { ChatMessage } from "@/types/chatMessage";
import { saveMessage } from "@/services/messagesService";

export async function POST(req: Request) {
  try {
    const {
      messages,
      conversationId,
    }: { messages: ChatMessage[], conversationId: number } =
    await req.json();
    await saveMessage(messages[messages.length - 1], conversationId);
    const modelMessages = convertToModelMessages(messages);
    const response = streamText({
      messages: modelMessages,
      model: openai.languageModel("fast"),
      tools: tools,
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          when requested to generate code, privide the code in the format \`\`\`<programming language> <code>\`\`\`.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.
          don't answer any question that cannot be answered using the knowledge base.`,
      stopWhen: stepCountIs(2),
    });

    return response.toUIMessageStreamResponse({
      onFinish: ({ responseMessage }) => {
        saveMessage(responseMessage as ChatMessage, conversationId);
      },
    });
  } catch (error) {
    return new Response("Error processing request", {
      status: 500,
      statusText: String(error),
    });
  }
}
