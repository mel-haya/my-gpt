"use server";

import { getUsersWithTokenUsage } from "@/services/userService";
import { checkRole } from "@/lib/checkRole";

export async function getUsersWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
) {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
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