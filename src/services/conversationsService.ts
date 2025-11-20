import {
  conversations,
  InsertConversation,
  messages,
  SelectConversation,
} from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, and, desc } from "drizzle-orm";

export async function addConversation(
  userId: string
): Promise<SelectConversation> {
  const insertConversation: InsertConversation = {
    user_id: userId,
  };
  const result = await db
    .insert(conversations)
    .values(insertConversation)
    .returning();
  return result[0];
}

export async function changeConversationTitle(
  userId: string,
  conversationId: number,
  title: string
): Promise<number> {
  const result = await db
    .update(conversations)
    .set({ title })
    .where(
      and(
        eq(conversations.user_id, userId),
        eq(conversations.id, conversationId)
      )
    );
  return result.rowCount;
}

export async function getConversationsByUserId(
  userId: string
): Promise<SelectConversation[]> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(desc(conversations.id));
  return result;
}

export async function deleteConversationById(
  userId: string,
  conversationId: number
) {
  await db.delete(messages).where(eq(messages.conversation_id, conversationId));
  const result = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.user_id, userId),
        eq(conversations.id, conversationId)
      )
    );
  return result.rowCount;
}
