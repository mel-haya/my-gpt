import { db } from "@/lib/db-config";
import { settings } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant with access to a knowledge base. 
When users ask questions, search the knowledge base for relevant information.
Always search before answering if the question might relate to uploaded documents.
Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`;

export class SettingsService {
  static async getSystemPrompt(): Promise<string> {
    try {
      const result = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "system_prompt"))
        .limit(1);

      return result[0]?.value || DEFAULT_SYSTEM_PROMPT;
    } catch (error) {
      console.error("Error fetching system prompt:", error);
      return DEFAULT_SYSTEM_PROMPT;
    }
  }

  static async updateSystemPrompt(prompt: string): Promise<void> {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "system_prompt"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ 
          value: prompt,
          updated_at: new Date()
        })
        .where(eq(settings.key, "system_prompt"));
    } else {
      await db.insert(settings).values({
        key: "system_prompt",
        value: prompt,
      });
    }
  }
}