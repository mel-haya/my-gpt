import { tool, experimental_generateImage as generateImage } from "ai";
import { openai } from "./models";
import { z } from "zod";
import { openai as originalOpenAI } from "@ai-sdk/openai";
import { uploadImageToImageKit } from "./imageKit";
import { searchDocuments } from "@/lib/search";

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
      const imageUrl = await uploadImageToImageKit(image.base64);
      return imageUrl;
    },
  }),
  changeBackground: tool({
    name: "changeBackground",
    description:
      "Changes the background of an image to an AI generated background.",
    inputSchema: z.object({
      imageUrl: z
        .string()
        .describe("The URL of the image to change the background of."),
      background: z
        .string()
        .describe(
          "The desired background color (e.g., 'modern office', 'beach sunset', 'forest')."
        ),
    }),
    outputSchema: z
      .string()
      .describe("The URL of the image with the changed background."),
  }),
  removeBackground: tool({
    name: "removeBackground",
    description: "Removes the background from an image.",
    inputSchema: z.object({
      imageUrl: z
        .string()
        .describe("The URL of the image to remove the background of."),
    }),
    outputSchema: z
      .string()
      .describe("The URL of the image with the background removed."),
  }),
  searchKnowledgeBase: tool({
    name: "searchKnowledgeBase",
    description:
      "Searches the knowledge base for relevant information based on a query.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to look for in the knowledge base."),
    }),
    outputSchema: z.object({
      success: z.boolean().describe("Whether the search was successful"),
      message: z.string().describe("Status message"),
      results: z.array(z.object({
        id: z.number().describe("Document ID"),
        content: z.string().describe("Document content"),
        similarity: z.number().describe("Similarity score")
      })).optional().describe("Array of search results with similarity scores")
    }),
    execute: async ({ query }) => {
      try {
        const response = await searchDocuments(query, 5, 0);
        if (response.length === 0) {
          console.log("No relevant documents found.");
          return {
            success: false,
            message: "No relevant information found in the knowledge base.",
            results: []
          };
        }
        return {
          success: true,
          message: `Found ${response.length} relevant documents in the knowledge base.`,
          results: response.map(doc => ({
            id: doc.id,
            content: doc.content,
            similarity: Number(doc.similarity.toFixed(3))
          }))
        };
      } catch (error) {
        console.error("Error searching knowledge base:", error);
        return {
          success: false,
          message: "An error occurred while searching the knowledge base.",
          results: []
        };
      }
    },
  })
};

export const webSearchTool = originalOpenAI.tools.webSearch({
  searchContextSize: "medium",
});
