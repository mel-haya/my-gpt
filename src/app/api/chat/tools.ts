import { tool, rerank } from "ai";
import { z } from "zod";
import { searchDocuments } from "@/lib/search";
import { getActivities } from "@/services/activitiesService";
import { cohere } from "@ai-sdk/cohere";
import { createStaffRequest } from "@/services/staffRequestsService";

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
        const results = (await getActivities("", "", 100)).activities;
        const input = results.map(
          (activity) =>
            `activity name: ${activity.name}, activity description: ${activity.description}, activity category: ${activity.category}, activity location: ${activity.location}`,
        );
        let { ranking } = await rerank({
          model: cohere.reranking(process.env.RERANKING_MODEL || "rerank-v3.5"),
          documents: input,
          query,
          topN: 5,
        });
        ranking = ranking.filter((a) => {
          return a.score > 0.1;
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
  createStaffRequest: tool({
    description:
      "Creates a staff request for guest services (room service, housekeeping, maintenance, etc.) or issues.",
    inputSchema: z.object({
      title: z.string().describe("Brief title of the request"),
      description: z.string().describe("Detailed description of the request"),
      category: z.enum([
        "reservation",
        "room_issue",
        "room_service",
        "housekeeping",
        "maintenance",
        "concierge",
        "other",
      ]),
      urgency: z
        .enum(["low", "medium", "high", "critical"])
        .default("medium")
        .describe("Urgency level of the request"),
      room_number: z
        .number()
        .optional()
        .describe(
          "Guest's room number if applicable (can be null for general requests)",
        ),
      userMessage: z
        .string()
        .describe(
          "A short, generic confirmation message like 'Your request has been submitted to the staff.' - Do NOT include specific details (room number, request type, etc.). MUST be in the same language as the conversation.",
        ),
    }),
    execute: async (input) => {
      try {
        const result = await createStaffRequest({
          title: input.title,
          description: input.description,
          category: input.category,
          urgency: input.urgency,
          room_number: input.room_number,
          status: "pending",
        });
        return {
          success: true,
          message: `Staff request created successfully. ID: ${result.id}`,
          request: result,
          userMessage: input.userMessage,
        };
      } catch (error) {
        console.error("Error creating staff request:", error);
        return {
          success: false,
          message: "Failed to create staff request.",
        };
      }
    },
  }),
};

// Test tools with mocked createStaffRequest (doesn't create actual DB entries)
export const testTools = {
  ...tools,
  createStaffRequest: tool({
    description:
      "Creates a staff request for guest services (room service, housekeeping, maintenance, etc.) or issues.",
    inputSchema: z.object({
      title: z.string().describe("Brief title of the request"),
      description: z.string().describe("Detailed description of the request"),
      category: z.enum([
        "reservation",
        "room_issue",
        "room_service",
        "housekeeping",
        "maintenance",
        "concierge",
        "other",
      ]),
      urgency: z
        .enum(["low", "medium", "high", "critical"])
        .default("medium")
        .describe("Urgency level of the request"),
      room_number: z
        .number()
        .optional()
        .describe(
          "Guest's room number if applicable (can be null for general requests)",
        ),
      userMessage: z
        .string()
        .describe(
          "A short, generic confirmation message like 'Your request has been submitted to the staff.' - Do NOT include specific details (room number, request type, etc.). MUST be in the same language as the conversation.",
        ),
    }),
    execute: async (input) => {
      // Return a mocked successful response without creating a database entry
      return {
        success: true,
        message: `Staff request created successfully. ID: test-${Date.now()}`,
        request: {
          id: `test-${Date.now()}`,
          title: input.title,
          description: input.description,
          category: input.category,
          urgency: input.urgency,
          room_number: input.room_number,
          status: "pending",
        },
        userMessage: input.userMessage,
      };
    },
  }),
};
