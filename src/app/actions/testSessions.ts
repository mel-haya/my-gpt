"use server";

import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db-config";
import { testRuns, testRunResults, tests as testsTable } from "@/lib/db-schema";
import { eq, desc } from "drizzle-orm";
import {
  updateTestRunResult,
  updateTestRunStatus,
  getTestRunStatus,
  evaluateTestResponse
} from "@/services/testsService";
import { getTestProfileWithDetails } from "@/services/testProfilesService";
import { generateChatCompletionWithToolCalls } from "@/services/chatService";

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface SessionRunResult {
  testRunId: number;
  status: "Running" | "Failed" | "Done" | "Stopped";
  totalTests: number;
  completedTests: number;
  results?: {
    success: number;
    failed: number;
    pending: number;
  };
}

export async function runTestSessionAction(profileId: number): Promise<ActionResult<{ testRunId: number }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Get the profile details including associated tests
    const profile = await getTestProfileWithDetails(profileId);
    if (!profile) {
      return { success: false, error: "Test profile not found" };
    }

    if (profile.tests.length === 0) {
      return { success: false, error: "No tests associated with this profile" };
    }

    if (profile.models.length === 0) {
      return { success: false, error: "No models configured for this profile" };
    }

    // Create a new test run with profile reference
    const testRun = await db.insert(testRuns).values({
      user_id: userId,
      profile_id: profileId,
      status: "Running",
    }).returning();

    if (!testRun[0]) {
      return { success: false, error: "Failed to create test run" };
    }

    const testRunId = testRun[0].id;

    // Create test run results for all tests in the profile
    const testIds = profile.tests.map(t => t.test_id);
    const testRunResultsData = testIds.map(testId => ({
      test_run_id: testRunId,
      test_id: testId,
      status: "Pending" as const,
    }));

    await db.insert(testRunResults).values(testRunResultsData);

    // Start running tests in the background
    runTestsInBackground(
      testRunId,
      profile.tests,
      profile.models,
      profile.system_prompt ?? ""
    ).catch(console.error);

    revalidatePath("/admin/sessions");
    return { success: true, data: { testRunId } };

  } catch (error) {
    console.error("Error running test session:", error);
    return { success: false, error: "Failed to start test session" };
  }
}

export async function stopTestSessionAction(testRunId: number): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    await updateTestRunStatus(testRunId, "Stopped");

    revalidatePath("/admin/sessions");
    return { success: true };

  } catch (error) {
    console.error("Error stopping test session:", error);
    return { success: false, error: "Failed to stop test session" };
  }
}

export async function getSessionRunStatusAction(testRunId: number): Promise<ActionResult<SessionRunResult>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Get test run status
    const testRun = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        profile_id: testRuns.profile_id,
      })
      .from(testRuns)
      .where(eq(testRuns.id, testRunId))
      .limit(1);

    if (!testRun[0]) {
      return { success: false, error: "Test run not found" };
    }

    // Get test run results
    const results = await db
      .select({
        status: testRunResults.status,
      })
      .from(testRunResults)
      .where(eq(testRunResults.test_run_id, testRunId));

    const totalTests = results.length;
    const completedTests = results.filter(r =>
      r.status === "Success" || r.status === "Failed"
    ).length;

    const resultCounts = {
      success: results.filter(r => r.status === "Success").length,
      failed: results.filter(r => r.status === "Failed").length,
      pending: results.filter(r =>
        r.status === "Pending" || r.status === "Running" || r.status === "Evaluating"
      ).length,
    };

    return {
      success: true,
      data: {
        testRunId,
        status: testRun[0].status,
        totalTests,
        completedTests,
        results: resultCounts,
      }
    };

  } catch (error) {
    console.error("Error getting session run status:", error);
    return { success: false, error: "Failed to get session status" };
  }
}

export async function getSessionRunsAction(profileId: number): Promise<ActionResult<SessionRunResult[]>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Get all test runs for this profile
    const runs = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        created_at: testRuns.created_at,
      })
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId))
      .orderBy(desc(testRuns.created_at))
      .limit(10);

    const sessionRuns: SessionRunResult[] = [];

    for (const run of runs) {
      const results = await db
        .select({
          status: testRunResults.status,
        })
        .from(testRunResults)
        .where(eq(testRunResults.test_run_id, run.id));

      const totalTests = results.length;
      const completedTests = results.filter(r =>
        r.status === "Success" || r.status === "Failed"
      ).length;

      const resultCounts = {
        success: results.filter(r => r.status === "Success").length,
        failed: results.filter(r => r.status === "Failed").length,
        pending: results.filter(r =>
          r.status === "Pending" || r.status === "Running" || r.status === "Evaluating"
        ).length,
      };

      sessionRuns.push({
        testRunId: run.id,
        status: run.status,
        totalTests,
        completedTests,
        results: resultCounts,
      });
    }

    return { success: true, data: sessionRuns };

  } catch (error) {
    console.error("Error getting session runs:", error);
    return { success: false, error: "Failed to get session runs" };
  }
}

// Background function to run tests for a profile
async function runTestsInBackground(
  testRunId: number,
  tests: { test_id: number; test_name: string; test_prompt: string; }[],
  models: { id: number; profile_id: number; model_name: string; created_at: Date; }[],
  systemPrompt: string
) {
  // Helper function with timeout
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    return Promise.race([
      promise.then((result) => {
        clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise,
    ]);
  };

  try {
    // Use the first model for now (could be enhanced to run on all models)
    const selectedModel = models[0]?.model_name || "openai/gpt-4o";
    const evaluatorModel = "openai/gpt-4o"; // Fixed evaluator model

    // Run tests concurrently
    const testPromises = tests.map(async (test) => {
      try {
        // Check if the test run has been stopped before start
        const currentStatus = await getTestRunStatus(testRunId);
        if (currentStatus === "Stopped") {
          await updateTestRunResult(
            testRunId,
            test.test_id,
            "Failed",
            "Test execution stopped by user"
          );
          return;
        }

        // Update status to running
        await updateTestRunResult(testRunId, test.test_id, "Running");

        const startTime = Date.now();

        // This prevents infinite hanging if the LLM provider doesn't respond
        const chatResponse = await withTimeout(
          generateChatCompletionWithToolCalls({
            messages: [
              {
                id: `test-${test.test_id}-${Date.now()}`,
                role: "user",
                parts: [
                  {
                    type: "text",
                    text: test.test_prompt,
                  },
                ],
              },
            ],
            model: selectedModel,
            webSearch: false,
            systemPrompt: systemPrompt,
          }),
          60000, // 1 minute timeout for generation
          "Test execution timed out after 60 seconds"
        );

        const executionTime = Date.now() - startTime;

        if (!chatResponse.text.trim()) {
          throw new Error("No response content received from chat service");
        }

        // Update status to evaluating
        await updateTestRunResult(
          testRunId,
          test.test_id,
          "Evaluating",
          chatResponse.text,
          undefined,
          chatResponse.toolCalls,
          selectedModel,
          systemPrompt,
          chatResponse.cost,
          executionTime
        );

        // Get the expected result for evaluation
        const testDetails = await db
          .select({
            expected_result: testsTable.expected_result,
          })
          .from(testsTable)
          .where(eq(testsTable.id, test.test_id))
          .limit(1);

        if (!testDetails[0]) {
          throw new Error("Test details not found");
        }

        // Evaluate the response
        const evaluation = await evaluateTestResponse(
          test.test_prompt,
          testDetails[0].expected_result,
          chatResponse.text.trim(),
          evaluatorModel
        );

        // Final update with evaluation results
        await updateTestRunResult(
          testRunId,
          test.test_id,
          evaluation.status,
          chatResponse.text,
          evaluation.explanation,
          chatResponse.toolCalls,
          selectedModel,
          systemPrompt,
          chatResponse.cost,
          executionTime,
          evaluation.score
        );

      } catch (error) {
        console.error(`Error processing test ${test.test_id}:`, error);
        await updateTestRunResult(
          testRunId,
          test.test_id,
          "Failed",
          `Test execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    // Wait for all tests to complete
    await Promise.all(testPromises);

    // Check if any tests are still running (shouldn't happen but safety check)
    const finalStatus = await getTestRunStatus(testRunId);
    if (finalStatus !== "Stopped") {
      await updateTestRunStatus(testRunId, "Done");
    }

  } catch (error) {
    console.error("Error in background test execution:", error);
    await updateTestRunStatus(testRunId, "Failed");
  }
}