"use server";

import {
  getSetting,
  getSystemPrompt,
  upsertSetting,
} from "@/services/settingsService";

const STAFF_PREFERRED_LANGUAGE_KEY = "staff_preferred_language";
const DEFAULT_LANGUAGE = "english";

export async function getSystemPromptAction(): Promise<string> {
  try {
    return await getSystemPrompt();
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return "You are a helpful assistant.";
  }
}

export async function getStaffPreferredLanguageAction(): Promise<string> {
  try {
    return await getSetting(STAFF_PREFERRED_LANGUAGE_KEY, DEFAULT_LANGUAGE);
  } catch (error) {
    console.error("Error fetching staff preferred language:", error);
    return DEFAULT_LANGUAGE;
  }
}

export async function updateStaffPreferredLanguageAction(
  language: string,
): Promise<void> {
  try {
    await upsertSetting(STAFF_PREFERRED_LANGUAGE_KEY, language);
  } catch (error) {
    console.error("Error updating staff preferred language:", error);
    throw error;
  }
}
