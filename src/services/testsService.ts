import { db } from "@/lib/db-config";
import { tests, users, testRuns, testRunResults } from "@/lib/db-schema";
import type { SelectTest, SelectTestRun, SelectTestRunResult } from "@/lib/db-schema";
import { eq, desc, count, or, ilike, inArray, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface TestWithUser extends SelectTest {
  username?: string;
  created_by_username?: string;
  latest_test_result_status?: string;
  latest_test_result_created_at?: Date;
}

export interface TestRunWithResults extends SelectTestRun {
  username?: string;
  results: TestRunResultWithTest[];
}

export interface TestRunResultWithTest extends SelectTestRunResult {
  test_name?: string;
}

export interface TestDetails {
  test: TestWithUser;
  latestRun: TestRunWithResults | null;
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
  };
  lastRunAt?: Date;
}

export async function getLatestTestRunResultsForTests(testIds: number[]): Promise<Map<number, { status: string; created_at: Date }>> {
  if (testIds.length === 0) {
    return new Map();
  }

  // Get the latest test run result for each test using Drizzle ORM approach
  const latestResults = await db
    .select({
      test_id: testRunResults.test_id,
      status: testRunResults.status,
      created_at: testRunResults.created_at,
    })
    .from(testRunResults)
    .where(inArray(testRunResults.test_id, testIds))
    .orderBy(desc(testRunResults.created_at));

  // Group by test_id and take the latest result for each test
  const resultMap = new Map<number, { status: string; created_at: Date }>();
  
  for (const result of latestResults) {
    if (!resultMap.has(result.test_id)) {
      resultMap.set(result.test_id, {
        status: result.status,
        created_at: result.created_at
      });
    }
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
  const creatorTable = alias(users, 'creator');

  // Base query conditions
  const baseConditions = searchQuery
    ? or(
        ilike(tests.name, `%${searchQuery}%`),
        ilike(tests.prompt, `%${searchQuery}%`)
      )
    : undefined;

  // Build the query  
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
    })
    .from(tests)
    .leftJoin(userTable, eq(tests.user_id, userTable.id))
    .leftJoin(creatorTable, eq(tests.created_by, creatorTable.id))
    .where(baseConditions);

  // Get total count for pagination
  const totalCountQuery = db
    .select({ count: count() })
    .from(tests)
    .where(baseConditions);

  const totalCountResult = await totalCountQuery;
  const totalCount = totalCountResult[0]?.count || 0;

  // Get paginated results
  const testsData = await query
    .orderBy(desc(tests.created_at))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / limit);

  // Get latest test run results for all tests
  const testIds = testsData.map(test => test.id);
  const latestResults = testIds.length > 0 
    ? await getLatestTestRunResultsForTests(testIds)
    : new Map();

  // Map the results to match the expected interface
  const mappedTests: TestWithUser[] = testsData.map(test => {
    const latestResult = latestResults.get(test.id);
    return {
      ...test,
      username: test.username ?? undefined,
      created_by_username: test.created_by_username ?? undefined,
      latest_test_result_status: latestResult?.status,
      latest_test_result_created_at: latestResult?.created_at,
    };
  });

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
  await db
    .delete(testRunResults)
    .where(eq(testRunResults.test_id, id));
  
  // Then delete the test itself
  const [deletedTest] = await db
    .delete(tests)
    .where(eq(tests.id, id))
    .returning();
  return deletedTest;
}

export async function getTestById(id: number): Promise<TestWithUser | null> {
  const userTable = users;
  const creatorTable = alias(users, 'creator');

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

export async function getTestRunsForTest(testId: number): Promise<TestRunWithResults[]> {
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

    const runIds = testRunsWithThisTest.map(r => r.test_run_id);

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
        results: results.map(result => ({
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

export async function getTestDetails(testId: number): Promise<TestDetails | null> {
  try {
    // Get the test details
    const test = await getTestById(testId);
    if (!test) return null;

    // Get all test runs for this test
    const allRuns = await getTestRunsForTest(testId);
    
    // Get the latest run (first in the ordered list)
    const latestRun = allRuns.length > 0 ? allRuns[0] : null;

    return {
      test,
      latestRun,
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

    // If the test run is still running, return running status
    if (latestRun.status === "Running") {
      return { 
        status: "running",
        lastRunAt: latestRun.launched_at
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
    };

    testResults.forEach(result => {
      if (result.status === "Success") {
        results.success++;
      } else if (result.status === "Failed") {
        results.failed++;
      } else if (result.status === "Evaluating") {
        results.evaluating++;
      } else if (result.status === "Running") {
        results.running++;
      }
    });

    // If there are still running or evaluating tests, consider it running
    const isStillRunning = results.running > 0 || results.evaluating > 0;

    return {
      status: isStillRunning ? "running" : "completed",
      results,
      lastRunAt: latestRun.launched_at
    };
  } catch (error) {
    console.error("Error fetching latest test run stats:", error);
    return { status: "never_run" };
  }
}

// Test running functions
export async function createTestRun(userId: string) {
  const [newTestRun] = await db.insert(testRuns).values({
    user_id: userId,
    status: "Running"
  }).returning();
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

  return result.map(test => ({
    ...test,
    username: test.username ?? undefined,
    created_by_username: undefined // Not needed for this use case
  }));
}

export async function createTestRunResult(
  testRunId: number, 
  testId: number, 
  status: "Running" | "Success" | "Failed" | "Evaluating",
  output?: string,
  explanation?: string
) {
  const [newResult] = await db.insert(testRunResults).values({
    test_run_id: testRunId,
    test_id: testId,
    status,
    output,
    explanation
  }).returning();
  return newResult;
}

export async function updateTestRunResult(
  testRunId: number,
  testId: number,
  status: "Running" | "Success" | "Failed" | "Evaluating",
  output?: string,
  explanation?: string
) {
  const [updatedResult] = await db
    .update(testRunResults)
    .set({ 
      status, 
      output,
      explanation,
      updated_at: new Date() 
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
      updated_at: new Date() 
    })
    .where(eq(testRuns.id, testRunId))
    .returning();
  return updatedRun;
}

export async function getTestRunStatus(testRunId: number) {
  const [testRun] = await db
    .select({
      status: testRuns.status
    })
    .from(testRuns)
    .where(eq(testRuns.id, testRunId))
    .limit(1);
  return testRun?.status;
}

export async function markRemainingTestsAsStopped(testRunId: number, currentTestId: number) {
  // Mark all test run results that are still "Running" (not started yet) as "Stopped"
  const updatedResults = await db
    .update(testRunResults)
    .set({ 
      status: "Stopped",
      output: "Test stopped before execution",
      updated_at: new Date() 
    })
    .where(
      and(
        eq(testRunResults.test_run_id, testRunId),
        eq(testRunResults.status, "Running")
      )
    )
    .returning();
  return updatedResults;
}