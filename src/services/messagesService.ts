import { db } from "@/lib/db-config";
import { eq, asc, desc, and } from "drizzle-orm";
import { messages, InsertMessage, SelectMessage } from "@/lib/db-schema";
import { ChatMessage } from "@/types/chatMessage";

export async function saveMessage(
  message: ChatMessage,
  conversationId: number,
  modelUsed?: string,
): Promise<SelectMessage> {
  const insertMessage: InsertMessage = {
    conversation_id: conversationId,
    role: message.role,
    parts: message.parts,
    text_content: message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" "),
    model_used: modelUsed,
    llm_key: message.id, // Store key provided by LLM
  };
  const result = await db.insert(messages).values(insertMessage).returning();
  return result[0];
}

export async function getMessagesByConversationId(
  conversationId: number,
): Promise<SelectMessage[]> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.id));
  return result;
}

export async function getMessageByLlmKey(
  conversationId: number,
  llmKey: string,
): Promise<SelectMessage | null> {
  const result = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversation_id, conversationId),
        eq(messages.llm_key, llmKey),
      ),
    )
    .limit(1);
  return result[0] || null;
}

export async function getLatestMessageByConversationId(
  conversationId: number,
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
  parts: ChatMessage["parts"],
): Promise<SelectMessage> {
  const result = await db
    .update(messages)
    .set({
      text_content: textContent,
      parts: parts,
    })
    .where(eq(messages.id, messageId))
    .returning();
  return result[0];
}
