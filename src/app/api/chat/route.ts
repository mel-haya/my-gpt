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
      stopWhen: stepCountIs(2),
    });
    return response.toUIMessageStreamResponse();
  } catch (error) {
    return new Response("Error processing request", { status: 500 });
  }
}
