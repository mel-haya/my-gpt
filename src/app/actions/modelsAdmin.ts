"use server";

import { revalidatePath } from "next/cache";
import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  bulkDeleteModels,
  SelectModelWithStats,
} from "@/services/modelsService";
import type { InsertModel } from "@/lib/db-schema";
import { auth } from "@clerk/nextjs/server";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getModelsAction(
  search?: string,
  limit?: number,
  page?: number,
  sortBy?: "name" | "created_at" | "score" | "cost" | "tokens",
  sortOrder?: "asc" | "desc",
): Promise<
  ActionResponse<{
    models: SelectModelWithStats[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await getModels({ search, limit, page, sortBy, sortOrder });
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching models:", error);
    return { success: false, error: "Failed to fetch models" };
  }
}

export async function createModelAction(
  data: Omit<InsertModel, "id" | "created_at" | "updated_at">,
): Promise<ActionResponse<InsertModel>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const newModel = await createModel(data);
    revalidatePath("/admin/models");
    return { success: true, data: newModel };
  } catch (error) {
    console.error("Error creating model:", error);
    return { success: false, error: "Failed to create model" };
  }
}

export async function updateModelAction(
  modelId: number,
  data: Partial<Omit<InsertModel, "id" | "created_at">>,
): Promise<ActionResponse<InsertModel>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedModel = await updateModel(modelId, data);
    if (!updatedModel) {
      return { success: false, error: "Model not found" };
    }

    revalidatePath("/admin/models");
    return { success: true, data: updatedModel };
  } catch (error) {
    console.error("Error updating model:", error);
    return { success: false, error: "Failed to update model" };
  }
}

export async function deleteModelAction(
  modelId: number,
): Promise<ActionResponse<InsertModel>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const deletedModel = await deleteModel(modelId);
    if (!deletedModel) {
      return { success: false, error: "Model not found" };
    }

    revalidatePath("/admin/models");
    return { success: true, data: deletedModel };
  } catch (error) {
    console.error("Error deleting model:", error);
    return { success: false, error: "Failed to delete model" };
  }
}

export async function bulkDeleteModelsAction(
  modelIds: number[],
): Promise<ActionResponse<number>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const count = await bulkDeleteModels(modelIds);
    revalidatePath("/admin/models");
    return { success: true, data: count };
  } catch (error) {
    console.error("Error bulk deleting models:", error);
    return { success: false, error: "Failed to delete models" };
  }
}
