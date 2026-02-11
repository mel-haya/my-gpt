import { tool, rerank } from "ai";
import { z } from "zod";
import { searchDocuments } from "@/lib/search";
import { getActivities } from "@/services/activitiesService";
import { cohere } from "@ai-sdk/cohere";
import { createStaffRequest } from "@/services/staffRequestsService";
import { getSetting } from "@/services/settingsService";
import {
  getHotelById,
  getHotelPreferredLanguage,
} from "@/services/hotelService";

const searchKnowledgeBaseInputSchema = z.object({
  query: z
    .string()
    .describe("The search query to look for in the knowledge base."),
  userLanguage: z
    .string()
    .describe(
      "The required response language for the conversation (e.g., English, French, Arabic). If two or more languages are used, choose the most frequent language.",
    ),
});

const searchKnowledgeBaseOutputSchema = z.object({
  success: z.boolean().describe("Whether the search was successful"),
  message: z.string().describe("Status message"),
  system: z.string().optional().describe("System message for the AI"),
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

function searchKnowledgeBaseTool(hotelId?: number, testOnly?: boolean) {
  return tool({
    description:
      "Searches the knowledge base for relevant information based on a query.",
    inputSchema: searchKnowledgeBaseInputSchema,
    execute: async ({ query, userLanguage }) => {
      const systemMessage = `Always respond in ${userLanguage}. Do not switch to the document language. If sources are in another language, translate them and keep the reply in ${userLanguage}.`;
      try {
        // Resolve hotelId to hotelName for search filtering
        let hotelName: string | undefined;
        if (hotelId) {
          const hotel = await getHotelById(hotelId);
          hotelName = hotel?.name;
        }
        const response = await searchDocuments(
          query,
          5,
          0,
          hotelName,
          testOnly,
        );
        return {
          success: response.length > 0,
          message: `Found ${response.length} relevant documents in the knowledge base.`,
          results: response.map((doc) => ({
            id: doc.id,
            content: doc.content,
            similarity: Number(doc.similarity.toFixed(3)),
          })),
          system: systemMessage,
        };
      } catch (error) {
        console.error("Error searching knowledge base:", error);
        return {
          success: false,
          message: "An error occurred while searching the knowledge base.",
          results: [],
          system: systemMessage,
        };
      }
    },
  });
}

const suggestActivitiesTool = tool({
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
});

function createStaffRequestTool(
  staffLanguage: string,
  adminLanguage: string,
  hotelId?: number,
) {
  return tool({
    description: `Creates a staff request for guest services (room service, housekeeping, maintenance, etc.) or issues. IMPORTANT: The title and description MUST be written in ${staffLanguage.toUpperCase()}. Additionally, you must provide an 'admin_title' and 'admin_description' which are translations of the title and description into ${adminLanguage.toUpperCase()}. Only the userMessage should match the conversation language.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe(`Brief title of the request (MUST be in ${staffLanguage})`),
      description: z
        .string()
        .describe(
          `Detailed description of the request (MUST be in ${staffLanguage})`,
        ),
      admin_title: z
        .string()
        .describe(
          `Brief title of the request translated into ${adminLanguage} for admin review`,
        ),
      admin_description: z
        .string()
        .describe(
          `Detailed description of the request translated into ${adminLanguage} for admin review`,
        ),
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
      guest_contact: z
        .string()
        .optional()
        .describe(
          "Guest's contact information (phone number or email) if provided. Capture this when the guest shares their contact details.",
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
          admin_title: input.admin_title,
          admin_description: input.admin_description,
          category: input.category,
          urgency: input.urgency,
          room_number: input.room_number,
          guest_contact: input.guest_contact,
          status: "pending",
          hotel_id: hotelId,
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
  });
}

function createMockedStaffRequestTool(staffLanguage: string) {
  return tool({
    description: `Creates a staff request for guest services (room service, housekeeping, maintenance, etc.) or issues. IMPORTANT: The title and description MUST be written in ${staffLanguage.toUpperCase()}. Only the userMessage should match the conversation language.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe(`Brief title of the request (MUST be in ${staffLanguage})`),
      description: z
        .string()
        .describe(
          `Detailed description of the request (MUST be in ${staffLanguage})`,
        ),
      admin_title: z
        .string()
        .optional()
        .describe(`(Optional for test) Admin title`),
      admin_description: z
        .string()
        .optional()
        .describe(`(Optional for test) Admin description`),
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
      guest_contact: z
        .string()
        .optional()
        .describe(
          "Guest's contact information (phone number or email) if provided. Capture this when the guest shares their contact details.",
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
          guest_contact: input.guest_contact,
          status: "pending",
        },
        userMessage: input.userMessage,
      };
    },
  });
}

export async function getTools(hotelId?: number) {
  const hotelLang = hotelId ? await getHotelPreferredLanguage(hotelId) : null;
  const staffLanguage =
    hotelLang ?? (await getSetting("staff_preferred_language"));
  const adminLanguage =
    (await getSetting("staff_preferred_language")) || "English";

  return {
    searchKnowledgeBase: searchKnowledgeBaseTool(hotelId),
    suggestActivities: suggestActivitiesTool,
    createStaffRequest: createStaffRequestTool(
      staffLanguage,
      adminLanguage,
      hotelId,
    ),
  };
}

export async function getTestTools(hotelId?: number) {
  const hotelLang = hotelId ? await getHotelPreferredLanguage(hotelId) : null;
  const staffLanguage =
    hotelLang ?? (await getSetting("staff_preferred_language"));

  return {
    searchKnowledgeBase: searchKnowledgeBaseTool(hotelId, true),
    suggestActivities: suggestActivitiesTool,
    createStaffRequest: createMockedStaffRequestTool(staffLanguage),
  };
}
