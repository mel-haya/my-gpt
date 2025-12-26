"use server";

import { getTestsWithPagination } from "@/services/testsService";
import { checkRole } from "@/lib/checkRole";

export async function getTestsWithStatus(
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

    const result = await getTestsWithPagination(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error in getTestsWithStatus action:", error);
    throw new Error("Failed to fetch tests data");
  }
}