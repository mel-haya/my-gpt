import { db } from "@/lib/db-config";
import {
  testProfiles,
  testProfileTests,
  testProfileModels,
  tests,
  systemPrompts,
  users,
  testRuns,
  testRunResults,
} from "@/lib/db-schema";
import type {
  SelectTestProfile,
  SelectTestProfileWithPrompt,
  SelectTest,
  SelectSystemPrompt,
  InsertTestProfileTest,
  InsertTestProfileModel,
  SelectTestProfileModel,
} from "@/lib/db-schema";
import { eq, and, ilike, count, sql, inArray } from "drizzle-orm";

export interface TestProfilesResponse {
  testProfiles: SelectTestProfileWithPrompt[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface ManualTest {
  prompt: string;
  expected_result: string;
}

export interface CreateTestProfileData {
  name: string;
  system_prompt_id: number;
  user_id: string;
  test_ids: number[];
  model_configs: string[];
  manual_tests?: ManualTest[];
}

export interface UpdateTestProfileData {
  name: string;
  system_prompt_id: number;
  test_ids: number[];
  model_configs: string[];
  manual_tests?: ManualTest[];
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
  tests: {
    test_id: number | string;
    test_prompt: string;
    expected_result: string;
    best_model: string | null;
    best_score: number | null;
    is_manual?: boolean;
  }[];
  models: SelectTestProfileModel[];
  total_tokens_cost: number | null;
  total_tokens: number | null;
  average_score: number | null;
  manual_tests: ManualTest[] | null;
}

export async function getTestProfiles(options?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TestProfilesResponse> {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  // Build base query with join to get system prompt text and latest status
  // The actual query is executed using sql`...` below, so this Drizzle query is unused.
  // let baseQuery = db
  //   .select({
  //     id: testProfiles.id,
  //     name: testProfiles.name,
  //     system_prompt_id: testProfiles.system_prompt_id,
  //     system_prompt: systemPrompts.prompt,
  //     user_id: testProfiles.user_id,
  //     username: users.username,
  //     created_at: testProfiles.created_at,
  //     updated_at: testProfiles.updated_at,
  //     latest_status: testRuns.status,
  //   })
  //   .from(testProfiles)
  //   .leftJoin(
  //     systemPrompts,
  //     eq(testProfiles.system_prompt_id, systemPrompts.id)
  //   )
  //   .innerJoin(users, eq(testProfiles.user_id, users.id))
  //   .leftJoin(testRuns, eq(testProfiles.id, testRuns.profile_id));

  let countQuery = db
    .select({ count: count() })
    .from(testProfiles)
    .innerJoin(users, eq(testProfiles.user_id, users.id));

  // Add search filter if provided
  if (options?.search) {
    const searchCondition = ilike(testProfiles.name, `%${options.search}%`);
    // baseQuery = baseQuery.where(searchCondition) as typeof baseQuery; // This line used the unused baseQuery
    countQuery = countQuery.where(searchCondition) as typeof countQuery;
  }

  // Execute queries

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
      ${
        options?.search
          ? sql`WHERE tp.name ILIKE ${`%${options.search}%`}`
          : sql``
      }
      ORDER BY tp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const totalCountResult = await countQuery;
  const profiles =
    profilesResult.rows as unknown as SelectTestProfileWithPrompt[];

  const totalCount = totalCountResult[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    testProfiles: profiles,
    totalCount,
    totalPages,
    currentPage: page,
  };
}

export async function getTestProfileById(
  id: number
): Promise<SelectTestProfile | null> {
  const result = await db
    .select()
    .from(testProfiles)
    .where(eq(testProfiles.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getTestProfileByName(
  name: string,
  userId: string
): Promise<SelectTestProfile | null> {
  const result = await db
    .select()
    .from(testProfiles)
    .where(and(eq(testProfiles.name, name), eq(testProfiles.user_id, userId)))
    .limit(1);
  return result[0] || null;
}

export async function createTestProfile(
  data: CreateTestProfileData
): Promise<SelectTestProfile> {
  try {
    // Create the test profile first
    const [profile] = await db
      .insert(testProfiles)
      .values({
        name: data.name,
        system_prompt_id: data.system_prompt_id,
        user_id: data.user_id,
        manual_tests: data.manual_tests,
      })
      .returning();

    // Add tests to the profile if provided
    if (data.test_ids.length > 0) {
      try {
        const testProfileTestData: InsertTestProfileTest[] = data.test_ids.map(
          (test_id) => ({
            profile_id: profile.id,
            test_id,
          })
        );
        await db.insert(testProfileTests).values(testProfileTestData);
      } catch (testError) {
        // If adding tests fails, attempt to delete the created profile
        console.error(
          "Failed to add tests to profile, attempting cleanup:",
          testError
        );
        try {
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup profile after test insertion error:",
            cleanupError
          );
        }
        throw new Error("Failed to create test profile: Unable to add tests");
      }
    }

    // Add model configurations if provided
    if (data.model_configs.length > 0) {
      try {
        const modelConfigData: InsertTestProfileModel[] =
          data.model_configs.map((model_name) => ({
            profile_id: profile.id,
            model_name,
          }));
        await db.insert(testProfileModels).values(modelConfigData);
      } catch (modelError) {
        // If adding models fails, attempt to clean up both profile and tests
        console.error(
          "Failed to add models to profile, attempting cleanup:",
          modelError
        );
        try {
          await db
            .delete(testProfileTests)
            .where(eq(testProfileTests.profile_id, profile.id));
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup profile after model insertion error:",
            cleanupError
          );
        }
        throw new Error(
          "Failed to create test profile: Unable to add model configurations"
        );
      }
    }

    return profile;
  } catch (error) {
    console.error("Error creating test profile:", error);
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to create test profile:")
    ) {
      throw error;
    }
    throw new Error("Failed to create test profile");
  }
}

export async function updateTestProfile(
  id: number,
  data: UpdateTestProfileData
): Promise<SelectTestProfile> {
  try {
    // 1. Identify models to be removed FIRST before any deletions
    const existingModels = await db
      .select()
      .from(testProfileModels)
      .where(eq(testProfileModels.profile_id, id));

    const removedModels = existingModels
      .map((m) => m.model_name)
      .filter((name) => !data.model_configs.includes(name));

    // 2. Update the test profile
    const [updatedProfile] = await db
      .update(testProfiles)
      .set({
        name: data.name,
        system_prompt_id: data.system_prompt_id,
        manual_tests: data.manual_tests,
        updated_at: new Date(),
      })
      .where(eq(testProfiles.id, id))
      .returning();

    if (!updatedProfile) {
      throw new Error("Test profile not found");
    }

    // 3. Update test associations (Delete then Insert)
    await db
      .delete(testProfileTests)
      .where(eq(testProfileTests.profile_id, id));

    if (data.test_ids.length > 0) {
      const testProfileTestData: InsertTestProfileTest[] = data.test_ids.map(
        (test_id) => ({
          profile_id: id,
          test_id,
        })
      );
      await db.insert(testProfileTests).values(testProfileTestData);
    }

    // 4. Update model configurations (Delete then Insert)
    await db
      .delete(testProfileModels)
      .where(eq(testProfileModels.profile_id, id));

    if (data.model_configs.length > 0) {
      const modelConfigData: InsertTestProfileModel[] = data.model_configs.map(
        (model_name) => ({
          profile_id: id,
          model_name,
        })
      );
      await db.insert(testProfileModels).values(modelConfigData);
    }

    // 5. If models were removed, delete their test run results
    if (removedModels.length > 0) {
      const profileRuns = await db
        .select({ id: testRuns.id })
        .from(testRuns)
        .where(eq(testRuns.profile_id, id));

      const runIds = profileRuns.map((r) => r.id);

      if (runIds.length > 0) {
        await db
          .delete(testRunResults)
          .where(
            and(
              inArray(testRunResults.test_run_id, runIds),
              inArray(testRunResults.model_used, removedModels)
            )
          );
      }
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
  await db.delete(testProfiles).where(eq(testProfiles.id, id));
}

export async function getTestsForSelection(): Promise<SelectTest[]> {
  return await db.select().from(tests).orderBy(tests.id);
}

export async function getSystemPromptsForSelection(): Promise<
  SelectSystemPrompt[]
> {
  return await db.select().from(systemPrompts).orderBy(systemPrompts.name);
}

export async function getTestProfileWithDetails(
  id: number
): Promise<DetailedTestProfile | null> {
  // Get profile with system prompt details by joining tables
  const profileResult = await db
    .select({
      id: testProfiles.id,
      name: testProfiles.name,
      system_prompt_id: testProfiles.system_prompt_id,
      user_id: testProfiles.user_id,
      username: users.username,
      created_at: testProfiles.created_at,
      updated_at: testProfiles.updated_at,
      system_prompt: systemPrompts.prompt,
      system_prompt_name: systemPrompts.name,
      manual_tests: testProfiles.manual_tests,
    })
    .from(testProfiles)
    .leftJoin(
      systemPrompts,
      eq(testProfiles.system_prompt_id, systemPrompts.id)
    )
    .innerJoin(users, eq(testProfiles.user_id, users.id))
    .where(eq(testProfiles.id, id))
    .limit(1);

  if (!profileResult[0]) {
    return null;
  }

  const profile = profileResult[0];

  // Get associated tests
  const profileTests = await db
    .select({
      test_id: testProfileTests.test_id,
      // test_name removed
      test_prompt: tests.prompt,
      expected_result: tests.expected_result,
    })
    .from(testProfileTests)
    .innerJoin(tests, eq(testProfileTests.test_id, tests.id))
    .where(eq(testProfileTests.profile_id, id));

  // Get all results for all runs of this profile to find the best model for each test
  // Sort by created_at DESC to easily pick the latest result for each model
  const allResults = await db
    .select({
      test_id: testRunResults.test_id,
      model_name: testRunResults.model_used,
      score: testRunResults.score,
      created_at: testRunResults.created_at,
      tokens_cost: testRunResults.tokens_cost,
      token_count: testRunResults.token_count,
      manual_prompt: testRunResults.manual_prompt, // Include manual_prompt
    })
    .from(testRuns)
    .innerJoin(testRunResults, eq(testRuns.id, testRunResults.test_run_id))
    .where(eq(testRuns.profile_id, id))
    .orderBy(sql`${testRunResults.created_at} DESC`);

  // Map to store latest result for each (test_id, model_name) OR (manual_prompt, model_name)
  const latestResultsMap = new Map<
    string,
    {
      test_id: number | null;
      manual_prompt: string | null;
      model: string;
      score: number | null;
      cost: number | null;
      tokens: number | null;
    }
  >();

  for (const res of allResults) {
    const key = res.test_id
      ? `id-${res.test_id}-${res.model_name}`
      : `manual-${res.manual_prompt}-${res.model_name}`; // Use res.manual_prompt
    if (!latestResultsMap.has(key)) {
      latestResultsMap.set(key, {
        test_id: res.test_id,
        manual_prompt: res.manual_prompt, // Store manual_prompt
        model: res.model_name || "N/A",
        score: res.score,
        cost: res.tokens_cost,
        tokens: res.token_count,
      });
    }
  }

  const latestResults = Array.from(latestResultsMap.values());

  const bestResultsMap = new Map<string, { model: string; score: number }>();

  // Group latest results by test and find the highest score
  for (const [key, res] of latestResultsMap.entries()) {
    if (res.score === null || res.score === undefined) continue;

    // key is either `id-{testId}-{model}` or `manual-{prompt}-{model}`
    // We want a testKey that is either `id-{testId}` or `manual-{prompt}`
    const parts = key.split("-");
    const testKey = parts.slice(0, 2).join("-");

    const existing = bestResultsMap.get(testKey);
    if (!existing || res.score >= existing.score) {
      bestResultsMap.set(testKey, {
        model: res.model,
        score: res.score,
      });
    }
  }

  const testsWithBest = profileTests.map((t) => ({
    ...t,
    best_model: bestResultsMap.get(`id-${t.test_id}`)?.model || null,
    best_score: bestResultsMap.get(`id-${t.test_id}`)?.score ?? null,
  }));

  // Merge manual tests
  const manualTests =
    (profile.manual_tests as { prompt: string; expected_result: string }[]) ||
    [];
  const manualTestsMapped = manualTests.map((t) => {
    const testKey = `manual-${t.prompt}`;
    return {
      test_id: testKey,
      test_prompt: t.prompt,
      expected_result: t.expected_result,
      best_model: bestResultsMap.get(testKey)?.model || null,
      best_score: bestResultsMap.get(testKey)?.score ?? null,
      is_manual: true,
    };
  });

  // Get associated model configurations
  const profileModels = await db
    .select()
    .from(testProfileModels)
    .where(eq(testProfileModels.profile_id, id));

  // Get aggregated metrics using ONLY the latest results
  const validScores = latestResults.filter(
    (r) => r.score !== null && r.score !== undefined
  ) as { score: number }[];
  const totalCost = latestResults.reduce(
    (sum, r) => sum + (Number(r.cost) || 0),
    0
  );
  const totalTokens = latestResults.reduce((sum, r) => {
    const val = Number(r.tokens);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const avgScore =
    validScores.length > 0
      ? validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length
      : null;

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
    tests: [...testsWithBest, ...manualTestsMapped],
    models: profileModels,
    total_tokens_cost: totalCost,
    total_tokens: totalTokens,
    average_score: avgScore,
    manual_tests: profile.manual_tests as ManualTest[] | null,
  };
}
