"use server";

import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import {
  getTestProfiles,
  createTestProfile,
  updateTestProfile,
  deleteTestProfile,
  getTestsForSelection,
  getSystemPromptsForSelection,
  getTestProfileWithDetails,
  getTestProfileByName,
  TestProfilesResponse,
  UpdateTestProfileData,
  DetailedTestProfile,
  ManualTest,
} from "@/services/testProfilesService";
import type {
  SelectTestProfile,
  SelectTest,
  SelectSystemPrompt,
} from "@/lib/db-schema";

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getTestProfilesAction(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<ActionResult<TestProfilesResponse>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const result = await getTestProfiles({
      search: searchQuery,
      page,
      limit,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching test profiles:", error);
    return { success: false, error: "Failed to fetch test profiles" };
  }
}

export async function createTestProfileAction(data: {
  name: string;
  system_prompt_id: number;
  test_ids: number[];
  model_configs: string[];
  manual_tests?: ManualTest[];
}): Promise<ActionResult<SelectTestProfile>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Check if a profile with this name already exists for this user
    const existingProfile = await getTestProfileByName(data.name, userId);
    if (existingProfile) {
      return {
        success: false,
        error:
          "A test session with this name already exists. Please choose a different name.",
      };
    }

    const profile = await createTestProfile({
      ...data,
      user_id: userId,
    });

    revalidatePath("/admin/sessions");
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error creating test profile:", error);
    return { success: false, error: "Failed to create test profile" };
  }
}

export async function updateTestProfileAction(
  id: number,
  data: {
    name: string;
    system_prompt_id: number;
    test_ids: number[];
    model_configs: string[];
    manual_tests?: ManualTest[];
  }
): Promise<ActionResult<SelectTestProfile>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Check if a profile with the same name exists and has a different ID
    const existingProfile = await getTestProfileByName(data.name, userId);
    if (existingProfile && existingProfile.id !== id) {
      return {
        success: false,
        error:
          "A test session with this name already exists. Please choose a different name.",
      };
    }

    const updateData: UpdateTestProfileData = {
      name: data.name,
      system_prompt_id: data.system_prompt_id,
      test_ids: data.test_ids,
      model_configs: data.model_configs,
    };

    const result = await updateTestProfile(id, updateData);

    revalidatePath("/admin/sessions");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating test profile:", error);
    if (
      error instanceof Error &&
      error.message === "Test profile not found or access denied"
    ) {
      return {
        success: false,
        error: "Test profile not found or you don't have permission to edit it",
      };
    }
    return { success: false, error: "Failed to update test profile" };
  }
}

export async function deleteTestProfileAction(
  id: number
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    await deleteTestProfile(id);

    revalidatePath("/admin/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error deleting test profile:", error);
    return { success: false, error: "Failed to delete test profile" };
  }
}

export async function getTestsForSelectionAction(): Promise<
  ActionResult<SelectTest[]>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const tests = await getTestsForSelection();
    return { success: true, data: tests };
  } catch (error) {
    console.error("Error fetching tests for selection:", error);
    return { success: false, error: "Failed to fetch tests" };
  }
}

export async function getSystemPromptsForSelectionAction(): Promise<
  ActionResult<SelectSystemPrompt[]>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const systemPrompts = await getSystemPromptsForSelection();
    return { success: true, data: systemPrompts };
  } catch (error) {
    console.error("Error fetching system prompts for selection:", error);
    return { success: false, error: "Failed to fetch system prompts" };
  }
}

export async function getTestProfileDetailsAction(
  id: number
): Promise<ActionResult<DetailedTestProfile>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const profile = await getTestProfileWithDetails(id);
    if (!profile) {
      return { success: false, error: "Test profile not found" };
    }

    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching test profile details:", error);
    return { success: false, error: "Failed to fetch test profile details" };
  }
}
