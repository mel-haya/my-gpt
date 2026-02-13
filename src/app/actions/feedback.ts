"use server";

import { db } from "@/lib/db-config";
import {
  feedback,
  messages,
  hotels,
  hotelStaff,
  conversations,
} from "@/lib/db-schema";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { getMessageByIndex } from "@/services/messagesService";

export async function submitFeedbackAction({
  messageIndex,
  feedback: feedbackType,
  conversationId,
}: {
  messageIndex: number;
  feedback: "positive" | "negative";
  conversationId?: number;
}) {
  try {
    const user = await currentUser();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    if (typeof messageIndex !== "number" || messageIndex < 0) {
      throw new Error("Invalid message index");
    }

    const message = await getMessageByIndex(conversationId, messageIndex);
    if (!message) {
      throw new Error("Message not found");
    }

    await db.insert(feedback).values({
      message_id: message.id,
      feedback: feedbackType,
      conversation_id: conversationId,
      submitted_by: user?.id ?? "anonymous",
    });

    return { success: true };
  } catch (error) {
    console.error("Error in submitFeedbackAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit feedback",
    };
  }
}

export async function getFeedbacksAction({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const offset = (page - 1) * limit;

    // Check if user is associated with a hotel
    const staffRecords = await db
      .select({
        hotel_id: hotelStaff.hotel_id,
      })
      .from(hotelStaff)
      .where(eq(hotelStaff.user_id, user.id))
      .limit(1);

    const staffRecord = staffRecords.length > 0 ? staffRecords[0] : null;

    let query = db
      .select({
        id: feedback.id,
        feedback: feedback.feedback,
        submitted_at: feedback.submitted_at,
        conversation_id: feedback.conversation_id,
        message_id: feedback.message_id,
        message_content: messages.text_content,
        hotel_name: hotels.name,
      })
      .from(feedback)
      .leftJoin(messages, eq(feedback.message_id, messages.id))
      .leftJoin(conversations, eq(feedback.conversation_id, conversations.id))
      .leftJoin(hotels, eq(conversations.hotel_id, hotels.id))
      .orderBy(desc(feedback.submitted_at))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    // If user is hotel staff/owner, filter by their hotel_id
    if (staffRecord) {
      query = query.where(eq(conversations.hotel_id, staffRecord.hotel_id));
    }

    const feedbackEntries = await query;

    return { success: true, data: feedbackEntries };
  } catch (error) {
    console.error("Error in getFeedbacksAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch feedbacks",
    };
  }
}

export async function getFeedbackStatsAction() {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user is associated with a hotel
    const staffRecords = await db
      .select({
        hotel_id: hotelStaff.hotel_id,
      })
      .from(hotelStaff)
      .where(eq(hotelStaff.user_id, user.id))
      .limit(1);

    const staffRecord = staffRecords.length > 0 ? staffRecords[0] : null;

    let query = db
      .select({
        feedback: feedback.feedback,
      })
      .from(feedback)
      .leftJoin(conversations, eq(feedback.conversation_id, conversations.id))
      .$dynamic();

    if (staffRecord) {
      query = query.where(eq(conversations.hotel_id, staffRecord.hotel_id));
    }

    const allFeedback = await query;

    const total = allFeedback.length;
    const positive = allFeedback.filter(
      (f) => f.feedback === "positive",
    ).length;
    const negative = total - positive;
    const satisfactionRate = total > 0 ? (positive / total) * 100 : 0;

    return {
      success: true,
      data: {
        total,
        positive,
        negative,
        satisfactionRate: Math.round(satisfactionRate * 10) / 10, // Round to 1 decimal place
      },
    };
  } catch (error) {
    console.error("Error in getFeedbackStatsAction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch feedback stats",
    };
  }
}

export async function deleteFeedbackAction(id: number) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    await db.delete(feedback).where(eq(feedback.id, id));

    return { success: true };
  } catch (error) {
    console.error("Error in deleteFeedbackAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete feedback",
    };
  }
}
