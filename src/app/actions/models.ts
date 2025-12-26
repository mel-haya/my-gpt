"use server";

import { auth } from "@clerk/nextjs/server";
import { checkUserSubscription } from "@/lib/subscriptionUtils";

export interface ModelOption {
  id: string;
  name: string;
  premium?: boolean;
}

export async function getAvailableModels(): Promise<ModelOption[]> {
  try {
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      // Return basic models for unauthenticated users
      return [
        { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      ];
    }

    // Check if user has an active subscription
    const isSubscribed = await checkUserSubscription(userId);

    // Basic models available to all authenticated users
    const basicModels: ModelOption[] = [
      // { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
      { id: "google/gemini-3-flash", name: "Gemini 3 Flash" },
      { id: "anthropic/claude-haiku-3.5", name: "Claude Haiku 3.5" },
    ];

    // Premium models for subscribed users
    const premiumModels: ModelOption[] = [
      { id: "openai/gpt-4o", name: "GPT-4o", premium: true },
      { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", premium: true },
      { id: "xai/grok-4-fast-non-reasoning", name: "Grok 4 Fast", premium: true },
    ];

    if (isSubscribed) {
      return [...basicModels, ...premiumModels];
    }

    return basicModels;
  } catch (error) {
    console.error("Error in getAvailableModels action:", error);
    // Return fallback models in case of error
    return [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ];
  }
}