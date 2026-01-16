"use server";

import { db } from "@/lib/db-config";
import { feedback } from "@/lib/db-schema";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

export async function submitFeedbackAction({
  message,
  feedback: feedbackType,
  conversationId,
}: {
  message: string;
  feedback: "positive" | "negative";
  conversationId?: number;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    await db.insert(feedback).values({
      message,
      feedback: feedbackType,
      conversation_id: conversationId,
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

    const feedbackEntries = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.submitted_at))
      .limit(limit)
      .offset(offset);

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

    const allFeedback = await db.select().from(feedback);

    const total = allFeedback.length;
    const positive = allFeedback.filter(
      (f) => f.feedback === "positive"
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
