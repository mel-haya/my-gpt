"use server";

import { getUsersWithTokenUsage } from "@/services/userService";

export async function getUsersWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
) {
  try {
    const result = await getUsersWithTokenUsage(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error in getUsersWithStatus action:", error);
    throw new Error("Failed to fetch users data");
  }
}