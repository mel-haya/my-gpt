"use server";

import { 
  getTestsWithPagination, 
  createTest, 
  updateTest, 
  deleteTest, 
  getLatestTestRunStats
} from "@/services/testsService";
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

export async function updateTestAction(
  testId: number,
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

    // Update the test
    const updatedTest = await updateTest(testId, testData);
    
    if (!updatedTest) {
      throw new Error("Test not found or could not be updated");
    }

    // Revalidate the tests page
    revalidatePath("/admin/tests");

    return { success: true, test: updatedTest };
  } catch (error) {
    console.error("Error in updateTestAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update test" 
    };
  }
}

export async function deleteTestAction(testId: number) {
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

    // Delete the test
    const deletedTest = await deleteTest(testId);
    
    if (!deletedTest) {
      throw new Error("Test not found or could not be deleted");
    }

    // Revalidate the tests page
    revalidatePath("/admin/tests");

    return { success: true, test: deletedTest };
  } catch (error) {
    console.error("Error in deleteTestAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete test" 
    };
  }
}

export async function getLatestTestRunStatsAction() {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const stats = await getLatestTestRunStats();
    return stats;
  } catch (error) {
    console.error("Error in getLatestTestRunStatsAction:", error);
    throw new Error("Failed to fetch test run stats");
  }
}