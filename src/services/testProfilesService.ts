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
  models,
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
import { eq, and, ilike, count, sql, inArray, ne } from "drizzle-orm";

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

export interface ModelAverage {
  model: string;
  average_score: number;
  test_count: number;
  total_tokens: number;
  total_cost: number;
}

export interface DetailedTestProfile {
  id: number;
  name: string;
  system_prompt_id: number | null;
  system_prompt: string | null;
  system_prompt_name: string | null;
  system_prompt_default?: boolean;
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
    total_score: number;
    is_manual?: boolean;
  }[];
  models: SelectTestProfileModel[];
  total_tokens_cost: number | null;
  total_tokens: number | null;
  average_score: number | null;
  model_averages: ModelAverage[];
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
        tp.manual_tests,
        (SELECT status FROM test_runs WHERE profile_id = tp.id ORDER BY created_at DESC LIMIT 1) as latest_status,
        stats.total_tokens_cost,
        stats.total_tokens,
        stats.average_score,
        stats.best_model
      FROM test_profiles tp
      LEFT JOIN system_prompts sp ON tp.system_prompt_id = sp.id
      INNER JOIN users u ON tp.user_id = u.id
      LEFT JOIN LATERAL (
        WITH deduped AS (
          SELECT DISTINCT ON (test_id, trr.model_id)
            trr.tokens_cost,
            trr.token_count,
            trr.score,
            m.model_id as model_name,
            trr.model_id as model_pk,
            trr.id
          FROM test_runs tr
          JOIN test_run_results trr ON tr.id = trr.test_run_id
          LEFT JOIN models m ON trr.model_id = m.id
          WHERE tr.profile_id = tp.id
          ORDER BY test_id, trr.model_id, trr.created_at DESC
        )
        SELECT 
          SUM(tokens_cost) as total_tokens_cost,
          SUM(token_count) as total_tokens,
          AVG(score) as average_score,
          (
            SELECT model_name
            FROM deduped
            WHERE score IS NOT NULL
            GROUP BY model_name
            ORDER BY AVG(score) DESC
            LIMIT 1
          ) as best_model
        FROM deduped
      ) stats ON true
      ${
        options?.search
          ? sql`WHERE tp.name ILIKE ${`%${options.search}%`}`
          : sql``
      }
      ORDER BY tp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
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
  id: number,
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
  userId: string,
): Promise<SelectTestProfile | null> {
  const result = await db
    .select()
    .from(testProfiles)
    .where(and(eq(testProfiles.name, name), eq(testProfiles.user_id, userId)))
    .limit(1);
  return result[0] || null;
}

export async function createTestProfile(
  data: CreateTestProfileData,
): Promise<SelectTestProfile> {
  try {
    // Create the test profile first
    const [profile] = await db
      .insert(testProfiles)
      .values({
        name: data.name,
        system_prompt_id: data.system_prompt_id,
        user_id: data.user_id,
        manual_tests: null, // No longer storing JSON manual tests
      })
      .returning();

    // Process manual tests if provided: Create them in `tests` table and add to test_ids
    const allTestIds = [...data.test_ids];

    if (data.manual_tests && data.manual_tests.length > 0) {
      for (const manualTest of data.manual_tests) {
        // Check for existing identical manual test for this user to avoid duplicates
        const existingDetails = await db
          .select({ id: tests.id })
          .from(tests)
          .where(
            and(
              eq(tests.prompt, manualTest.prompt),
              eq(tests.user_id, data.user_id),
              eq(tests.is_manual, true),
            ),
          )
          .limit(1);

        if (existingDetails.length > 0) {
          allTestIds.push(existingDetails[0].id);
        } else {
          const [newTest] = await db
            .insert(tests)
            .values({
              prompt: manualTest.prompt,
              expected_result: manualTest.expected_result,
              user_id: data.user_id,
              category: "Manual",
              is_manual: true,
            })
            .returning();
          allTestIds.push(newTest.id);
        }
      }
    }

    // Add tests to the profile if provided
    if (allTestIds.length > 0) {
      try {
        const uniqueTestIds = Array.from(new Set(allTestIds));
        const testProfileTestData: InsertTestProfileTest[] = uniqueTestIds.map(
          (test_id) => ({
            profile_id: profile.id,
            test_id,
          }),
        );
        await db.insert(testProfileTests).values(testProfileTestData);
      } catch (testError) {
        // If adding tests fails, attempt to delete the created profile
        console.error(
          "Failed to add tests to profile, attempting cleanup:",
          testError,
        );
        try {
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup profile after test insertion error:",
            cleanupError,
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
          modelError,
        );
        try {
          await db
            .delete(testProfileTests)
            .where(eq(testProfileTests.profile_id, profile.id));
          await db.delete(testProfiles).where(eq(testProfiles.id, profile.id));
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup profile after model insertion error:",
            cleanupError,
          );
        }
        throw new Error(
          "Failed to create test profile: Unable to add model configurations",
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
  data: UpdateTestProfileData,
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
        manual_tests: null, // No longer storing JSON manual tests
        updated_at: new Date(),
      })
      .where(eq(testProfiles.id, id))
      .returning();

    if (!updatedProfile) {
      throw new Error("Test profile not found");
    }

    // Process manual tests if provided: Create them in `tests` table and add to test_ids
    const allTestIds = [...data.test_ids];

    if (data.manual_tests && data.manual_tests.length > 0) {
      // Get the user_id from the existing profile so we scope the manual tests correctly
      const profileUser = await db
        .select({ user_id: testProfiles.user_id })
        .from(testProfiles)
        .where(eq(testProfiles.id, id))
        .limit(1);

      if (profileUser.length > 0) {
        const userId = profileUser[0].user_id;

        for (const manualTest of data.manual_tests) {
          // Check for existing identical manual test for this user
          const existingDetails = await db
            .select({ id: tests.id })
            .from(tests)
            .where(
              and(
                eq(tests.prompt, manualTest.prompt),
                eq(tests.user_id, userId),
                eq(tests.is_manual, true),
              ),
            )
            .limit(1);

          if (existingDetails.length > 0) {
            allTestIds.push(existingDetails[0].id);
          } else {
            const [newTest] = await db
              .insert(tests)
              .values({
                prompt: manualTest.prompt,
                expected_result: manualTest.expected_result,
                user_id: userId,
                category: "Manual",
                is_manual: true,
              })
              .returning();
            allTestIds.push(newTest.id);
          }
        }
      }
    }

    // 3. Identify and delete removed manual tests
    // specific tests that are being removed from this profile
    const currentProfileTests = await db
      .select({
        test_id: tests.id,
        is_manual: tests.is_manual,
      })
      .from(testProfileTests)
      .innerJoin(tests, eq(testProfileTests.test_id, tests.id))
      .where(eq(testProfileTests.profile_id, id));

    const newTestIdsSet = new Set(allTestIds);

    const manualTestsToRemove = currentProfileTests.filter(
      (t) => t.is_manual && !newTestIdsSet.has(t.test_id),
    );

    for (const testToRemove of manualTestsToRemove) {
      // Check if this manual test is used by ANY other profile
      // We check for references in test_profile_tests where profile_id != id
      const otherUsage = await db
        .select({ count: count() })
        .from(testProfileTests)
        .where(
          and(
            eq(testProfileTests.test_id, testToRemove.test_id),
            ne(testProfileTests.profile_id, id),
          ),
        );

      const otherUsageCount = otherUsage[0]?.count || 0;

      if (otherUsageCount === 0) {
        // Safe to delete: Not used by any other profile
        // 1. Delete test run results for this test
        await db
          .delete(testRunResults)
          .where(eq(testRunResults.test_id, testToRemove.test_id));

        // 2. Delete the test itself
        await db.delete(tests).where(eq(tests.id, testToRemove.test_id));
      }
    }

    // 4. Update test associations (Delete then Insert)
    await db
      .delete(testProfileTests)
      .where(eq(testProfileTests.profile_id, id));

    if (allTestIds.length > 0) {
      const uniqueTestIds = Array.from(new Set(allTestIds));
      const testProfileTestData: InsertTestProfileTest[] = uniqueTestIds.map(
        (test_id) => ({
          profile_id: id,
          test_id,
        }),
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
        }),
      );
      await db.insert(testProfileModels).values(modelConfigData);
    }

    // 5. If models were removed, delete their test run results
    if (removedModels.length > 0) {
      // Lookup model IDs for removed models
      const modelsToDelete = await db
        .select({ id: models.id })
        .from(models)
        .where(inArray(models.model_id, removedModels));
      const modelIdsToDelete = modelsToDelete.map((m) => m.id);

      const profileRuns = await db
        .select({ id: testRuns.id })
        .from(testRuns)
        .where(eq(testRuns.profile_id, id));

      const runIds = profileRuns.map((r) => r.id);

      if (runIds.length > 0 && modelIdsToDelete.length > 0) {
        await db
          .delete(testRunResults)
          .where(
            and(
              inArray(testRunResults.test_run_id, runIds),
              inArray(testRunResults.model_id, modelIdsToDelete),
            ),
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

export async function updateTestProfileSystemPrompt(
  profileId: number,
  systemPromptId: number,
): Promise<void> {
  const result = await db
    .update(testProfiles)
    .set({
      system_prompt_id: systemPromptId,
      updated_at: new Date(),
    })
    .where(eq(testProfiles.id, profileId));

  if (!result) {
    throw new Error("Failed to update test profile system prompt");
  }
}

export async function deleteTestProfile(id: number): Promise<void> {
  await db.delete(testProfiles).where(eq(testProfiles.id, id));
}

export async function getTestsForSelection(): Promise<SelectTest[]> {
  return await db
    .select()
    .from(tests)
    .where(eq(tests.is_manual, false))
    .orderBy(tests.id);
}

export async function getSystemPromptsForSelection(): Promise<
  SelectSystemPrompt[]
> {
  return await db.select().from(systemPrompts).orderBy(systemPrompts.name);
}

export async function getTestProfileWithDetails(
  id: number,
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
      system_prompt_default: systemPrompts.default,
      manual_tests: testProfiles.manual_tests,
    })
    .from(testProfiles)
    .leftJoin(
      systemPrompts,
      eq(testProfiles.system_prompt_id, systemPrompts.id),
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
      test_prompt: tests.prompt,
      expected_result: tests.expected_result,
      is_manual: tests.is_manual,
    })
    .from(testProfileTests)
    .innerJoin(tests, eq(testProfileTests.test_id, tests.id))
    .where(eq(testProfileTests.profile_id, id));

  // Get all results for all runs of this profile to find the best model for each test
  // Sort by created_at DESC to easily pick the latest result for each model
  const allResults = await db
    .select({
      test_id: testRunResults.test_id,
      model_name: models.model_id,
      score: testRunResults.score,
      created_at: testRunResults.created_at,
      tokens_cost: testRunResults.tokens_cost,
      token_count: testRunResults.token_count,
    })
    .from(testRuns)
    .innerJoin(testRunResults, eq(testRuns.id, testRunResults.test_run_id))
    .leftJoin(models, eq(testRunResults.model_id, models.id))
    .where(eq(testRuns.profile_id, id))
    .orderBy(sql`${testRunResults.created_at} DESC`);

  // Map to store latest result for each (test_id, model_name)
  const latestResultsMap = new Map<
    string,
    {
      test_id: number | null;
      model: string;
      score: number | null;
      cost: number | null;
      tokens: number | null;
    }
  >();

  for (const res of allResults) {
    if (!res.test_id) continue;

    const key = `id-${res.test_id}:::${res.model_name}`;
    if (!latestResultsMap.has(key)) {
      latestResultsMap.set(key, {
        test_id: res.test_id,
        model: res.model_name || "N/A",
        score: res.score,
        cost: res.tokens_cost,
        tokens: res.token_count,
      });
    }
  }

  const latestResults = Array.from(latestResultsMap.values());

  const bestResultsMap = new Map<number, { model: string; score: number }>();
  // Map to store sum of all model scores for each test
  const totalScoresMap = new Map<number, number>();

  // Group latest results by test and find the highest score + calculate total
  for (const [, res] of latestResultsMap.entries()) {
    if (!res.test_id) continue;

    // Sum scores for total (treat null as 0)
    const currentTotal = totalScoresMap.get(res.test_id) || 0;
    totalScoresMap.set(res.test_id, currentTotal + (res.score ?? 0));

    if (res.score === null || res.score === undefined) continue;

    const existing = bestResultsMap.get(res.test_id);
    if (!existing || res.score >= existing.score) {
      bestResultsMap.set(res.test_id, {
        model: res.model,
        score: res.score,
      });
    }
  }

  const testsWithBest = profileTests.map((t) => ({
    ...t,
    best_model: bestResultsMap.get(t.test_id)?.model || null,
    best_score: bestResultsMap.get(t.test_id)?.score ?? null,
    total_score: totalScoresMap.get(t.test_id) ?? 0,
  }));

  // Get associated model configurations
  const profileModels = await db
    .select()
    .from(testProfileModels)
    .where(eq(testProfileModels.profile_id, id));

  // Get aggregated metrics using ONLY the latest results
  const validScores = latestResults.filter(
    (r) => r.score !== null && r.score !== undefined,
  ) as { score: number }[];
  const totalCost = latestResults.reduce(
    (sum, r) => sum + (Number(r.cost) || 0),
    0,
  );
  const totalTokens = latestResults.reduce((sum, r) => {
    const val = Number(r.tokens);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const avgScore =
    validScores.length > 0
      ? validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length
      : null;

  // Calculate average score, tokens, and cost per model from the latest results
  const modelScoresMap = new Map<
    string,
    { total: number; count: number; tokens: number; cost: number }
  >();
  for (const res of latestResults) {
    if (res.score === null || res.score === undefined) continue;

    const validTokens = isNaN(Number(res.tokens)) ? 0 : Number(res.tokens);
    const validCost = isNaN(Number(res.cost)) ? 0 : Number(res.cost);

    const model = res.model;
    const existing = modelScoresMap.get(model);
    if (existing) {
      existing.total += res.score;
      existing.count += 1;
      existing.tokens += validTokens;
      existing.cost += validCost;
    } else {
      modelScoresMap.set(model, {
        total: res.score,
        count: 1,
        tokens: validTokens,
        cost: validCost,
      });
    }
  }

  // Convert to array and sort by average score descending
  const modelAverages: ModelAverage[] = Array.from(modelScoresMap.entries())
    .map(([model, data]) => ({
      model,
      average_score: data.total / data.count,
      test_count: data.count,
      total_tokens: data.tokens,
      total_cost: data.cost,
    }))
    .sort((a, b) => b.average_score - a.average_score);

  return {
    id: profile.id,
    name: profile.name,
    system_prompt_id: profile.system_prompt_id,
    system_prompt: profile.system_prompt, // Now contains the actual prompt text from the join
    system_prompt_name: profile.system_prompt_name, // Include the system prompt name
    system_prompt_default: profile.system_prompt_default ?? false,
    user_id: profile.user_id,
    username: profile.username,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    tests: testsWithBest.sort((a, b) => a.total_score - b.total_score),
    models: profileModels,
    total_tokens_cost: totalCost,
    total_tokens: totalTokens,
    average_score: avgScore,
    model_averages: modelAverages,
    // We can keep this null or remove it, depending on if frontend strictly needs it.
    // Keeping as null since we migrated data.
    manual_tests: null,
  };
}
