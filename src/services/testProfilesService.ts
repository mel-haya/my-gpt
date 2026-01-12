import { db } from "@/lib/db-config";
import { testProfiles, testProfileTests, testProfileModels, tests, systemPrompts, users, testRuns, testRunResults } from "@/lib/db-schema";
import type {
  SelectTestProfile,
  SelectTestProfileWithPrompt,
  SelectTest,
  SelectSystemPrompt,
  InsertTestProfileTest,
  InsertTestProfileModel
} from "@/lib/db-schema";
import { eq, and, desc, ilike, count, sum, avg, sql } from "drizzle-orm";

export interface TestProfilesResponse {
  testProfiles: SelectTestProfileWithPrompt[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface CreateTestProfileData {
  name: string;
  system_prompt_id: number;
  user_id: string;
  test_ids: number[];
  model_configs: string[];
}

export interface UpdateTestProfileData {
  name: string;
  system_prompt_id: number;
  test_ids: number[];
  model_configs: string[];
}

export interface DetailedTestProfile {
  id: number;
  name: string;
  system_prompt_id: number | null;
  system_prompt: string | null;
  system_prompt_name: string | null;
  user_id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
  tests: { test_id: number; test_name: string; test_prompt: string; best_model: string | null; best_score: number | null; }[];
  models: any[];
  total_tokens_cost: number | null;
  average_score: number | null;
}

export async function getTestProfiles(
  options?: {
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<TestProfilesResponse> {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  // Get latest status for each profile
  const latestRunSubquery = db.select({
    profile_id: testRuns.profile_id,
    status: testRuns.status,
    created_at: testRuns.created_at,
  })
    .from(testRuns)
    .orderBy(desc(testRuns.created_at))
    .as('latest_runs');

  // Build base query with join to get system prompt text and latest status
  let baseQuery = db.select({
    id: testProfiles.id,
    name: testProfiles.name,
    system_prompt_id: testProfiles.system_prompt_id,
    system_prompt: systemPrompts.prompt,
    user_id: testProfiles.user_id,
    username: users.username,
    created_at: testProfiles.created_at,
    updated_at: testProfiles.updated_at,
    latest_status: testRuns.status,
  })
    .from(testProfiles)
    .leftJoin(systemPrompts, eq(testProfiles.system_prompt_id, systemPrompts.id))
    .innerJoin(users, eq(testProfiles.user_id, users.id))
    .leftJoin(testRuns, eq(testProfiles.id, testRuns.profile_id));

  let countQuery = db.select({ count: count() })
    .from(testProfiles)
    .innerJoin(users, eq(testProfiles.user_id, users.id));

  // Add search filter if provided
  if (options?.search) {
    const searchCondition = ilike(testProfiles.name, `%${options.search}%`);
    baseQuery = baseQuery.where(searchCondition) as typeof baseQuery;
    countQuery = countQuery.where(searchCondition) as typeof countQuery;
  }

  // Execute queries
  // Since we want the latest status, we need to handle the join carefully to avoid duplicate profiles
  // Using a separate query to fetch latest status for the requested profiles might be cleaner or using a lateral join/distinct on
  // For simplicity with Drizzle/Postgres, let's refine the query to use a subquery for the latest run per profile

  const profilesResult = await db.execute(
    sql`
      SELECT 
        tp.id, 
        tp.name, 
        tp.system_prompt_id, 
        sp.prompt as system_prompt, 
        tp.user_id, 
        u.username, 
        tp.created_at, 
        tp.updated_at,
        (SELECT status FROM test_runs WHERE profile_id = tp.id ORDER BY created_at DESC LIMIT 1) as latest_status
      FROM test_profiles tp
      LEFT JOIN system_prompts sp ON tp.system_prompt_id = sp.id
      INNER JOIN users u ON tp.user_id = u.id
      ${options?.search ? sql`WHERE tp.name ILIKE ${`%${options.search}%`}` : sql``}
      ORDER BY tp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const totalCountResult = await countQuery;
  const profiles = profilesResult.rows as unknown as SelectTestProfileWithPrompt[];

  const totalCount = totalCountResult[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    testProfiles: profiles,
    totalCount,
    totalPages,
    currentPage: page,
  };
}

export async function getTestProfileById(id: number): Promise<SelectTestProfile | null> {
  const result = await db.select().from(testProfiles).where(eq(testProfiles.id, id)).limit(1);
  return result[0] || null;
}

export async function createTestProfile(data: CreateTestProfileData): Promise<SelectTestProfile> {
  try {
    // Create the test profile first
    const [profile] = await db.insert(testProfiles).values({
      name: data.name,
      system_prompt_id: data.system_prompt_id,
      user_id: data.user_id,
    }).returning();

    // Add tests to the profile if provided
    if (data.test_ids.length > 0) {
      try {
        const testProfileTestData: InsertTestProfileTest[] = data.test_ids.map(test_id => ({
          profile_id: profile.id,
          test_id,
        }));
        await db.insert(testProfileTests).values(testProfileTestData);
      } catch (testError) {
        // If adding tests fails, attempt to delete the created profile
        console.error("Failed to add tests to profile, attempting cleanup:", testError);
        try {
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error("Failed to cleanup profile after test insertion error:", cleanupError);
        }
        throw new Error("Failed to create test profile: Unable to add tests");
      }
    }

    // Add model configurations if provided
    if (data.model_configs.length > 0) {
      try {
        const modelConfigData: InsertTestProfileModel[] = data.model_configs.map(model_name => ({
          profile_id: profile.id,
          model_name,
        }));
        await db.insert(testProfileModels).values(modelConfigData);
      } catch (modelError) {
        // If adding models fails, attempt to clean up both profile and tests
        console.error("Failed to add models to profile, attempting cleanup:", modelError);
        try {
          await db.delete(testProfileTests).where(eq(testProfileTests.profile_id, profile.id));
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error("Failed to cleanup profile after model insertion error:", cleanupError);
        }
        throw new Error("Failed to create test profile: Unable to add model configurations");
      }
    }

    return profile;
  } catch (error) {
    console.error("Error creating test profile:", error);
    if (error instanceof Error && error.message.startsWith("Failed to create test profile:")) {
      throw error;
    }
    throw new Error("Failed to create test profile");
  }
}

export async function updateTestProfile(id: number, data: UpdateTestProfileData): Promise<SelectTestProfile> {
  try {
    // Update the test profile
    const [updatedProfile] = await db.update(testProfiles)
      .set({
        name: data.name,
        system_prompt_id: data.system_prompt_id,
        updated_at: new Date(),
      })
      .where(eq(testProfiles.id, id))
      .returning();

    if (!updatedProfile) {
      throw new Error("Test profile not found");
    }

    // Delete existing test associations
    await db.delete(testProfileTests).where(eq(testProfileTests.profile_id, id));

    // Add new test associations
    if (data.test_ids.length > 0) {
      const testProfileTestData: InsertTestProfileTest[] = data.test_ids.map(test_id => ({
        profile_id: id,
        test_id,
      }));
      await db.insert(testProfileTests).values(testProfileTestData);
    }

    // Delete existing model configurations
    await db.delete(testProfileModels).where(eq(testProfileModels.profile_id, id));

    // Add new model configurations
    if (data.model_configs.length > 0) {
      const modelConfigData: InsertTestProfileModel[] = data.model_configs.map(model_name => ({
        profile_id: id,
        model_name,
      }));
      await db.insert(testProfileModels).values(modelConfigData);
    }

    return updatedProfile;
  } catch (error) {
    console.error("Error updating test profile:", error);
    if (error instanceof Error && error.message === "Test profile not found") {
      throw error;
    }
    throw new Error("Failed to update test profile");
  }
}

export async function deleteTestProfile(id: number): Promise<void> {
  await db.delete(testProfiles)
    .where(eq(testProfiles.id, id));
}

export async function getTestsForSelection(): Promise<SelectTest[]> {
  return await db.select().from(tests)
    .orderBy(tests.name);
}

export async function getSystemPromptsForSelection(): Promise<SelectSystemPrompt[]> {
  return await db.select().from(systemPrompts)
    .orderBy(systemPrompts.name);
}

export async function getTestProfileWithDetails(id: number): Promise<DetailedTestProfile | null> {
  // Get profile with system prompt details by joining tables
  const profileResult = await db.select({
    id: testProfiles.id,
    name: testProfiles.name,
    system_prompt_id: testProfiles.system_prompt_id,
    user_id: testProfiles.user_id,
    username: users.username,
    created_at: testProfiles.created_at,
    updated_at: testProfiles.updated_at,
    system_prompt: systemPrompts.prompt,
    system_prompt_name: systemPrompts.name,
  })
    .from(testProfiles)
    .leftJoin(systemPrompts, eq(testProfiles.system_prompt_id, systemPrompts.id))
    .innerJoin(users, eq(testProfiles.user_id, users.id))
    .where(eq(testProfiles.id, id))
    .limit(1);

  if (!profileResult[0]) {
    return null;
  }

  const profile = profileResult[0];

  // Get associated tests
  const profileTests = await db.select({
    test_id: testProfileTests.test_id,
    test_name: tests.name,
    test_prompt: tests.prompt,
  })
    .from(testProfileTests)
    .innerJoin(tests, eq(testProfileTests.test_id, tests.id))
    .where(eq(testProfileTests.profile_id, id));

  // Get all results for all runs of this profile to find the best model for each test
  const allResults = await db.select({
    test_id: testRunResults.test_id,
    model_name: testRunResults.model_used,
    score: testRunResults.score,
    created_at: testRunResults.created_at,
  })
    .from(testRuns)
    .innerJoin(testRunResults, eq(testRuns.id, testRunResults.test_run_id))
    .where(eq(testRuns.profile_id, id));

  const bestResultsMap = new Map<number, { model: string, score: number }>();

  // Group results by test and find the highest score (using the latest result if scores are tied)
  for (const res of allResults) {
    if (res.score === null || res.score === undefined) continue;

    const existing = bestResultsMap.get(res.test_id);
    if (!existing || res.score >= existing.score) {
      bestResultsMap.set(res.test_id, { model: res.model_name || 'N/A', score: res.score });
    }
  }

  const testsWithBest = profileTests.map(t => ({
    ...t,
    best_model: bestResultsMap.get(t.test_id)?.model || null,
    best_score: bestResultsMap.get(t.test_id)?.score ?? null,
  }));

  // Get associated model configurations
  const profileModels = await db.select()
    .from(testProfileModels)
    .where(eq(testProfileModels.profile_id, id));

  // Get aggregated metrics (total cost and average score)
  const metricsResult = await db.select({
    total_cost: sum(testRunResults.tokens_cost),
    avg_score: avg(testRunResults.score),
  })
    .from(testRuns)
    .innerJoin(testRunResults, eq(testRuns.id, testRunResults.test_run_id))
    .where(eq(testRuns.profile_id, id));

  const metrics = metricsResult[0];

  return {
    id: profile.id,
    name: profile.name,
    system_prompt_id: profile.system_prompt_id,
    system_prompt: profile.system_prompt, // Now contains the actual prompt text from the join
    system_prompt_name: profile.system_prompt_name, // Include the system prompt name
    user_id: profile.user_id,
    username: profile.username,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    tests: testsWithBest,
    models: profileModels,
    total_tokens_cost: (metrics?.total_cost !== null && metrics?.total_cost !== undefined) ? Number(metrics.total_cost) : 0,
    average_score: (metrics?.avg_score !== null && metrics?.avg_score !== undefined) ? Number(metrics.avg_score) : null,
  };
}