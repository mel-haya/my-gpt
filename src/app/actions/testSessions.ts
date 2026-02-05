"use server";

import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db-config";
import {
  testRuns,
  testRunResults,
  tests as testsTable,
  models,
} from "@/lib/db-schema";
import { eq, desc, and, inArray, count } from "drizzle-orm";
import {
  updateTestRunResult,
  updateTestRunStatus,
  getTestRunStatus,
  evaluateTestResponse,
  awardVictoriesForTestRun,
} from "@/services/testsService";
import {
  getTestProfileWithDetails,
  type ManualTest,
} from "@/services/testProfilesService";
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

export async function runTestSessionAction(
  profileId: number,
  evaluatorModel: string,
): Promise<ActionResult<{ testRunId: number }>> {
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

    // Lookup model IDs from the models table
    const modelNames = profile.models.map((m) => m.model_name);
    const modelRecords = await db
      .select({ id: models.id, model_id: models.model_id })
      .from(models)
      .where(inArray(models.model_id, modelNames));

    // Create a map from model_id string to integer id
    const modelIdMap = new Map<string, number>();
    for (const m of modelRecords) {
      modelIdMap.set(m.model_id, m.id);
    }

    // Create a new test run with profile reference
    const testRun = await db
      .insert(testRuns)
      .values({
        user_id: userId,
        profile_id: profileId,
        status: "Running",
      })
      .returning();

    if (!testRun[0]) {
      return { success: false, error: "Failed to create test run" };
    }

    const testRunId = testRun[0].id;

    // Create test run results for all tests in the profile
    const testRunResultsData: (typeof testRunResults.$inferInsert)[] = [];

    for (const test of profile.tests) {
      for (const model of profile.models) {
        const modelId = modelIdMap.get(model.model_name);
        if (!modelId) continue; // Skip if model not found in models table

        if (typeof test.test_id === "number") {
          testRunResultsData.push({
            test_run_id: testRunId,
            test_id: test.test_id,
            status: "Pending" as const,
            model_id: modelId,
            evaluator_model: evaluatorModel,
          });
        } else if (typeof test.test_id === "string" && test.is_manual) {
          testRunResultsData.push({
            test_run_id: testRunId,
            test_id: null,
            manual_prompt: test.test_prompt,
            manual_expected_result: test.expected_result,
            status: "Pending" as const,
            model_id: modelId,
            evaluator_model: evaluatorModel,
          });
        }
      }
    }

    await db.insert(testRunResults).values(testRunResultsData);

    // Start running tests in the background
    runTestsInBackground(
      testRunId,
      profile.tests.map((t) => ({
        test_id: typeof t.test_id === "number" ? t.test_id : null,
        test_prompt: t.test_prompt,
        expected_result: t.expected_result,
        is_manual: t.is_manual,
      })),
      profile.models,
      modelIdMap,
      profile.system_prompt ?? "",
      evaluatorModel,
    ).catch(console.error);

    revalidatePath("/admin/sessions");
    return { success: true, data: { testRunId } };
  } catch (error) {
    console.error("Error running test session:", error);
    return { success: false, error: "Failed to start test session" };
  }
}

export async function stopTestSessionAction(
  testRunId: number,
): Promise<ActionResult> {
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

export async function getSessionRunStatusAction(
  testRunId: number,
): Promise<ActionResult<SessionRunResult>> {
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
    const completedTests = results.filter(
      (r) => r.status === "Success" || r.status === "Failed",
    ).length;

    const resultCounts = {
      success: results.filter((r) => r.status === "Success").length,
      failed: results.filter((r) => r.status === "Failed").length,
      pending: results.filter(
        (r) =>
          r.status === "Pending" ||
          r.status === "Running" ||
          r.status === "Evaluating",
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
      },
    };
  } catch (error) {
    console.error("Error getting session run status:", error);
    return { success: false, error: "Failed to get session status" };
  }
}

export async function getSessionRunsAction(
  profileId: number,
): Promise<ActionResult<SessionRunResult[]>> {
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
      const completedTests = results.filter(
        (r) => r.status === "Success" || r.status === "Failed",
      ).length;

      const resultCounts = {
        success: results.filter((r) => r.status === "Success").length,
        failed: results.filter((r) => r.status === "Failed").length,
        pending: results.filter(
          (r) =>
            r.status === "Pending" ||
            r.status === "Running" ||
            r.status === "Evaluating",
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
  tests: {
    test_id: number | null;
    test_prompt: string;
    expected_result: string;
    is_manual?: boolean;
  }[],
  models: {
    id: number;
    profile_id: number;
    model_name: string;
    created_at: Date;
  }[],
  modelIdMap: Map<string, number>,
  systemPrompt: string,
  evaluatorModel: string,
) {
  // Helper function with timeout
  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> => {
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
    // Run tests for all models concurrently
    const modelPromises = models.map(async (model) => {
      const selectedModel = model.model_name;
      const modelIntId = modelIdMap.get(selectedModel);
      if (!modelIntId) {
        console.error(`Model ${selectedModel} not found in models table`);
        return;
      }

      // Run tests concurrently for this model
      const testPromises = tests.map(async (test) => {
        try {
          // Check if the test run has been stopped before start
          const currentStatus = await getTestRunStatus(testRunId);
          if (currentStatus === "Stopped") {
            await updateTestRunResult({
              testRunId,
              testId: test.test_id,
              manualPrompt: test.is_manual ? test.test_prompt : undefined,
              status: "Failed",
              output: "Test execution stopped by user",
              filterModelId: modelIntId,
            });
            return;
          }

          // Update status to running
          await updateTestRunResult({
            testRunId,
            testId: test.test_id,
            manualPrompt: test.is_manual ? test.test_prompt : undefined,
            status: "Running",
            filterModelId: modelIntId,
          });

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
              useTestTools: true, // Use mocked tools that don't create actual DB entries
            }),
            90000, // 1 minute and 30 s timeout for generation
            "Test execution timed out after 60 seconds",
          );

          const executionTime = Date.now() - startTime;

          if (!chatResponse.text.trim()) {
            throw new Error("No response content received from chat service");
          }

          // Update status to evaluating
          await updateTestRunResult({
            testRunId,
            testId: test.test_id,
            manualPrompt: test.is_manual ? test.test_prompt : undefined,
            status: "Evaluating",
            output: chatResponse.text,
            toolCalls: chatResponse.toolCalls,
            modelId: modelIntId,
            systemPrompt,
            tokensCost: chatResponse.cost,
            tokenCount: chatResponse.usage?.totalTokens,
            executionTimeMs: executionTime,
            filterModelId: modelIntId,
          });

          // Get the expected result for evaluation
          const testDetails = test.is_manual
            ? { expected_result: test.expected_result }
            : await db
                .select({
                  expected_result: testsTable.expected_result,
                })
                .from(testsTable)
                .where(eq(testsTable.id, test.test_id as number))
                .limit(1)
                .then((res) => res[0]);

          if (!testDetails) {
            throw new Error("Test details not found");
          }

          // Evaluate the response
          const evaluation = await evaluateTestResponse(
            test.test_prompt,
            testDetails.expected_result,
            chatResponse.text.trim(),
            evaluatorModel,
          );

          // Final update with evaluation results
          await updateTestRunResult({
            testRunId,
            testId: test.test_id,
            manualPrompt: test.is_manual ? test.test_prompt : undefined,
            status: evaluation.status,
            output: chatResponse.text,
            explanation: evaluation.explanation,
            toolCalls: chatResponse.toolCalls,
            modelId: modelIntId,
            systemPrompt,
            tokensCost: chatResponse.cost,
            tokenCount: chatResponse.usage?.totalTokens,
            executionTimeMs: executionTime,
            score: evaluation.score,
            filterModelId: modelIntId,
          });
        } catch (error) {
          console.error(
            `Error processing test ${
              test.test_id || test.test_prompt
            } for model ${selectedModel}:`,
            error,
          );
          await updateTestRunResult({
            testRunId,
            testId: test.test_id,
            manualPrompt: test.is_manual ? test.test_prompt : undefined,
            status: "Failed",
            output: `Test execution failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            filterModelId: modelIntId,
          });
        }
      });

      await Promise.all(testPromises);
    });

    // Wait for all models to complete
    await Promise.all(modelPromises);

    // Check if any results are still pending for this run across all models/tests
    const pendingResults = await db
      .select({ count: count() })
      .from(testRunResults)
      .where(
        and(
          eq(testRunResults.test_run_id, testRunId),
          inArray(testRunResults.status, ["Pending", "Running", "Evaluating"]),
        ),
      );

    if (pendingResults[0]?.count === 0) {
      const finalStatus = await getTestRunStatus(testRunId);
      if (finalStatus !== "Stopped") {
        await updateTestRunStatus(testRunId, "Done");
        // Award victories to winning models for each test
        await awardVictoriesForTestRun(testRunId);
      }
    }
  } catch (error) {
    console.error("Error in background test execution:", error);
    await updateTestRunStatus(testRunId, "Failed");
  }
}

export async function reEvaluateTestResultAction(
  profileId: number,
  testId: number | string,
  evaluatorModel: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // 1. Get test details
    let testInfo: {
      prompt: string;
      expected_result: string;
      is_manual: boolean;
    };
    if (typeof testId === "number") {
      const test = await db
        .select({
          prompt: testsTable.prompt,
          expected_result: testsTable.expected_result,
        })
        .from(testsTable)
        .where(eq(testsTable.id, testId))
        .limit(1);

      if (!test[0]) {
        return { success: false, error: "Test not found" };
      }
      testInfo = { ...test[0], is_manual: false };
    } else {
      // Manual test: testId is `manual-{prompt}`
      const prompt = testId.startsWith("manual-")
        ? testId.substring(7)
        : testId;

      const profile = await getTestProfileWithDetails(profileId);
      const manualTest = (
        profile?.manual_tests as { prompt: string; expected_result: string }[]
      )?.find((t) => t.prompt === prompt);

      if (!manualTest) {
        return { success: false, error: "Manual test not found" };
      }
      testInfo = {
        prompt: manualTest.prompt,
        expected_result: manualTest.expected_result,
        is_manual: true,
      };
    }

    // 2. Get the latest results for this test in this profile (per model)
    // We get all runs for this profile
    const runs = await db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId));

    if (runs.length === 0) {
      return { success: false, error: "No runs found for this profile" };
    }

    const runIds = runs.map((r) => r.id);

    // Get all results for this test in these runs
    const whereCondition = testInfo.is_manual
      ? eq(testRunResults.manual_prompt, testInfo.prompt)
      : eq(testRunResults.test_id, testId as number);

    const allResults = await db
      .select()
      .from(testRunResults)
      .where(and(whereCondition, inArray(testRunResults.test_run_id, runIds)))
      .orderBy(desc(testRunResults.created_at));

    // Filter to get latest per model
    const latestResultsMap = new Map<number, (typeof allResults)[0]>();
    for (const result of allResults) {
      if (result.model_id && !latestResultsMap.has(result.model_id)) {
        latestResultsMap.set(result.model_id, result);
      }
    }

    const resultsToEvaluate = Array.from(latestResultsMap.values());

    if (resultsToEvaluate.length === 0) {
      return { success: false, error: "No test results found to evaluate" };
    }

    // 3. Re-evaluate each result
    const evaluationPromises = resultsToEvaluate.map(async (result) => {
      if (!result.output) return;

      try {
        // Update status to Evaluating
        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: "Evaluating",
          filterModelId: result.model_id!,
          evaluatorModel,
        });

        const evaluation = await evaluateTestResponse(
          testInfo.prompt,
          testInfo.expected_result,
          result.output,
          evaluatorModel,
        );

        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: evaluation.status,
          explanation: evaluation.explanation,
          score: evaluation.score,
          filterModelId: result.model_id!,
          evaluatorModel,
        });
      } catch (error) {
        console.error(`Error re-evaluating result ${result.id}:`, error);
        // Revert status to what it was or set to Failed?
        // Let's set to Failed if evaluation specifically failed
        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: "Failed",
          explanation: "Re-evaluation failed",
          filterModelId: result.model_id!,
          evaluatorModel,
        });
      }
    });

    await Promise.all(evaluationPromises);

    revalidatePath("/admin/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error re-evaluating test:", error);
    return { success: false, error: "Failed to re-evaluate test" };
  }
}

export interface TestInProfileDetail {
  runId: number;
  runDate: Date;
  model: string;
  status: string;
  score: number | null;
  explanation: string | null;
  output: string | null;
  tokens_cost: number | null;
  token_count: number | null;
  execution_time_ms: number | null;
  tool_calls: unknown;
  evaluator_model: string | null; // Added evaluator_model
}

export interface TestInProfileDetailResult {
  test: { prompt: string; expected_result: string };
  results: TestInProfileDetail[];
}

export async function getTestInProfileDetailsAction(
  profileId: number,
  testId: number | string,
): Promise<ActionResult<TestInProfileDetailResult>> {
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
    let testInfo: {
      prompt: string;
      expected_result: string;
      is_manual: boolean;
    };

    if (typeof testId === "number") {
      const test = await db
        .select({
          prompt: testsTable.prompt,
          expected_result: testsTable.expected_result,
        })
        .from(testsTable)
        .where(eq(testsTable.id, testId))
        .limit(1);

      if (!test[0]) {
        return { success: false, error: "Test not found" };
      }
      testInfo = { ...test[0], is_manual: false };
    } else {
      // Manual test: testId is `manual-{prompt}`
      const prompt = testId.startsWith("manual-")
        ? testId.substring(7)
        : testId;

      const profile = await getTestProfileWithDetails(profileId);
      const manualTest = (
        profile?.manual_tests as { prompt: string; expected_result: string }[]
      )?.find((t) => t.prompt === prompt);

      if (!manualTest) {
        return { success: false, error: "Manual test not found" };
      }
      testInfo = {
        prompt: manualTest.prompt,
        expected_result: manualTest.expected_result,
        is_manual: true,
      };
    }

    // 2. Get All Runs for this Profile
    const runs = await db
      .select({
        id: testRuns.id,
      })
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId));

    if (runs.length === 0) {
      return { success: true, data: { test: testInfo, results: [] } };
    }

    const runIds = runs.map((r) => r.id);

    // 3. Get All Results for these runs and this test
    const whereCondition = testInfo.is_manual
      ? eq(testRunResults.manual_prompt, testInfo.prompt)
      : eq(testRunResults.test_id, testId as number);

    const allResults = await db
      .select({
        runId: testRunResults.test_run_id,
        runDate: testRunResults.created_at,
        model_id: testRunResults.model_id,
        tool_calls: testRunResults.tool_calls,
        status: testRunResults.status,
        score: testRunResults.score,
        explanation: testRunResults.explanation,
        output: testRunResults.output,
        tokens_cost: testRunResults.tokens_cost,
        token_count: testRunResults.token_count,
        execution_time_ms: testRunResults.execution_time_ms,
        evaluator_model: testRunResults.evaluator_model, // Add evaluator_model here
      })
      .from(testRunResults)
      .where(and(whereCondition, inArray(testRunResults.test_run_id, runIds)))
      .orderBy(desc(testRunResults.created_at));

    // 4. Filter to get only the latest result per model
    const latestResultsMap = new Map<number, (typeof allResults)[0]>();

    for (const result of allResults) {
      if (result.model_id && !latestResultsMap.has(result.model_id)) {
        latestResultsMap.set(result.model_id, result);
      }
    }

    // Look up model names from model IDs
    const modelIds = Array.from(latestResultsMap.keys());
    const modelRecords =
      modelIds.length > 0
        ? await db
            .select({ id: models.id, model_id: models.model_id })
            .from(models)
            .where(inArray(models.id, modelIds))
        : [];

    const modelNameMap = new Map<number, string>();
    for (const m of modelRecords) {
      modelNameMap.set(m.id, m.model_id);
    }

    const results = Array.from(latestResultsMap.values()).map((res) => ({
      runId: res.runId!,
      runDate: res.runDate,
      model: modelNameMap.get(res.model_id!) || `Model #${res.model_id}`,
      status: res.status,
      score: res.score,
      explanation: res.explanation,
      output: res.output,
      tokens_cost: res.tokens_cost,
      token_count: res.token_count,
      execution_time_ms: res.execution_time_ms,
      evaluator_model: res.evaluator_model,
      tool_calls: res.tool_calls,
    }));

    return {
      success: true,
      data: {
        test: testInfo,
        results,
      },
    };
  } catch (error) {
    console.error("Error getting test details:", error);
    return { success: false, error: "Failed to get test details" };
  }
}

export async function regenerateTestResultAction(
  profileId: number,
  testId: number | string,
  modelUsed?: string,
): Promise<ActionResult<{ testRunId: number }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // 1. Get profile and test info
    const profile = await getTestProfileWithDetails(profileId);
    if (!profile) return { success: false, error: "Profile not found" };

    let testInfo: {
      test_id: number | null;
      test_prompt: string;
      expected_result: string;
      is_manual: boolean;
    };

    if (typeof testId === "number") {
      const test = await db
        .select({
          prompt: testsTable.prompt,
          expected_result: testsTable.expected_result,
        })
        .from(testsTable)
        .where(eq(testsTable.id, testId))
        .limit(1);

      if (!test[0]) return { success: false, error: "Test not found" };
      testInfo = {
        test_id: testId,
        test_prompt: test[0].prompt,
        expected_result: test[0].expected_result,
        is_manual: false,
      };
    } else {
      const prompt = testId.startsWith("manual-")
        ? testId.substring(7)
        : testId;
      const manualTest = (profile.manual_tests as ManualTest[])?.find(
        (t) => t.prompt === prompt,
      );
      if (!manualTest)
        return { success: false, error: "Manual test not found" };
      testInfo = {
        test_id: null,
        test_prompt: manualTest.prompt,
        expected_result: manualTest.expected_result,
        is_manual: true,
      };
    }

    // 2. Get the latest test run for this profile
    const testRun = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId))
      .orderBy(desc(testRuns.created_at))
      .limit(1);

    let testRunId: number;

    if (testRun.length === 0) {
      // Create a new test run if none exists
      const newRun = await db
        .insert(testRuns)
        .values({
          user_id: userId,
          profile_id: profileId,
          status: "Running",
        })
        .returning();

      if (!newRun[0]) {
        return { success: false, error: "Failed to create test run" };
      }
      testRunId = newRun[0].id;
    } else {
      testRunId = testRun[0].id;
      // Mark the run as Running again so UI polling works
      await updateTestRunStatus(testRunId, "Running");
    }

    // 3. Determine models to run
    const modelsToRun = modelUsed
      ? profile.models.filter((m) => m.model_name === modelUsed)
      : profile.models;

    if (modelsToRun.length === 0) {
      return { success: false, error: "No models configured for this profile" };
    }

    // Lookup model IDs from the models table
    const modelNames = modelsToRun.map((m) => m.model_name);
    const modelRecords = await db
      .select({ id: models.id, model_id: models.model_id })
      .from(models)
      .where(inArray(models.model_id, modelNames));

    // Create a map from model_id string to integer id
    const modelIdMap = new Map<string, number>();
    for (const m of modelRecords) {
      modelIdMap.set(m.model_id, m.id);
    }

    // 4. Ensure test run results exist for all models (or create/update them)
    // We want to "add or replace"
    for (const model of modelsToRun) {
      const modelIntId = modelIdMap.get(model.model_name);
      if (!modelIntId) continue; // Skip if model not found in models table

      const whereConditions = testInfo.is_manual
        ? and(
            eq(testRunResults.test_run_id, testRunId),
            eq(testRunResults.manual_prompt, testInfo.test_prompt),
            eq(testRunResults.model_id, modelIntId),
          )
        : and(
            eq(testRunResults.test_run_id, testRunId),
            eq(testRunResults.test_id, testInfo.test_id as number),
            eq(testRunResults.model_id, modelIntId),
          );

      const existingResult = await db
        .select()
        .from(testRunResults)
        .where(whereConditions)
        .limit(1);

      if (existingResult.length === 0) {
        await db.insert(testRunResults).values({
          test_run_id: testRunId,
          test_id: testInfo.test_id,
          manual_prompt: testInfo.is_manual ? testInfo.test_prompt : null,
          manual_expected_result: testInfo.is_manual
            ? testInfo.expected_result
            : null,
          model_id: modelIntId,
          status: "Pending",
        });
      } else {
        await db
          .update(testRunResults)
          .set({ status: "Pending", updated_at: new Date() })
          .where(eq(testRunResults.id, existingResult[0].id));
      }
    }
    // 5. Run tests in background
    runSingleTestForProfileInBackground(
      testRunId,
      testId,
      modelsToRun,
      profile.system_prompt || "",
    ).catch(console.error);

    revalidatePath("/admin/sessions");
    return { success: true, data: { testRunId } };
  } catch (error) {
    console.error("Error regenerating test result:", error);
    return { success: false, error: "Failed to regenerate test result" };
  }
}

async function runSingleTestForProfileInBackground(
  testRunId: number,
  testId: number | string, // Changed from `test` object to `testId`
  models: { model_name: string }[],
  systemPrompt: string,
) {
  const evaluatorModel = "openai/gpt-4o";

  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> => {
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
    // Get test info (expected result, is_manual)
    let testInfo:
      | { is_manual: boolean; expected_result: string | null; prompt: string }
      | undefined;

    if (typeof testId === "string" && testId.startsWith("manual-")) {
      // For manual tests, we need to find it in the profile's manual_tests
      const testRun = await db
        .select()
        .from(testRuns)
        .where(eq(testRuns.id, testRunId))
        .limit(1);
      if (!testRun[0] || !testRun[0].profile_id) return; // Should not happen if testRunId is valid

      const profile = await getTestProfileWithDetails(testRun[0].profile_id);
      if (!profile) return; // Should not happen

      const manualTest = profile.manual_tests?.find(
        (t) => `manual-${t.prompt}` === testId,
      );
      if (!manualTest) return; // Manual test not found

      testInfo = {
        is_manual: true,
        expected_result: manualTest.expected_result,
        prompt: manualTest.prompt,
      };
    } else {
      const tests = await db
        .select()
        .from(testsTable)
        .where(eq(testsTable.id, Number(testId)))
        .limit(1);

      if (tests[0]) {
        testInfo = {
          is_manual: false,
          expected_result: tests[0].expected_result,
          prompt: tests[0].prompt,
        };
      }
    }

    if (!testInfo) {
      console.error("Test details not found for testId:", testId);
      return;
    }

    const modelPromises = models.map(async (model) => {
      const selectedModel = model.model_name;
      const baseResult = {
        testRunId,
        testId: testInfo.is_manual ? null : Number(testId), // Use null for manual test_id
        manualPrompt: testInfo.is_manual ? testInfo.prompt : undefined,
        modelUsed: selectedModel,
        filterModel: selectedModel,
      };

      try {
        // Update status to running
        await updateTestRunResult({ ...baseResult, status: "Running" });

        const startTime = Date.now();
        const chatResponse = await withTimeout(
          generateChatCompletionWithToolCalls({
            messages: [
              {
                id: `test-${testId}-${Date.now()}`,
                role: "user",
                parts: [{ type: "text", text: testInfo.prompt }],
              },
            ],
            model: selectedModel,
            webSearch: false,
            systemPrompt: systemPrompt,
          }),
          90000,
          "Test execution timed out after 60 seconds",
        );

        const executionTime = Date.now() - startTime;

        if (!chatResponse.text.trim()) {
          throw new Error("No response content received from chat service");
        }

        const evaluationData = {
          ...baseResult,
          output: chatResponse.text,
          toolCalls: chatResponse.toolCalls,
          systemPrompt,
          tokensCost: chatResponse.cost,
          tokenCount: chatResponse.usage?.totalTokens,
          executionTimeMs: executionTime,
        };

        // Update to evaluating
        await updateTestRunResult({ ...evaluationData, status: "Evaluating" });

        // Get expected result
        // The testInfo already contains the expected_result, no need to re-fetch
        const expectedResult = testInfo.expected_result;

        if (expectedResult === undefined || expectedResult === null) {
          throw new Error("Expected result not found");
        }

        // Evaluate
        const evaluation = await evaluateTestResponse(
          testInfo.prompt,
          expectedResult,
          chatResponse.text.trim(),
          evaluatorModel,
        );

        // Final update
        await updateTestRunResult({
          ...evaluationData,
          status: evaluation.status,
          explanation: evaluation.explanation,
          score: evaluation.score,
        });
      } catch (error) {
        console.error(
          `Error processing test ${testId} for model ${selectedModel}:`,
          error,
        );
        await updateTestRunResult({
          ...baseResult,
          status: "Failed",
          output: `Test execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    });

    await Promise.all(modelPromises);

    // If the test run was "Done", keep it "Done". If it was "Running", maybe it's still running other tests?
    // We don't want to accidentally mark the whole run as "Done" if other tests are still pending.
    // However, if we just created it, we should mark it "Done" after completion.
    const testRun = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.id, testRunId))
      .limit(1);
    if (testRun[0]?.status === "Running") {
      // Check if any other results are still pending
      const pendingResults = await db
        .select({ count: count() })
        .from(testRunResults)
        .where(
          and(
            eq(testRunResults.test_run_id, testRunId),
            inArray(testRunResults.status, [
              "Pending",
              "Running",
              "Evaluating",
            ]),
          ),
        );

      if (pendingResults[0]?.count === 0) {
        await updateTestRunStatus(testRunId, "Done");
      }
    }
  } catch (error) {
    console.error("Error in background test execution:", error);
  }
}

export async function reEvaluateSessionAction(
  profileId: number,
  evaluatorModel: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // 1. Get the latest run for this profile
    const runs = await db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(eq(testRuns.profile_id, profileId))
      .orderBy(desc(testRuns.created_at))
      .limit(1);

    if (runs.length === 0) {
      return { success: false, error: "No runs found for this profile" };
    }

    const testRunId = runs[0].id;

    // 2. Get all results for this run
    const results = await db
      .select()
      .from(testRunResults)
      .where(eq(testRunResults.test_run_id, testRunId));

    if (results.length === 0) {
      return {
        success: false,
        error: "No results found for the latest test run",
      };
    }

    // 3. Re-evaluate each result
    const evaluationPromises = results.map(async (result) => {
      // Skip if no output to evaluate
      if (!result.output) return;

      try {
        // Need to get the test prompt and expected result
        let prompt = "";
        let expectedResult = "";

        if (result.manual_prompt) {
          prompt = result.manual_prompt;
          expectedResult = result.manual_expected_result || "";
        } else if (result.test_id) {
          const test = await db
            .select({
              prompt: testsTable.prompt,
              expected_result: testsTable.expected_result,
            })
            .from(testsTable)
            .where(eq(testsTable.id, result.test_id))
            .limit(1);

          if (test[0]) {
            prompt = test[0].prompt;
            expectedResult = test[0].expected_result;
          }
        }

        if (!prompt) return;

        // Update status to Evaluating
        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: "Evaluating",
          filterModelId: result.model_id!,
          evaluatorModel,
        });

        const evaluation = await evaluateTestResponse(
          prompt,
          expectedResult,
          result.output,
          evaluatorModel,
        );

        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: evaluation.status,
          explanation: evaluation.explanation,
          score: evaluation.score,
          filterModelId: result.model_id!,
          evaluatorModel,
        });
      } catch (error) {
        console.error(`Error re-evaluating result ${result.id}:`, error);
        await updateTestRunResult({
          testRunId: result.test_run_id!,
          testId: result.test_id,
          manualPrompt: result.manual_prompt || undefined,
          status: "Failed",
          explanation: "Re-evaluation failed",
          filterModelId: result.model_id!,
          evaluatorModel,
        });
      }
    });

    await Promise.all(evaluationPromises);

    revalidatePath("/admin/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error re-evaluating session:", error);
    return { success: false, error: "Failed to re-evaluate session" };
  }
}
