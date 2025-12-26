import { db } from "@/lib/db-config";
import { tests, users } from "@/lib/db-schema";
import type { SelectTest } from "@/lib/db-schema";
import { eq, desc, sql, count, or, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface TestWithUser extends SelectTest {
  username?: string;
  created_by_username?: string;
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

  // Map the results to match the expected interface
  const mappedTests: TestWithUser[] = testsData.map(test => ({
    ...test,
    username: test.username ?? undefined,
    created_by_username: test.created_by_username ?? undefined,
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
  const [deletedTest] = await db
    .delete(tests)
    .where(eq(tests.id, id))
    .returning();
  return deletedTest;
}