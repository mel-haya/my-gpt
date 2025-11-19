import { conversations, InsertConversation, SelectConversation } from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, asc, and } from "drizzle-orm";

export async function addConversation(
  userId: string
): Promise<SelectConversation> {
  const insertConversation: InsertConversation = {
    user_id: userId,
  };
  const result = await db.insert(conversations).values(insertConversation).returning();
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
    .where(and(eq(conversations.user_id, userId), eq(conversations.id, conversationId)));
  return result.rowCount
}

export async function getConversationsByUserId(
  userId: string
): Promise<SelectConversation[]> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(asc(conversations.id));
  return result;
}