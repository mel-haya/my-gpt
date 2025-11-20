import { db } from "@/lib/db-config";
import { eq, asc } from "drizzle-orm";
import { messages, InsertMessage, SelectMessage } from "@/lib/db-schema";
import { ChatMessage } from "@/types/chatMessage";

export async function saveMessage(
  message: ChatMessage,
  conversationId: number
): Promise<SelectMessage> {
  const insertMessage: InsertMessage = {
    conversation_id: conversationId,
    role: message.role,
    parts: message.parts,
  };
  const result = await db.insert(messages).values(insertMessage).returning();
  return result[0];
}

export async function getMessagesByConversationId(
  conversationId: number
): Promise<SelectMessage[]> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.id));
  return result;
}


