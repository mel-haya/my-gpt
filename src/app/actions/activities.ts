"use server";

import { db } from "@/lib/db-config";
import { activities, InsertActivity } from "@/lib/db-schema";
import { currentUser } from "@clerk/nextjs/server";
import { count } from "drizzle-orm";
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from "@/services/activitiesService";
import { revalidatePath } from "next/cache";
import { uploadImageToImageKit } from "@/app/api/chat/imageKit";

export async function uploadImageAction(base64Image: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const imageUrl = await uploadImageToImageKit(base64Image);
    return { success: true, data: imageUrl };
  } catch (error) {
    console.error("Error in uploadImageAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
}

export async function getActivitiesAction({
  page = 1,
  limit = 10,
  search = "",
  category = "all",
}: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
} = {}) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const data = await getActivities(search, category, limit, page);
    return { success: true, data };
  } catch (error) {
    console.error("Error in getActivitiesAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch activities",
    };
  }
}

export async function getActivityStatsAction() {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const statsResult = await db.select({ count: count() }).from(activities);
    const total = Number(statsResult[0]?.count || 0);

    // Get counts by category if needed, or by price
    // For now just total
    return {
      success: true,
      data: {
        total,
      },
    };
  } catch (error) {
    console.error("Error in getActivityStatsAction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch activity stats",
    };
  }
}

export async function createActivityAction(data: InsertActivity) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const activity = await createActivity(data);
    revalidatePath("/admin/activities");
    return { success: true, data: activity };
  } catch (error) {
    console.error("Error in createActivityAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create activity",
    };
  }
}

export async function updateActivityAction(
  id: number,
  data: Partial<InsertActivity>,
) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const activity = await updateActivity(id, data);
    revalidatePath("/admin/activities");
    return { success: true, data: activity };
  } catch (error) {
    console.error("Error in updateActivityAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update activity",
    };
  }
}

export async function deleteActivityAction(id: number) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    await deleteActivity(id);
    revalidatePath("/admin/activities");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteActivityAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete activity",
    };
  }
}
