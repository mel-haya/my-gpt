import { db } from "@/lib/db-config";
import { systemPrompts } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant with access to a knowledge base. 
When users ask questions, search the knowledge base for relevant information.
Always search before answering if the question might relate to uploaded documents.
Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`;

export async function getSystemPrompt(): Promise<string> {
  try {
    const result = await db
      .select({ prompt: systemPrompts.prompt })
      .from(systemPrompts)
      .where(eq(systemPrompts.default, true))
      .limit(1);

    return result[0]?.prompt || DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export async function updateSystemPrompt(prompt: string): Promise<void> {
  try {
    await db
      .update(systemPrompts)
      .set({
        prompt: prompt,
        updated_at: new Date(),
      })
      .where(eq(systemPrompts.default, true));
  } catch (error) {
    console.error("Error updating system prompt:", error);
    throw error;
  }
}
