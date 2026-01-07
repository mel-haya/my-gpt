"use server";

import { getSystemPrompt } from "@/services/settingsService";

export async function getSystemPromptAction(): Promise<string> {
  try {
    return await getSystemPrompt();
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return "You are a helpful assistant.";
  }
}