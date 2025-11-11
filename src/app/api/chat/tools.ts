import { tool, experimental_generateImage as generateImage } from "ai";
import { openai } from "./models";
import { z } from "zod";
import { openai as originalOpenAI } from "@ai-sdk/openai";

export const tools = {
  generateImage: tool({
    name: "generateImage",
    description: "Generates an image based on a text prompt.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("The text prompt to generate the image from."),
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
    toModelOutput: () => ({
      type: "content",
      value: [{ type: "text", text: "Image generated successfully." }],
    }),
  }),
  web_search: originalOpenAI.tools.webSearch({
    searchContextSize: 'medium',
  }),
};
