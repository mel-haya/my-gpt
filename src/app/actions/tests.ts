"use server";

import { getTestsWithPagination, createTest } from "@/services/testsService";
import { checkRole } from "@/lib/checkRole";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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

export async function createTestAction(
  testData: {
    name: string;
    prompt: string;
    expected_result: string;
  }
) {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get current user
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Create the test
    const newTest = await createTest({
      ...testData,
      user_id: user.id,
      created_by: user.id,
    });

    // Revalidate the tests page
    revalidatePath("/admin/tests");

    return { success: true, test: newTest };
  } catch (error) {
    console.error("Error in createTestAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create test" 
    };
  }
}