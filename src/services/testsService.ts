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
  or,
  ilike,
  inArray,
  and,
  isNull,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateChatCompletionWithToolCalls } from "@/services/chatService";
import { generateObject } from "ai";
import { z } from "zod";

export interface TestWithUser extends SelectTest {
  username?: string;
  created_by_username?: string;
  latest_test_result_status?: string;
  latest_test_result_created_at?: Date;
  latest_test_result_output?: string;
}

export interface TestRunWithResults extends SelectTestRun {
  username?: string;
  results: TestRunResultWithTest[];
}

export interface TestRunResultWithTest extends SelectTestRunResult {
  test_name?: string;
}

export interface IndividualTestResult {
  id: number;
  test_id: number;
  output: string | null;
  explanation: string | null;
  tool_calls: unknown;
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

export async function getLatestTestRunResultsForTests(
  testIds: number[]
): Promise<Map<number, { status: string; created_at: Date; output?: string }>> {
  if (testIds.length === 0) {
    return new Map();
  }

  // Create subquery to find the latest created_at for each test_id
  const latestTimestamps = db
    .select({
      test_id: testRunResults.test_id,
      max_created_at: sql<Date>`max(${testRunResults.created_at})`.as(
        "max_created_at"
      ),
      max_id: sql<number>`max(${testRunResults.id})`.as("max_id"),
    })
    .from(testRunResults)
    .where(inArray(testRunResults.test_id, testIds))
    .groupBy(testRunResults.test_id)
    .as("latest_timestamps");

  // Join with the original table to get full records
  const latestResults = await db
    .select({
      test_id: testRunResults.test_id,
      status: testRunResults.status,
      created_at: testRunResults.created_at,
      output: testRunResults.output,
    })
    .from(testRunResults)
    .innerJoin(
      latestTimestamps,
      and(
        eq(testRunResults.test_id, latestTimestamps.test_id),
        eq(testRunResults.created_at, latestTimestamps.max_created_at)
      )
    );

  // Convert to Map format
  const resultMap = new Map<
    number,
    { status: string; created_at: Date; output?: string }
  >();

  for (const result of latestResults) {
    resultMap.set(result.test_id, {
      status: result.status,
      created_at: result.created_at,
      output: result.output || undefined,
    });
  }

  return resultMap;
}

export async function getTestsWithPagination(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<TestsResult> {
  const offset = (page - 1) * limit;

  // Create aliases for the joins
  const userTable = users;
  const creatorTable = alias(users, "creator");

  // Base query conditions
  const baseConditions = searchQuery
    ? or(
        ilike(tests.name, `%${searchQuery}%`),
        ilike(tests.prompt, `%${searchQuery}%`)
      )
    : undefined;

  // Create a subquery for the latest test results using MAX aggregation
  const latestTimestamps = db
    .select({
      test_id: testRunResults.test_id,
      max_created_at: sql<Date>`max(${testRunResults.created_at})`.as(
        "max_created_at"
      ),
    })
    .from(testRunResults)
    .groupBy(testRunResults.test_id)
    .as("latest_timestamps");

  const latestResultsSubquery = db
    .select({
      test_id: testRunResults.test_id,
      status: testRunResults.status,
      created_at: testRunResults.created_at,
      output: testRunResults.output,
    })
    .from(testRunResults)
    .innerJoin(
      latestTimestamps,
      and(
        eq(testRunResults.test_id, latestTimestamps.test_id),
        eq(testRunResults.created_at, latestTimestamps.max_created_at)
      )
    )
    .as("latest_results");

  // Build the optimized query with a single JOIN
  const query = db
    .select({
      id: tests.id,
      name: tests.name,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      user_id: tests.user_id,
      created_by: tests.created_by,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: userTable.username,
      created_by_username: creatorTable.username,
      latest_test_result_status: latestResultsSubquery.status,
      latest_test_result_created_at: latestResultsSubquery.created_at,
      latest_test_result_output: latestResultsSubquery.output,
    })
    .from(tests)
    .leftJoin(userTable, eq(tests.user_id, userTable.id))
    .leftJoin(creatorTable, eq(tests.created_by, creatorTable.id))
    .leftJoin(
      latestResultsSubquery,
      eq(tests.id, latestResultsSubquery.test_id)
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
    created_by_username: test.created_by_username ?? undefined,
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
  name: string;
  prompt: string;
  expected_result: string;
  user_id: string;
  created_by: string;
}) {
  const [newTest] = await db.insert(tests).values(testData).returning();
  return newTest;
}

export async function updateTest(
  id: number,
  testData: {
    name?: string;
    prompt?: string;
    expected_result?: string;
  }
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
  const creatorTable = alias(users, "creator");

  const result = await db
    .select({
      id: tests.id,
      name: tests.name,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      user_id: tests.user_id,
      created_by: tests.created_by,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: userTable.username,
      created_by_username: creatorTable.username,
    })
    .from(tests)
    .leftJoin(userTable, eq(tests.user_id, userTable.id))
    .leftJoin(creatorTable, eq(tests.created_by, creatorTable.id))
    .where(eq(tests.id, id))
    .limit(1);

  if (result.length === 0) return null;

  const test = result[0];
  return {
    ...test,
    username: test.username ?? undefined,
    created_by_username: test.created_by_username ?? undefined,
  };
}

export async function getTestRunsForTest(
  testId: number
): Promise<TestRunWithResults[]> {
  try {
    // First, get all test runs that have results for this specific test
    const testRunsWithThisTest = await db
      .select({ test_run_id: testRunResults.test_run_id })
      .from(testRunResults)
      .where(eq(testRunResults.test_id, testId))
      .groupBy(testRunResults.test_run_id);

    if (testRunsWithThisTest.length === 0) {
      return [];
    }

    const runIds = testRunsWithThisTest
      .map((r) => r.test_run_id)
      .filter((id): id is number => id !== null);

    // Get the actual test runs
    const runs = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        launched_at: testRuns.launched_at,
        user_id: testRuns.user_id,
        created_at: testRuns.created_at,
        updated_at: testRuns.updated_at,
        username: users.username,
      })
      .from(testRuns)
      .leftJoin(users, eq(testRuns.user_id, users.id))
      .where(inArray(testRuns.id, runIds))
      .orderBy(desc(testRuns.created_at));

    // Get results for these runs
    const runDetails: TestRunWithResults[] = [];

    for (const run of runs) {
      const results = await db
        .select({
          id: testRunResults.id,
          test_run_id: testRunResults.test_run_id,
          test_id: testRunResults.test_id,
          output: testRunResults.output,
          explanation: testRunResults.explanation,
          tool_calls: testRunResults.tool_calls,
          status: testRunResults.status,
          created_at: testRunResults.created_at,
          updated_at: testRunResults.updated_at,
          test_name: tests.name,
        })
        .from(testRunResults)
        .leftJoin(tests, eq(testRunResults.test_id, tests.id))
        .where(eq(testRunResults.test_run_id, run.id));

      runDetails.push({
        ...run,
        username: run.username ?? undefined,
        results: results.map((result) => ({
          ...result,
          test_name: result.test_name ?? undefined,
        })),
      });
    }

    return runDetails;
  } catch (error) {
    console.error("Error fetching test runs:", error);
    return [];
  }
}

async function getLatestIndividualTestResult(
  testId: number
): Promise<IndividualTestResult | null> {
  try {
    const result = await db
      .select({
        id: testRunResults.id,
        test_id: testRunResults.test_id,
        output: testRunResults.output,
        explanation: testRunResults.explanation,
        tool_calls: testRunResults.tool_calls,
        status: testRunResults.status,
        created_at: testRunResults.created_at,
        updated_at: testRunResults.updated_at,
      })
      .from(testRunResults)
      .where(
        and(
          eq(testRunResults.test_id, testId),
          isNull(testRunResults.test_run_id)
        )
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
  testId: number
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
    const isStillRunning = results.running > 0 || results.evaluating > 0 || results.pending > 0;

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
      name: tests.name,
      prompt: tests.prompt,
      expected_result: tests.expected_result,
      user_id: tests.user_id,
      created_by: tests.created_by,
      created_at: tests.created_at,
      updated_at: tests.updated_at,
      username: users.username,
    })
    .from(tests)
    .leftJoin(users, eq(tests.user_id, users.id))
    .orderBy(tests.id);

  return result.map((test) => ({
    ...test,
    username: test.username ?? undefined,
    created_by_username: undefined, // Not needed for this use case
  }));
}

export async function createTestRunResult(
  testRunId: number,
  testId: number,
  status: "Running" | "Success" | "Failed" | "Evaluating" | "Pending",
  output?: string,
  explanation?: string
) {
  const [newResult] = await db
    .insert(testRunResults)
    .values({
      test_run_id: testRunId,
      test_id: testId,
      status,
      output,
      explanation,
    })
    .returning();
  return newResult;
}

export async function createAllTestRunResults(
  testRunId: number,
  testIds: number[]
) {
  const values = testIds.map(testId => ({
    test_run_id: testRunId,
    test_id: testId,
    status: "Pending" as const,
    output: null,
    explanation: null,
  }));

  const newResults = await db
    .insert(testRunResults)
    .values(values)
    .returning();
  
  return newResults;
}

export async function updateTestRunResult(
  testRunId: number,
  testId: number,
  status: "Running" | "Success" | "Failed" | "Evaluating" | "Pending",
  output?: string,
  explanation?: string,
  toolCalls?: unknown
) {
  const [updatedResult] = await db
    .update(testRunResults)
    .set({
      status,
      output,
      explanation,
      tool_calls: toolCalls,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(testRunResults.test_run_id, testRunId),
        eq(testRunResults.test_id, testId)
      )
    )
    .returning();
  return updatedResult;
}

export async function updateTestRunStatus(
  testRunId: number,
  status: "Running" | "Failed" | "Done" | "Stopped"
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

export async function markRemainingTestsAsStopped(
  testRunId: number,
) {
  // Mark all test run results that are still "Pending" (not started yet) as "Stopped"
  const updatedResults = await db
    .update(testRunResults)
    .set({
      status: "Stopped",
      output: "Test stopped before execution",
      updated_at: new Date(),
    })
    .where(
      and(
        eq(testRunResults.test_run_id, testRunId),
        eq(testRunResults.status, "Pending")
      )
    )
    .returning();
  return updatedResults;
}

export async function evaluateTestResponse(
  originalPrompt: string,
  expectedResult: string,
  aiResponse: string,
  evaluatorModel: string = "openai/gpt-4o"
): Promise<{ status: "Success" | "Failed"; explanation: string }> {
  // Define evaluation schema with simple enum output
  const evaluationSchema = z.object({
    result: z
      .enum(["success", "fail"])
      .describe(
        "Whether the AI response is helpful and provides expected information"
      ),
    explanation: z
      .string()
      .describe("Brief explanation of why it passed or failed"),
  });

  // Evaluate the response using generateObject with system prompt
  const { object: evaluation } = await generateObject({
    model: evaluatorModel,
    system: `You are an AI response evaluator. Your job is to judge whether the AI’s response is:
1. Short and concise.
2. Contains the essential information from the expected response.
3. Helpful and relevant to the original prompt.

Return "success" if:
- The AI includes the key information present in the expected response (paraphrasing allowed).
- The answer is generally concise and on-topic.
- Minor wording differences, additional small clarifications, or alternative phrasing are acceptable.

Return "fail" if:
- The key information from the expected response is missing or incorrect.
- The response is overly long, off-topic, or confusing.
- The AI invents details not supported by the expected response.
- The response avoids answering the prompt.

Be fair and balanced: do not require exact wording, but do require that the essential meaning matches.`,
    prompt: `Evaluate this AI response:

Original Test Prompt: "${originalPrompt}"

Expected Response: "${expectedResult}"

AI Response: "${aiResponse}"

Determine if this is a success or fail.`,
    schema: evaluationSchema,
  });

  // Set status based on evaluation result
  const status = evaluation.result === "success" ? "Success" : "Failed";
  const explanation = `Result: ${evaluation.result}\nExplanation: ${evaluation.explanation}`;

  return { status, explanation };
}

export async function runSingleTest(
  testId: number,
  evaluatorModel: string = "openai/gpt-4o"
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
  let toolCalls: unknown = undefined;

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

    if (!output.trim()) {
      throw new Error("No response content received from chat service");
    }

    // Evaluate the response using the new evaluation function
    const evaluation = await evaluateTestResponse(
      testData.prompt,
      testData.expected_result,
      output.trim(),
      evaluatorModel
    );

    status = evaluation.status;
    explanation = evaluation.explanation;
  } catch (error) {
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
      tool_calls: toolCalls,
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
