import {
  streamText,
  convertToModelMessages,
  UIMessage,
  tool,
  stepCountIs,
  experimental_generateImage as generateImage,
  InferUITools,
  UIDataTypes,
} from "ai";
import { openai } from "./models";
import { z } from "zod";

const tools = {
  generateImage: tool({
    name: "generateImage",
    description: "Generates an image based on a text prompt.",
    inputSchema: z.object({
      prompt: z.string().describe("The text prompt to generate the image from."),
    }),
    execute: async ({ prompt }) => {
      const { image } = await generateImage({
        model: openai.imageModel("dall-e-3"),
        prompt: prompt,
        size: "1024x1024",
        providerOptions: {
          openai: { style: "vivid", quality: "hd" },
        },
      });
      return image.base64;
    },
    toModelOutput: () => ({ type: "content", value: [
      { type: "text", text: "Image generated successfully." },
    ] }),
  }),
  
};

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
