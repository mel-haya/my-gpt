import { db } from "@/lib/db-config";
import { testProfiles, testProfileTests, testProfileModels, tests, systemPrompts } from "@/lib/db-schema";
import type {
  SelectTestProfile,
  SelectTestProfileWithPrompt,
  SelectTest,
  SelectSystemPrompt,
  InsertTestProfileTest,
  InsertTestProfileModel
} from "@/lib/db-schema";
import { eq, and, desc, ilike, count } from "drizzle-orm";

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

export async function getTestProfiles(
  user_id: string,
  options?: {
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<TestProfilesResponse> {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  // Build base query with join to get system prompt text
  let baseQuery = db.select({
    id: testProfiles.id,
    name: testProfiles.name,
    system_prompt_id: testProfiles.system_prompt_id,
    system_prompt: systemPrompts.prompt,
    user_id: testProfiles.user_id,
    created_at: testProfiles.created_at,
    updated_at: testProfiles.updated_at,
  })
    .from(testProfiles)
    .leftJoin(systemPrompts, eq(testProfiles.system_prompt_id, systemPrompts.id));

  let countQuery = db.select({ count: count() })
    .from(testProfiles)
    .leftJoin(systemPrompts, eq(testProfiles.system_prompt_id, systemPrompts.id));

  // Add search filter if provided
  if (options?.search) {
    const searchCondition = ilike(testProfiles.name, `%${options.search}%`);
    baseQuery = baseQuery.where(and(eq(testProfiles.user_id, user_id), searchCondition)) as typeof baseQuery;
    countQuery = countQuery.where(and(eq(testProfiles.user_id, user_id), searchCondition)) as typeof countQuery;
  } else {
    baseQuery = baseQuery.where(eq(testProfiles.user_id, user_id)) as typeof baseQuery;
    countQuery = countQuery.where(eq(testProfiles.user_id, user_id)) as typeof countQuery;
  }

  // Execute queries
  const [profiles, totalCountResult] = await Promise.all([
    baseQuery.orderBy(desc(testProfiles.created_at)).limit(limit).offset(offset),
    countQuery
  ]);

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

export async function updateTestProfile(id: number, data: UpdateTestProfileData, user_id: string): Promise<SelectTestProfile> {
  try {
    // Update the test profile
    const [updatedProfile] = await db.update(testProfiles)
      .set({
        name: data.name,
        system_prompt_id: data.system_prompt_id,
        updated_at: new Date(),
      })
      .where(and(eq(testProfiles.id, id), eq(testProfiles.user_id, user_id)))
      .returning();

    if (!updatedProfile) {
      throw new Error("Test profile not found or access denied");
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
    if (error instanceof Error && error.message === "Test profile not found or access denied") {
      throw error;
    }
    throw new Error("Failed to update test profile");
  }
}

export async function deleteTestProfile(id: number, user_id: string): Promise<void> {
  await db.delete(testProfiles)
    .where(and(eq(testProfiles.id, id), eq(testProfiles.user_id, user_id)));
}

export async function getTestsForSelection(user_id: string): Promise<SelectTest[]> {
  return await db.select().from(tests)
    .where(eq(tests.user_id, user_id))
    .orderBy(tests.name);
}

export async function getSystemPromptsForSelection(user_id: string): Promise<SelectSystemPrompt[]> {
  return await db.select().from(systemPrompts)
    .where(eq(systemPrompts.user_id, user_id))
    .orderBy(systemPrompts.name);
}

export async function getTestProfileWithDetails(id: number) {
  // Get profile with system prompt details by joining tables
  const profileResult = await db.select({
    id: testProfiles.id,
    name: testProfiles.name,
    system_prompt_id: testProfiles.system_prompt_id,
    user_id: testProfiles.user_id,
    created_at: testProfiles.created_at,
    updated_at: testProfiles.updated_at,
    system_prompt: systemPrompts.prompt,
    system_prompt_name: systemPrompts.name,
  })
    .from(testProfiles)
    .leftJoin(systemPrompts, eq(testProfiles.system_prompt_id, systemPrompts.id))
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

  // Get associated model configurations
  const profileModels = await db.select()
    .from(testProfileModels)
    .where(eq(testProfileModels.profile_id, id));

  return {
    id: profile.id,
    name: profile.name,
    system_prompt_id: profile.system_prompt_id,
    system_prompt: profile.system_prompt, // Now contains the actual prompt text from the join
    system_prompt_name: profile.system_prompt_name, // Include the system prompt name
    user_id: profile.user_id,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    tests: profileTests,
    models: profileModels,
  };
}