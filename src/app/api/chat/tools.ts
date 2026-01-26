import { tool, rerank  } from "ai";
import { z } from "zod";
import { openai as originalOpenAI } from "@ai-sdk/openai";
import { searchDocuments } from "@/lib/search";
import {
  getActivities,
} from "@/services/activitiesService";
import { cohere } from "@ai-sdk/cohere";

const searchKnowledgeBaseInputSchema = z.object({
  query: z
    .string()
    .describe("The search query to look for in the knowledge base."),
});

const searchKnowledgeBaseOutputSchema = z.object({
  success: z.boolean().describe("Whether the search was successful"),
  message: z.string().describe("Status message"),
  results: z
    .array(
      z.object({
        id: z.number().describe("Document ID"),
        content: z.string().describe("Document content"),
        similarity: z.number().describe("Similarity score"),
      }),
    )
    .optional()
    .describe("Array of search results with similarity scores"),
});

export type SearchKnowledgeBaseResult = z.infer<
  typeof searchKnowledgeBaseOutputSchema
>;

export const tools = {
  searchKnowledgeBase: tool({
    description:
      "Searches the knowledge base for relevant information based on a query.",
    inputSchema: searchKnowledgeBaseInputSchema,
    execute: async ({ query }) => {
      try {
        const response = await searchDocuments(query, 5, 0);
        if (response.length === 0) {
          console.log("No relevant documents found.");
          return {
            success: false,
            message: "No relevant information found in the knowledge base.",
            results: [],
          };
        }
        return {
          success: true,
          message: `Found ${response.length} relevant documents in the knowledge base.`,
          results: response.map((doc) => ({
            id: doc.id,
            content: doc.content,
            similarity: Number(doc.similarity.toFixed(3)),
          })),
        };
      } catch (error) {
        console.error("Error searching knowledge base:", error);
        return {
          success: false,
          message: "An error occurred while searching the knowledge base.",
          results: [],
        };
      }
    },
  }),
  suggestActivities: tool({
    description:
      "Suggests hotel activities (restaurants, tours, wellness, etc.) based on a search query or guest preferences.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query for activities, e.g., 'romantic dinner' or 'outdoor hiking'",
        ),
    }),
    execute: async ({ query }) => {
      try {
        // const results = await searchActivitiesForSuggestion(query);
        const results = (await getActivities("", "", 100)).activities;
        const input = results.map(
          (activity) =>
            `activity name: ${activity.name}, activity description: ${activity.description}, activity category: ${activity.category}, activity location: ${activity.location}`,
        )
        const { ranking } = await rerank({
          model: cohere.reranking(process.env.RERANKING_MODEL || "rerank-v3.5"),
          documents:input,
          query,
          topN: 2,
        });

        const output = ranking.map((a) => ({
          ...results[a.originalIndex],
          image: results[a.originalIndex].image_url,
        }));
        return {
          success: true,
          activities: output,
        };
      } catch (error) {
        console.error("Error suggesting activities:", error);
        return { success: false, activities: [] };
      }
    },
  }),
};

export const webSearchTool = originalOpenAI.tools.webSearch({
  searchContextSize: "medium",
});
