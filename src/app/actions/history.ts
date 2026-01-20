"use server";

import { db } from "@/lib/db-config";
import { conversations, messages, users } from "@/lib/db-schema";
import { eq, desc, ilike, or, sql, lt, and } from "drizzle-orm";
import { PaginatedConversationsResult } from "@/types/history";

export async function getAllConversationsAction(
  searchQuery?: string,
  limit: number = 20,
  cursor?: number,
): Promise<{ success: true; data: PaginatedConversationsResult } | { success: false; error: string }> {
  try {
    const query = db
      .select({
        id: conversations.id,
        title: conversations.title,
        userId: conversations.user_id,
        username: users.username,
        email: users.email,
        messageCount: sql<number>`count(${messages.id})`,
        lastMessageAt: sql<string>`max(${messages.id})`,
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.user_id, users.id))
      .leftJoin(messages, eq(conversations.id, messages.conversation_id))
      .groupBy(conversations.id, users.id)
      .orderBy(desc(conversations.id))
      .limit(limit + 1);

    const conditions = [];

    if (searchQuery) {
      conditions.push(
        or(
          ilike(conversations.title, `%${searchQuery}%`),
          ilike(users.username, `%${searchQuery}%`),
          ilike(users.email, `%${searchQuery}%`),
        ),
      );
    }

    if (cursor) {
      conditions.push(lt(conversations.id, cursor));
    }

    if (conditions.length > 0) {
      query.where(and(...(conditions as any)));
    }

    const result = await query;

    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      success: true,
      data: {
        data: data as any,
        hasMore,
        nextCursor,
      }
    };
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
