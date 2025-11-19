import { conversations, InsertConversation, SelectConversation } from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, asc } from "drizzle-orm";

export async function addConversation(
  userId: number
): Promise<SelectConversation> {
  const insertConversation: InsertConversation = {
    user_id: userId,
  };
  const result = await db.insert(conversations).values(insertConversation).returning();
  return result[0];
}

export async function getConversationsByUserId(
  userId: number
): Promise<SelectConversation[]> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(asc(conversations.id));
  return result;
}