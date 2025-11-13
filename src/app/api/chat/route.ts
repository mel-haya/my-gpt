import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  InferUITools,
  UIDataTypes,
} from "ai";
import { openai } from "./models";
import { tools } from "./tools";


export type Tools =  InferUITools<typeof tools>;
export type chatMessage = UIMessage<never, UIDataTypes, Tools>;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: chatMessage[] } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    const response = streamText({
      messages: modelMessages,
      model: openai.languageModel("fast"),
      tools: tools,
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`,
      stopWhen: stepCountIs(2),
    });
    return response.toUIMessageStreamResponse();
  } catch (error) {
    return new Response("Error processing request", { status: 500 });
  }
}
