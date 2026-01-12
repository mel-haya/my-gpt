import { db } from "@/lib/db-config";
import { systemPrompts } from "@/lib/db-schema";
import { eq, and, desc, count, ilike, inArray } from "drizzle-orm";
import type { SelectSystemPrompt, InsertSystemPrompt } from "@/lib/db-schema";

export interface SystemPromptsResponse {
  systemPrompts: SelectSystemPrompt[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function getSystemPrompts(
  options: {
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<SystemPromptsResponse> {
  const { search = "", page = 1, limit = 10 } = options;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];

  if (search.trim()) {
    whereConditions.push(
      ilike(systemPrompts.name, `%${search.trim()}%`)
    );
  }

  const whereClause = whereConditions.length > 1
    ? and(...whereConditions)
    : whereConditions[0];

  // Fetch system prompts and total count
  const [promptsData, totalCountData] = await Promise.all([
    db
      .select()
      .from(systemPrompts)
      .where(whereClause)
      .orderBy(desc(systemPrompts.created_at))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: count() })
      .from(systemPrompts)
      .where(whereClause)
  ]);

  const totalCount = totalCountData[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    systemPrompts: promptsData,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function createSystemPrompt(
  data: Omit<InsertSystemPrompt, "id" | "created_at" | "updated_at">
): Promise<SelectSystemPrompt> {
  // If this prompt is being set as default, remove default from all others for this user
  if (data.default) {
    await db
      .update(systemPrompts)
      .set({ default: false, updated_at: new Date() })
      .where(eq(systemPrompts.user_id, data.user_id));
  }

  const [newPrompt] = await db
    .insert(systemPrompts)
    .values(data)
    .returning();

  return newPrompt;
}

export async function updateSystemPrompt(
  promptId: number,
  data: Partial<Omit<InsertSystemPrompt, "id" | "created_at">>
): Promise<SelectSystemPrompt | null> {
  // If this prompt is being set as default, remove default from all others for this user
  // If this prompt is being set as default, remove default from all others for this prompt's owner
  if (data.default) {
    const prompt = await getSystemPromptById(promptId);
    if (prompt) {
      await db
        .update(systemPrompts)
        .set({ default: false, updated_at: new Date() })
    }
  }

  const [updatedPrompt] = await db
    .update(systemPrompts)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(and(eq(systemPrompts.id, promptId)))
    .returning();

  return updatedPrompt || null;
}

export async function deleteSystemPrompt(
  promptId: number,
  userId: string
): Promise<SelectSystemPrompt | null> {
  const [deletedPrompt] = await db
    .delete(systemPrompts)
    .where(and(eq(systemPrompts.id, promptId), eq(systemPrompts.user_id, userId)))
    .returning();

  return deletedPrompt || null;
}
export async function bulkDeleteSystemPrompts(
  promptIds: number[],
  userId: string
): Promise<number> {
  if (!promptIds || promptIds.length === 0) {
    return 0;
  }

  const result = await db
    .delete(systemPrompts)
    .where(and(
      eq(systemPrompts.user_id, userId),
      inArray(systemPrompts.id, promptIds)
    ))
    .returning();

  return result.length; // Return actual count of deleted records
}
export async function getDefaultSystemPrompt(
  userId: string
): Promise<SelectSystemPrompt | null> {
  const [defaultPrompt] = await db
    .select()
    .from(systemPrompts)
    .where(and(eq(systemPrompts.user_id, userId), eq(systemPrompts.default, true)))
    .limit(1);

  return defaultPrompt || null;
}

export async function getSystemPromptById(
  promptId: number,
): Promise<SelectSystemPrompt | null> {
  const [prompt] = await db
    .select()
    .from(systemPrompts)
    .where(and(eq(systemPrompts.id, promptId)))
    .limit(1);

  return prompt || null;
}