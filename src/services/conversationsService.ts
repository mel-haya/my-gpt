import {
  conversations,
  InsertConversation,
  messages,
  SelectConversation,
} from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, and, desc, ilike, or, isNull } from "drizzle-orm";

export async function addConversation(
  userId: string | null,
  hotelId?: number,
): Promise<SelectConversation> {
  const insertConversation: InsertConversation = {
    user_id: userId,
    hotel_id: hotelId,
  };
  const result = await db
    .insert(conversations)
    .values(insertConversation)
    .returning();
  return result[0];
}

export async function changeConversationTitle(
  userId: string | null,
  conversationId: number,
  title: string,
): Promise<number> {
  const userCondition = userId
    ? eq(conversations.user_id, userId)
    : isNull(conversations.user_id);
  const result = await db
    .update(conversations)
    .set({ title })
    .where(and(userCondition, eq(conversations.id, conversationId)));
  return result.rowCount;
}

export async function getConversationsByUserId(
  userId: string,
  searchQuery?: string,
): Promise<SelectConversation[]> {
  if (searchQuery) {
    // Search in both conversation titles and message content
    const conversationsWithMessages = await db
      .selectDistinct({
        id: conversations.id,
        user_id: conversations.user_id,
        title: conversations.title,
        hotel_id: conversations.hotel_id,
      })
      .from(conversations)
      .leftJoin(messages, eq(conversations.id, messages.conversation_id))
      .where(
        and(
          eq(conversations.user_id, userId),
          or(
            ilike(conversations.title, `%${searchQuery}%`),
            ilike(messages.text_content, `%${searchQuery}%`),
          ),
        ),
      )
      .orderBy(desc(conversations.id));

    return conversationsWithMessages;
  }

  // If no search query, return all conversations for the user
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(desc(conversations.id));
  return result;
}

export async function deleteConversationById(
  userId: string,
  conversationId: number,
) {
  await db.delete(messages).where(eq(messages.conversation_id, conversationId));
  const result = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.user_id, userId),
        eq(conversations.id, conversationId),
      ),
    );
  return result.rowCount;
}
