import { db } from "@/lib/db-config";
import { settings, systemPrompts } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

export async function getSetting(
  key: string,
  defaultValue: string,
): Promise<string> {
  try {
    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return result[0]?.value ?? defaultValue;
  } catch (error) {
    console.error(`Error fetching setting '${key}':`, error);
    return defaultValue;
  }
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  try {
    // Try to update first
    const updateResult = await db
      .update(settings)
      .set({
        value: value,
        updated_at: new Date(),
      })
      .where(eq(settings.key, key));

    // If no rows were updated, insert a new one
    if (updateResult.rowCount === 0) {
      await db.insert(settings).values({
        key: key,
        value: value,
      });
    }
  } catch (error) {
    console.error(`Error upserting setting '${key}':`, error);
    throw error;
  }
}

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
