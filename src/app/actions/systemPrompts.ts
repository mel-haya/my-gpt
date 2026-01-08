"use server";

import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import {
  getSystemPrompts,
  createSystemPrompt as createSystemPromptService,
  updateSystemPrompt as updateSystemPromptService,
  deleteSystemPrompt as deleteSystemPromptService,
  bulkDeleteSystemPrompts,
  getSystemPromptById,
  SystemPromptsResponse,
} from "@/services/systemPromptsService";
import type { SelectSystemPrompt } from "@/lib/db-schema";

// Action result types
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSystemPromptsAction(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<ActionResult<SystemPromptsResponse>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const result = await getSystemPrompts(userId, {
      search: searchQuery,
      page,
      limit,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching system prompts:", error);
    return { success: false, error: "Failed to fetch system prompts" };
  }
}

export async function createSystemPromptAction(data: {
  name: string;
  prompt: string;

}): Promise<ActionResult<SelectSystemPrompt>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    if (!data.name?.trim() || !data.prompt?.trim()) {
      return { success: false, error: "Name and prompt are required" };
    }

    const newPrompt = await createSystemPromptService({
      name: data.name.trim(),
      prompt: data.prompt.trim(),
      user_id: userId,
    });

    // Revalidate the system prompts page
    revalidatePath("/admin/system-prompts");

    return { success: true, data: newPrompt };
  } catch (error) {
    console.error("Error creating system prompt:", error);
    
    // Handle potential unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
      return { success: false, error: "A system prompt with this name already exists" };
    }

    return { success: false, error: "Failed to create system prompt" };
  }
}

export async function updateSystemPromptAction(
  id: number,
  data: {
    name?: string;
    prompt?: string;
    default?: boolean;
  }
): Promise<ActionResult<SelectSystemPrompt>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    if (!id) {
      return { success: false, error: "System prompt ID is required" };
    }

    // Verify the prompt exists and belongs to the user
    const existingPrompt = await getSystemPromptById(id, userId);
    if (!existingPrompt) {
      return { success: false, error: "System prompt not found or access denied" };
    }

    const updatedPrompt = await updateSystemPromptService(id, userId, {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.prompt !== undefined && { prompt: data.prompt.trim() }),
      ...(data.default !== undefined && { default: data.default }),
    });

    if (!updatedPrompt) {
      return { success: false, error: "Failed to update system prompt" };
    }

    // Revalidate the system prompts page
    revalidatePath("/admin/system-prompts");

    return { success: true, data: updatedPrompt };
  } catch (error) {
    console.error("Error updating system prompt:", error);
    
    // Handle potential unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
      return { success: false, error: "A system prompt with this name already exists" };
    }

    return { success: false, error: "Failed to update system prompt" };
  }
}

export async function deleteSystemPromptAction(id: number): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    if (!id) {
      return { success: false, error: "System prompt ID is required" };
    }

    const deletedPrompt = await deleteSystemPromptService(id, userId);

    if (!deletedPrompt) {
      return { success: false, error: "System prompt not found or access denied" };
    }

    // Revalidate the system prompts page
    revalidatePath("/admin/system-prompts");

    return { success: true };
  } catch (error) {
    console.error("Error deleting system prompt:", error);
    return { success: false, error: "Failed to delete system prompt" };
  }
}

export async function bulkDeleteSystemPromptsAction(ids: number[]): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: "System prompt IDs are required" };
    }

    await bulkDeleteSystemPrompts(ids, userId);

    // Revalidate the system prompts page
    revalidatePath("/admin/system-prompts");

    return { success: true };
  } catch (error) {
    console.error("Error bulk deleting system prompts:", error);
    return { success: false, error: "Failed to delete system prompts" };
  }
}

export async function getSystemPromptByIdAction(id: number): Promise<ActionResult<SelectSystemPrompt>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const prompt = await getSystemPromptById(id, userId);

    if (!prompt) {
      return { success: false, error: "System prompt not found" };
    }

    return { success: true, data: prompt };
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return { success: false, error: "Failed to fetch system prompt" };
  }
}