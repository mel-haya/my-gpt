"use server";

import { getUsersWithTokenUsage, updateUserRole } from "@/services/userService";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";

export async function getUsersWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
) {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const result = await getUsersWithTokenUsage(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error in getUsersWithStatus action:", error);
    throw new Error("Failed to fetch users data");
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: "admin" | "hotel_owner" | "hotel_staff" | null,
) {
  try {
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await updateUserRole(userId, role);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserRoleAction:", error);
    throw new Error("Failed to update user role");
  }
}
