import { db } from "@/lib/db-config";
import { tests, users, testRuns, testRunResults } from "@/lib/db-schema";
import type {
  SelectTest,
  SelectTestRun,
  SelectTestRunResult,
} from "@/lib/db-schema";
import {
  eq,
  desc,
  count,
  ilike,
  and,
  isNull,
  sql,
  isNotNull,
  ne,
  SQL,
} from "drizzle-orm";
import { generateChatCompletionWithToolCalls } from "@/services/chatService";
import { generateText, Output } from "ai";
import { z } from "zod";

export interface UpdateTestRunResultParams {
  testRunId: number;
  testId?: number | null;
  status: "Running" | "Success" | "Failed" | "Evaluating" | "Pending";
  output?: string;
  explanation?: string;
  toolCalls?: unknown;
  modelId?: number;
  tokensCost?: number;
  tokenCount?: number;
  executionTimeMs?: number;
  score?: number;
  filterModelId?: number;
  evaluatorModel?: string;
}

export interface TestWithUser extends SelectTest {
  username?: string;
  latest_test_result_status?: string;
  latest_test_result_created_at?: Date;
  latest_test_result_output?: string;
}

export interface TestRunWithResults extends SelectTestRun {
  username: string | null;
  results: TestRunResultWithTest[];
}

export type TestRunResultWithTest = SelectTestRunResult;

export interface IndividualTestResult {
  id: number;
  test_run_id?: number | null;
  test_id: number | null;
  output: string | null;
  explanation: string | null;
  score: number | null;
  tool_calls: unknown;
  model_id?: number | null;
  evaluator_model?: string | null;
  tokens_cost: number | null;
  token_count: number | null;
  execution_time_ms: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface TestDetails {
  test: TestWithUser;
  latestRun: TestRunWithResults | null;
  latestIndividualResult: IndividualTestResult | null;
  allRuns: TestRunWithResults[];
}

export interface TestsResult {
  tests: TestWithUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface LatestTestRunStats {
  status: "never_run" | "running" | "completed";
  results?: {
    success: number;
    failed: number;
    evaluating: number;
    running: number;
    pending: number;
  };
  lastRunAt?: Date;
}

export async function getTestCategories(): Promise<string[]> {
  try {
    const results = await db
      .selectDistinct({ category: tests.category })
      .from(tests)
      .where(and(isNotNull(tests.category), ne(tests.category, "")));

    return results
      .map((r) => r.category)
      .filter((c): c is string => c !== null);
  } catch (error) {
    console.error("Error fetching test categories:", error);
    throw new Error("Failed to fetch test categories");
  }
}

export async function getTestsWithPagination(
  searchQuery?: string,
  category?: string,
  limit: number = 10,
  page: number = 1,
): Promise<TestsResult> {
  const offset = (page - 1) * limit;

  // Create aliases for the joins
  const userTable = users;

  // Base query conditions
  const searchCondition = searchQuery
    ? ilike(tests.prompt, `%${searchQuery}%`)
    : undefined;

  const categoryCondition = category ? eq(tests.category, category) : undefined;

  const baseConditions = and(
    searchCondition,
    categoryCondition,
    eq(tests.is_manual, false),
  );

  // Create a subquery for the latest test results using MAX(id) aggregation
  const latestResultIds = db
    .select({
      test_id: testRunResults.test_id,
      max_id: sql<number>`max(${testRunResults.id})`.as("max_id"),
    })
    .from(testRunResults)
    .groupBy(testRunResults.test_id)
    .as("latest_result_ids");

  const latestResultsSubquery = db
    .select({
      test_id: testRunResults.test_id,
      status: testRunResults.status,
      created_at: testRunResults.created_at,
      output: testRunResults.output,
    })
    .from(testRunResults)
    .innerJoin(latestResultIds, eq(testRunResults.id, latestResultIds.max_id))
    .as("latest_results");

  // Build the optimized query with a single JOIN
  const query = db
    .select({
      id: tests.id,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      category: tests.category,
      user_id: tests.user_id,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: userTable.username,
      is_manual: tests.is_manual,
      latest_test_result_status: latestResultsSubquery.status,
      latest_test_result_created_at: latestResultsSubquery.created_at,
      latest_test_result_output: latestResultsSubquery.output,
    })
    .from(tests)
    .leftJoin(userTable, eq(tests.user_id, userTable.id))
    .leftJoin(
      latestResultsSubquery,
      eq(tests.id, latestResultsSubquery.test_id),
    )
    .where(baseConditions);

  // Get total count for pagination (unchanged)
  const totalCountQuery = db
    .select({ count: count() })
    .from(tests)
    .where(baseConditions);

  const totalCountResult = await totalCountQuery;
  const totalCount = totalCountResult[0]?.count || 0;

  // Get paginated results with latest test results in a single query
  const testsData = await query
    .orderBy(desc(tests.created_at))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / limit);

  // Map the results to match the expected interface (no need for additional query)
  const mappedTests: TestWithUser[] = testsData.map((test) => ({
    ...test,
    username: test.username ?? undefined,
    latest_test_result_status: test.latest_test_result_status ?? undefined,
    latest_test_result_created_at:
      test.latest_test_result_created_at ?? undefined,
    latest_test_result_output: test.latest_test_result_output ?? undefined,
  }));

  return {
    tests: mappedTests,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function createTest(testData: {
  prompt: string;
  expected_result: string;
  category?: string;
  user_id: string;
}) {
  const [newTest] = await db.insert(tests).values(testData).returning();
  return newTest;
}

export async function updateTest(
  id: number,
  testData: {
    prompt?: string;
    expected_result?: string;
    category?: string;
  },
) {
  const [updatedTest] = await db
    .update(tests)
    .set({ ...testData, updated_at: new Date() })
    .where(eq(tests.id, id))
    .returning();
  return updatedTest;
}

export async function deleteTest(id: number) {
  // First, delete all related test run results
  await db.delete(testRunResults).where(eq(testRunResults.test_id, id));

  // Then delete the test itself
  const [deletedTest] = await db
    .delete(tests)
    .where(eq(tests.id, id))
    .returning();
  return deletedTest;
}

export async function getTestById(id: number): Promise<TestWithUser | null> {
  const userTable = users;

  const result = await db
    .select({
      id: tests.id,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      category: tests.category,
      user_id: tests.user_id,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: userTable.username,
      is_manual: tests.is_manual,
    })
    .from(tests)
    .leftJoin(userTable, eq(tests.user_id, userTable.id))
    .where(eq(tests.id, id))
    .limit(1);

  if (result.length === 0) return null;

  const test = result[0];
  return {
    ...test,
    username: test.username ?? undefined,
  };
}

export async function getTestRunsForTest(
  testId: number,
): Promise<TestRunWithResults[]> {
  try {
    // Get all test runs and their results in a single query using joins
    const runResultsData = await db
      .select({
        // Test run data
        run_id: testRuns.id,
        run_status: testRuns.status,
        run_launched_at: testRuns.launched_at,
        run_user_id: testRuns.user_id,
        run_created_at: testRuns.created_at,
        run_updated_at: testRuns.updated_at,
        profile_id: testRuns.profile_id,
        username: users.username,
        // Test result data
        result_id: testRunResults.id,
        result_test_run_id: testRunResults.test_run_id,
        result_test_id: testRunResults.test_id,
        result_output: testRunResults.output,
        result_explanation: testRunResults.explanation,
        result_score: testRunResults.score,
        result_tool_calls: testRunResults.tool_calls,
        result_model_id: testRunResults.model_id,
        result_tokens_cost: testRunResults.tokens_cost,
        result_token_count: testRunResults.token_count,
        result_execution_time_ms: testRunResults.execution_time_ms,
        result_status: testRunResults.status,
        result_created_at: testRunResults.created_at,
        result_updated_at: testRunResults.updated_at,
        result_evaluator_model: testRunResults.evaluator_model,
      })
      .from(testRunResults)
      .innerJoin(testRuns, eq(testRunResults.test_run_id, testRuns.id))
      .leftJoin(users, eq(testRuns.user_id, users.id))
      .leftJoin(tests, eq(testRunResults.test_id, tests.id))
      .where(eq(testRunResults.test_id, testId))
      .orderBy(desc(testRuns.created_at));

    if (runResultsData.length === 0) {
      return [];
    }

    // Group the results by test run
    const runMap = new Map<number, TestRunWithResults>();

    for (const row of runResultsData) {
      if (!runMap.has(row.run_id)) {
        runMap.set(row.run_id, {
          id: row.run_id,
          profile_id: row.profile_id,
          status: row.run_status,
          launched_at: row.run_launched_at,
          user_id: row.run_user_id,
          created_at: row.run_created_at,
          updated_at: row.run_updated_at,
          username: row.username,
          results: [],
        });
      }

      const run = runMap.get(row.run_id)!;
      run.results.push({
        id: row.result_id,
        test_run_id: row.result_test_run_id,
        test_id: row.result_test_id,
        output: row.result_output,
        explanation: row.result_explanation,
        score: row.result_score,
        tool_calls: row.result_tool_calls,
        model_id: row.result_model_id,
        tokens_cost: row.result_tokens_cost,
        token_count: row.result_token_count,
        execution_time_ms: row.result_execution_time_ms,
        status: row.result_status,
        created_at: row.result_created_at,
        updated_at: row.result_updated_at,
        evaluator_model: row.result_evaluator_model,
      });
    }

    return Array.from(runMap.values());
  } catch (error) {
    console.error("Error fetching test runs:", error);
    return [];
  }
}

async function getLatestIndividualTestResult(
  testId: number,
): Promise<IndividualTestResult | null> {
  try {
    const result = await db
      .select({
        id: testRunResults.id,
        test_run_id: testRunResults.test_run_id,
        test_id: testRunResults.test_id,
        output: testRunResults.output,
        explanation: testRunResults.explanation,
        score: testRunResults.score,
        tool_calls: testRunResults.tool_calls,
        model_id: testRunResults.model_id,
        evaluator_model: testRunResults.evaluator_model,
        tokens_cost: testRunResults.tokens_cost,
        token_count: testRunResults.token_count,
        execution_time_ms: testRunResults.execution_time_ms,
        status: testRunResults.status,
        created_at: testRunResults.created_at,
        updated_at: testRunResults.updated_at,
      })
      .from(testRunResults)
      .where(
        and(
          eq(testRunResults.test_id, testId),
          isNull(testRunResults.test_run_id),
        ),
      )
      .orderBy(desc(testRunResults.created_at), desc(testRunResults.id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching latest individual test result:", error);
    return null;
  }
}

export async function getTestDetails(
  testId: number,
): Promise<TestDetails | null> {
  try {
    // Get the test details
    const test = await getTestById(testId);
    if (!test) return null;

    // Get all test runs for this test
    const allRuns = await getTestRunsForTest(testId);

    // Get the latest run (first in the ordered list)
    const latestRun = allRuns.length > 0 ? allRuns[0] : null;

    // Get the latest individual test result (with null test_run_id)
    const latestIndividualResult = await getLatestIndividualTestResult(testId);

    return {
      test,
      latestRun,
      latestIndividualResult,
      allRuns,
    };
  } catch (error) {
    console.error("Error fetching test details:", error);
    return null;
  }
}

export async function getLatestTestRunStats(): Promise<LatestTestRunStats> {
  try {
    // Get the most recent test run
    const latestTestRun = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        launched_at: testRuns.launched_at,
        created_at: testRuns.created_at,
      })
      .from(testRuns)
      .orderBy(desc(testRuns.created_at))
      .limit(1);

    if (latestTestRun.length === 0) {
      return { status: "never_run" };
    }

    const latestRun = latestTestRun[0];

    // If the test run is still running, get the current progress and return it
    if (latestRun.status === "Running") {
      // Get current test results for this run to show progress
      const testResults = await db
        .select({
          status: testRunResults.status,
        })
        .from(testRunResults)
        .where(eq(testRunResults.test_run_id, latestRun.id));

      // Count results by status
      const results = {
        success: 0,
        failed: 0,
        evaluating: 0,
        running: 0,
        pending: 0,
      };

      testResults.forEach((result) => {
        if (result.status === "Success") {
          results.success++;
        } else if (result.status === "Failed") {
          results.failed++;
        } else if (result.status === "Evaluating") {
          results.evaluating++;
        } else if (result.status === "Running") {
          results.running++;
        } else if (result.status === "Pending") {
          results.pending++;
        }
      });

      return {
        status: "running",
        lastRunAt: latestRun.launched_at,
        results: results,
      };
    }

    // Get all test results for the latest run
    const testResults = await db
      .select({
        status: testRunResults.status,
      })
      .from(testRunResults)
      .where(eq(testRunResults.test_run_id, latestRun.id));

    // Count results by status
    const results = {
      success: 0,
      failed: 0,
      evaluating: 0,
      running: 0,
      pending: 0,
    };

    testResults.forEach((result) => {
      if (result.status === "Success") {
        results.success++;
      } else if (result.status === "Failed") {
        results.failed++;
      } else if (result.status === "Evaluating") {
        results.evaluating++;
      } else if (result.status === "Running") {
        results.running++;
      } else if (result.status === "Pending") {
        results.pending++;
      }
    });

    // If there are still running, evaluating, or pending tests, consider it running
    const isStillRunning =
      results.running > 0 || results.evaluating > 0 || results.pending > 0;

    return {
      status: isStillRunning ? "running" : "completed",
      results,
      lastRunAt: latestRun.launched_at,
    };
  } catch (error) {
    console.error("Error fetching latest test run stats:", error);
    return { status: "never_run" };
  }
}

// Test running functions
export async function createTestRun(userId: string) {
  const [newTestRun] = await db
    .insert(testRuns)
    .values({
      user_id: userId,
      status: "Running",
    })
    .returning();
  return newTestRun;
}

export async function getAllTests(): Promise<TestWithUser[]> {
  const result = await db
    .select({
      id: tests.id,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      user_id: tests.user_id,
      category: tests.category,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: users.username,
      is_manual: tests.is_manual,
    })
    .from(tests)
    .leftJoin(users, eq(tests.user_id, users.id))
    .where(eq(tests.is_manual, false))
    .orderBy(tests.id);

  return result.map((test) => ({
    ...test,
    username: test.username ?? undefined,
  }));
}

export async function createAllTestRunResults(
  testRunId: number,
  testIds: number[],
) {
  const values = testIds.map((testId) => ({
    test_run_id: testRunId,
    test_id: testId,
    status: "Pending" as const,
    output: null,
    explanation: null,
  }));

  const newResults = await db.insert(testRunResults).values(values).returning();

  return newResults;
}

export async function updateTestRunResult({
  testRunId,
  testId,
  status,
  output,
  explanation,
  toolCalls,
  modelId,
  tokensCost,
  tokenCount,
  executionTimeMs,
  score,
  filterModelId,
  evaluatorModel,
}: UpdateTestRunResultParams) {
  const whereConditions = [
    eq(testRunResults.test_run_id, testRunId),
    filterModelId ? eq(testRunResults.model_id, filterModelId) : undefined,
  ];

  if (testId !== undefined && testId !== null) {
    whereConditions.push(eq(testRunResults.test_id, testId as number));
  }

  const [updatedResult] = await db
    .update(testRunResults)
    .set({
      status: status,
      output: output,
      explanation: explanation,
      score: score,
      tool_calls: toolCalls,
      model_id: modelId,
      tokens_cost: tokensCost,
      token_count: tokenCount,
      execution_time_ms: executionTimeMs,
      evaluator_model: evaluatorModel,
      updated_at: new Date(),
    })
    .where(and(...whereConditions.filter((c): c is SQL => c !== undefined)))
    .returning();
  return updatedResult;
}

export async function updateTestRunStatus(
  testRunId: number,
  status: "Running" | "Failed" | "Done" | "Stopped",
) {
  const [updatedRun] = await db
    .update(testRuns)
    .set({
      status,
      updated_at: new Date(),
    })
    .where(eq(testRuns.id, testRunId))
    .returning();
  return updatedRun;
}

export async function getTestRunStatus(testRunId: number) {
  const [testRun] = await db
    .select({
      status: testRuns.status,
    })
    .from(testRuns)
    .where(eq(testRuns.id, testRunId))
    .limit(1);
  return testRun?.status;
}

export async function evaluateTestResponse(
  originalPrompt: string,
  expectedResult: string,
  aiResponse: string,
  evaluatorModel: string,
): Promise<{
  status: "Success" | "Failed";
  explanation: string;
  score: number;
}> {
  // Define evaluation schema with score restricted to 0, 5, or 10
  const evaluationSchema = z.object({
    score: z
      .number()
      .refine((val) => val === 0 || val === 5 || val === 10, {
        message: "Score must be exactly 0, 5, or 10",
      })
      .describe(
        "Score must be ONLY 0, 5, or 10: 0 = failed/misleading, 5 = partial/some issues, 10 = success/comprehensive",
      ),
    explanation: z
      .string()
      .describe("Brief explanation of the score and why it was given"),
  });

  // Evaluate the response using generateObject with system prompt
  const { output: evaluation } = await generateText({
    model: evaluatorModel,
    system: `You are an AI response evaluator. Your job is to score the AI's response using ONLY these three values: 0, 5, or 10.

**Scoring Guidelines:**
- **0 (Failed):** Misleading, inaccurate, completely wrong information, or major inaccuracies. Not helpful to the user.
- **5 (Partial):** Some correct information but missing key details or has minor inaccuracies. Partially helpful.
- **10 (Success):** Contains sufficient correct information to fully address the user's needs. Accurate and helpful.

**Evaluation Criteria:**
1. **Accuracy:** How correct is the information compared to the expected response?
2. **Sufficiency:** Does the response provide enough valid information to answer the user's question?
3. **Helpfulness:** How useful is the response for answering the original prompt?
4. **Clarity:** Is the response clear and understandable?

**Critical Guidelines:**
- When the expected response contains MULTIPLE VALID ALTERNATIVES (e.g., multiple phone numbers, emails, hours), the AI does NOT need to list all of them. Providing at least ONE valid option is sufficient for a full score.
- Paraphrasing and alternative wording are acceptable if the meaning is preserved
- Minor additional clarifications are acceptable and can even improve the score
- Focus on whether the user gets ENOUGH correct information to fulfill their request
- Do not penalize for omitting redundant alternatives when one valid option is provided
- Remember: Your final score MUST be exactly 0, 5, or 10`,
    prompt: `Evaluate this AI response:

Original Test Prompt: "${originalPrompt}"

Expected Response: "${expectedResult}"

AI Response: "${aiResponse}"

Score this response using ONLY 0, 5, or 10 based on accuracy, completeness, and helpfulness.`,
    output: Output.object({ schema: evaluationSchema }),
  });

  // Set status based on evaluation score (10 is Success, 0 or 5 is Failed)
  const status = evaluation.score === 10 ? "Success" : "Failed";
  const explanation = `Score: ${evaluation.score}/10\nExplanation: ${evaluation.explanation}`;

  return { status, explanation, score: evaluation.score };
}

export async function runSingleTest(
  testId: number,
  evaluatorModel: string = "openai/gpt-4o",
): Promise<{
  id: number;
  output: string;
  status: string;
  explanation?: string;
}> {
  // Get the test details
  const test = await db
    .select()
    .from(tests)
    .where(eq(tests.id, testId))
    .limit(1);

  if (!test || test.length === 0) {
    throw new Error("Test not found");
  }

  const testData = test[0];

  // Execute the test using the actual AI service
  let output: string;
  let status: string;
  let explanation: string | undefined;
  let score: number | undefined;
  let toolCalls: unknown = undefined;
  let tokensCost: number | undefined;
  let tokenCount: number | undefined;
  let executionTimeMs: number | undefined;

  const startTime = Date.now();

  try {
    // Call the AI service with the test prompt
    const chatResponse = await generateChatCompletionWithToolCalls({
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: testData.prompt }],
        },
      ],
      model: "openai/gpt-4o", // Default model, could be configurable
    });

    output = chatResponse.text;
    toolCalls = chatResponse.toolCalls;
    tokensCost = chatResponse.cost;
    tokenCount = chatResponse.usage?.totalTokens;

    if (!output.trim()) {
      throw new Error("No response content received from chat service");
    }

    // Evaluate the response using the new evaluation function
    const evaluation = await evaluateTestResponse(
      testData.prompt,
      testData.expected_result,
      output.trim(),
      evaluatorModel,
    );

    status = evaluation.status;
    explanation = evaluation.explanation;
    score = evaluation.score;

    executionTimeMs = Date.now() - startTime;
  } catch (error) {
    executionTimeMs = Date.now() - startTime;
    output = `Test execution failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    status = "Failed";
    explanation = "Test execution failed due to an error";
  }

  // Create the test run result with null test_run_id
  const result = await db
    .insert(testRunResults)
    .values({
      test_run_id: null,
      test_id: testId,
      output: output,
      explanation: explanation,
      score: score,
      tool_calls: toolCalls,
      tokens_cost: tokensCost,
      token_count: tokenCount,
      execution_time_ms: executionTimeMs,
      status: status as SelectTestRunResult["status"],
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return {
    id: result[0].id,
    output: result[0].output || "",
    status: result[0].status,
    explanation: result[0].explanation || undefined,
  };
}

/**
 * Awards victories for all tests in a completed test run.
 * For each unique test (test_id or manual_prompt), finds all models that scored 10,
 * then determines the winner by: best score → lowest cost → fastest execution time.
 * The winner's victories count is incremented.
 */
export async function awardVictoriesForTestRun(
  testRunId: number,
): Promise<void> {
  try {
    // Get all results for this test run with score == 10
    const results = await db
      .select({
        id: testRunResults.id,
        test_id: testRunResults.test_id,
        model_id: testRunResults.model_id,
        score: testRunResults.score,
        tokens_cost: testRunResults.tokens_cost,
        execution_time_ms: testRunResults.execution_time_ms,
      })
      .from(testRunResults)
      .where(
        and(
          eq(testRunResults.test_run_id, testRunId),
          sql`${testRunResults.score} = 10`,
        ),
      );

    if (results.length === 0) {
      return; // No qualifying results
    }

    // Group results by test (test_id)
    const testGroups = new Map<string, typeof results>();

    for (const result of results) {
      if (!result.test_id) continue;

      const key = `test_${result.test_id}`;

      if (!testGroups.has(key)) {
        testGroups.set(key, []);
      }
      testGroups.get(key)!.push(result);
    }

    // For each test, determine the winner and award victory
    const { incrementModelVictory } = await import("@/services/modelsService");

    for (const [, competitors] of testGroups) {
      if (competitors.length === 0) continue;

      // Sort by: score DESC, cost ASC, execution_time ASC
      competitors.sort((a, b) => {
        // Higher score wins
        const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;

        // Lower cost wins
        const costDiff =
          (a.tokens_cost ?? Infinity) - (b.tokens_cost ?? Infinity);
        if (costDiff !== 0) return costDiff;

        // Lower execution time wins
        return (
          (a.execution_time_ms ?? Infinity) - (b.execution_time_ms ?? Infinity)
        );
      });

      const winner = competitors[0];
      if (winner.model_id) {
        await incrementModelVictory(winner.model_id);
      }
    }
  } catch (error) {
    console.error("Error awarding victories for test run:", error);
    // Don't throw - victory calculation failure shouldn't fail the test run
  }
}
