import { db } from "@/lib/db-config";
import { models, testRunResults, testRuns } from "@/lib/db-schema";
import { eq, and, desc, asc, count, ilike, inArray, sql } from "drizzle-orm";
import type { SelectModel, InsertModel } from "@/lib/db-schema";

export type SelectModelWithStats = SelectModel & {
  score?: number | null;
  cost?: number | null;
  tokens?: number | null;
};

export interface ModelsResponse {
  models: SelectModelWithStats[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function getModels(
  options: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: "name" | "created_at" | "score" | "cost" | "tokens";
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<ModelsResponse> {
  const {
    search = "",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];

  if (search.trim()) {
    whereConditions.push(ilike(models.name, `%${search.trim()}%`));
  }

  const whereClause =
    whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

  // Define aggregations
  const scoreSql = sql<number>`avg(${testRunResults.score})`; // Removed mapWith(Number) here because Drizzle's ordering might not like the mapped object as much as the SQL chunk, or handle it differently. But actually mapWith is fine for selection. For ordering, I should reuse the standard sql chunk or the selection field.
  const costSql = sql<number>`sum(${testRunResults.tokens_cost})`;
  const tokensSql = sql<number>`sum(${testRunResults.token_count})`;

  let orderByClause;
  const direction = sortOrder === "asc" ? asc : desc;

  switch (sortBy) {
    case "score":
      orderByClause = direction(scoreSql);
      break;
    case "cost":
      orderByClause = direction(costSql);
      break;
    case "tokens":
      orderByClause = direction(tokensSql);
      break;
    case "name":
      orderByClause = direction(models.name);
      break;
    default:
      orderByClause = direction(models.created_at);
  }

  // Fetch models with aggregated stats
  const [modelsData, totalCountData] = await Promise.all([
    db
      .select({
        id: models.id,
        name: models.name,
        model_id: models.model_id,
        default: models.default,
        enabled: models.enabled,
        created_at: models.created_at,
        updated_at: models.updated_at,
        score: scoreSql.mapWith(Number),
        cost: costSql.mapWith(Number),
        tokens: tokensSql.mapWith(Number),
      })
      .from(models)
      .leftJoin(testRunResults, eq(models.id, testRunResults.model_id))
      .where(whereClause)
      .groupBy(models.id)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),

    db.select({ count: count() }).from(models).where(whereClause),
  ]);

  const totalCount = totalCountData[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    models: modelsData,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function createModel(
  data: Omit<InsertModel, "id" | "created_at" | "updated_at">,
): Promise<SelectModel> {
  // If this model is being set as default, remove default from all others
  if (data.default) {
    await db
      .update(models)
      .set({ default: false, updated_at: new Date() })
      .where(eq(models.default, true));
  }

  const [newModel] = await db.insert(models).values(data).returning();

  return newModel;
}

export async function updateModel(
  modelId: number,
  data: Partial<Omit<InsertModel, "id" | "created_at">>,
): Promise<SelectModel | null> {
  // If this model is being set as default, remove default from all others
  if (data.default) {
    await db
      .update(models)
      .set({ default: false, updated_at: new Date() })
      .where(eq(models.default, true));
  }

  const [updatedModel] = await db
    .update(models)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(models.id, modelId))
    .returning();

  return updatedModel || null;
}

export async function deleteModel(
  modelId: number,
): Promise<SelectModel | null> {
  const [deletedModel] = await db
    .delete(models)
    .where(eq(models.id, modelId))
    .returning();

  return deletedModel || null;
}

export async function bulkDeleteModels(modelIds: number[]): Promise<number> {
  if (!modelIds || modelIds.length === 0) {
    return 0;
  }

  const result = await db
    .delete(models)
    .where(inArray(models.id, modelIds))
    .returning();

  return result.length; // Return actual count of deleted records
}

export async function getDefaultModel(): Promise<SelectModel | null> {
  const [defaultModel] = await db
    .select()
    .from(models)
    .where(eq(models.default, true))
    .limit(1);

  return defaultModel || null;
}

export async function getModelById(
  modelId: number,
): Promise<SelectModel | null> {
  const [model] = await db
    .select()
    .from(models)
    .where(eq(models.id, modelId))
    .limit(1);

  return model || null;
}

export async function getModelByStringId(
  modelId: string,
): Promise<SelectModel | null> {
  const [model] = await db
    .select()
    .from(models)
    .where(eq(models.model_id, modelId))
    .limit(1);

  return model || null;
}

export async function getAvailableModelsFromDb(): Promise<SelectModel[]> {
  const availableModels = await db
    .select()
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(desc(models.default)); // Put default model first

  return availableModels;
}
