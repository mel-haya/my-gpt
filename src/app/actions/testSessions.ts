"use server";

import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db-config";
import { testRuns, testRunResults, tests as testsTable } from "@/lib/db-schema";
import { eq, desc, and, inArray } from "drizzle-orm";
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
    const testRunResultsData = testIds.flatMap(testId =>
      profile.models.map(model => ({
        test_run_id: testRunId,
        test_id: testId,
        status: "Pending" as const,
        model_used: model.model_name
      }))
    );

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
    const evaluatorModel = "openai/gpt-4o"; // Fixed evaluator model

    // Run tests for all models concurrently
    const modelPromises = models.map(async (model) => {
      const selectedModel = model.model_name;

      // Run tests concurrently for this model
      const testPromises = tests.map(async (test) => {
        try {
          // Check if the test run has been stopped before start
          const currentStatus = await getTestRunStatus(testRunId);
          if (currentStatus === "Stopped") {
            await updateTestRunResult(
              testRunId,
              test.test_id,
              "Failed",
              "Test execution stopped by user",
              undefined,
              undefined,
              selectedModel,
              undefined,
              undefined,
              undefined,
              undefined,
              selectedModel // Filter by model
            );
            return;
          }

          // Update status to running
          await updateTestRunResult(
            testRunId,
            test.test_id,
            "Running",
            undefined,
            undefined,
            undefined,
            selectedModel,
            undefined,
            undefined,
            undefined,
            undefined,
            selectedModel // Filter by model
          );

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
            executionTime,
            undefined,
            selectedModel // Filter by model
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
            evaluation.score,
            selectedModel // Filter by model
          );

        } catch (error) {
          console.error(`Error processing test ${test.test_id} for model ${selectedModel}:`, error);
          await updateTestRunResult(
            testRunId,
            test.test_id,
            "Failed",
            `Test execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            undefined,
            undefined,
            selectedModel,
            undefined,
            undefined,
            undefined,
            undefined,
            selectedModel // Filter by model
          );
        }
      });

      await Promise.all(testPromises);
    });

    // Wait for all models to complete
    await Promise.all(modelPromises);

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

export async function getTestInProfileDetailsAction(
  profileId: number,
  testId: number
): Promise<ActionResult<{
  test: { name: string; prompt: string; expected_result: string };
  results: {
    runId: number;
    runDate: Date;
    model: string;
    status: string;
    score: number | null;
    explanation: string | null;
    output: string | null;
    tokens_cost: number | null;
    execution_time_ms: number | null;
  }[];
}>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // 1. Get Test Details
    const test = await db
      .select({
        name: testsTable.name,
        prompt: testsTable.prompt,
        expected_result: testsTable.expected_result,
      })
      .from(testsTable)
      .where(eq(testsTable.id, testId))
      .limit(1);

    if (!test[0]) {
      return { success: false, error: "Test not found" };
    }

    // 2. Get All Runs for this Profile
    const runs = await db
      .select({
        id: testRuns.id,
      })
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId));

    if (runs.length === 0) {
      return { success: true, data: { test: test[0], results: [] } };
    }

    const runIds = runs.map(r => r.id);

    // 3. Get All Results for these runs and this test
    const allResults = await db
      .select({
        runId: testRunResults.test_run_id,
        runDate: testRunResults.created_at,
        model: testRunResults.model_used,
        status: testRunResults.status,
        score: testRunResults.score,
        explanation: testRunResults.explanation,
        output: testRunResults.output,
        tokens_cost: testRunResults.tokens_cost,
        execution_time_ms: testRunResults.execution_time_ms,
      })
      .from(testRunResults)
      .where(
        and(
          eq(testRunResults.test_id, testId),
          inArray(testRunResults.test_run_id, runIds)
        )
      )
      .orderBy(desc(testRunResults.created_at));

    // 4. Filter to get only the latest result per model
    const latestResultsMap = new Map<string, typeof allResults[0]>();

    for (const result of allResults) {
      if (result.model && !latestResultsMap.has(result.model)) {
        latestResultsMap.set(result.model, result);
      }
    }

    const results = Array.from(latestResultsMap.values()).map(r => ({
      runId: r.runId!,
      runDate: r.runDate,
      model: r.model!,
      status: r.status,
      score: r.score,
      explanation: r.explanation,
      output: r.output,
      tokens_cost: r.tokens_cost,
      execution_time_ms: r.execution_time_ms,
    }));

    return {
      success: true,
      data: {
        test: test[0],
        results
      }
    };

  } catch (error) {
    console.error("Error getting test details:", error);
    return { success: false, error: "Failed to get test details" };
  }
}
