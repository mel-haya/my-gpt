"use server";

import { db } from "@/lib/db-config";
import { conversations, messages, users } from "@/lib/db-schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";

export async function getAllConversationsAction(searchQuery?: string) {
  try {
    const query = db
      .select({
        id: conversations.id,
        title: conversations.title,
        userId: conversations.user_id,
        username: users.username,
        email: users.email,
        messageCount: sql<number>`count(${messages.id})`,
        lastMessageAt: sql<string>`max(${messages.id})`, // Using ID as proxy for time as we don't have created_at in messages
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.user_id, users.id))
      .leftJoin(messages, eq(conversations.id, messages.conversation_id))
      .groupBy(conversations.id, users.id)
      .orderBy(desc(conversations.id));

    if (searchQuery) {
      query.where(
        or(
          ilike(conversations.title, `%${searchQuery}%`),
          ilike(users.username, `%${searchQuery}%`),
          ilike(users.email, `%${searchQuery}%`),
        ),
      );
    }

    const result = await query;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { success: false, error: "Failed to fetch conversations" };
  }
}

export async function getConversationMessagesAction(conversationId: number) {
  try {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(messages.id);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { success: false, error: "Failed to fetch messages" };
  }
}
