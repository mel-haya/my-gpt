"use server";

import { db } from "@/lib/db-config";
import { feedback } from "@/lib/db-schema";
import { currentUser } from "@clerk/nextjs/server";

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
