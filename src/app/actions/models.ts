"use server";

import { auth } from "@clerk/nextjs/server";
import { getAvailableModelsFromDb } from "@/services/modelsService";

export interface ModelOption {
  id: string;
  name: string;
  premium?: boolean;
}

export async function getAvailableModels(): Promise<ModelOption[]> {
  try {
    const { userId } = await auth();

    // Fetch models from DB
    const dbModels = await getAvailableModelsFromDb();

    // Convert to ModelOption format
    // Note: We're mapping model_id to id for compatibility with existing frontend
    const models: ModelOption[] = dbModels.map((m) => ({
      id: m.model_id,
      name: m.name,
      // premium field is removed from DB schema but kept in interface for compatibility if needed elsewhere
    }));

    if (!userId) {
      // Return all enabled models even for unauthenticated users if that's desired,
      // or filter based on some logic. For now returning all enabled models.
      return models;
    }

    return models;
  } catch (error) {
    console.error("Error in getAvailableModels action:", error);
    throw error;
  }
}
