import { db } from "@/lib/db-config";
import { eq, asc, desc } from "drizzle-orm";
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
    text_content: message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" "),
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

export async function getLatestMessageByConversationId(
  conversationId: number
): Promise<SelectMessage | null> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(desc(messages.id))
    .limit(1);
  return result[0] || null;
}

export async function updateMessageTextContent(
  messageId: number,
  textContent: string,
  parts: any[]
): Promise<SelectMessage> {
  const result = await db
    .update(messages)
    .set({ 
      text_content: textContent,
      parts: parts
    })
    .where(eq(messages.id, messageId))
    .returning();
  return result[0];
}


