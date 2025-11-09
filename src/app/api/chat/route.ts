import { streamText, convertToModelMessages, UIMessage } from "ai";
import { openai } from "./models";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    const response = streamText({
      messages: modelMessages,
      model: openai.languageModel("fast"),
    });
    return response.toUIMessageStreamResponse();
  } catch (error) { 
    return new Response("Error processing request", { status: 500 });
  }
}
