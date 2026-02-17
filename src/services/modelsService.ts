import { db } from "@/lib/db-config";
import { models, testRunResults } from "@/lib/db-schema";
import { eq, and, desc, asc, count, ilike, inArray, sql } from "drizzle-orm";
import type { SelectModel, InsertModel } from "@/lib/db-schema";

export type SelectModelWithStats = SelectModel & {
  score?: number | null;
  cost?: number | null;
  latency?: number | null;
  responses?: { correct: number; total: number } | null;
  victories?: number | null;
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
    sortBy?:
      | "name"
      | "created_at"
      | "score"
      | "cost"
      | "latency"
      | "responses"
      | "victories";
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
  const scoreSql = sql<number>`avg(${testRunResults.score})`;
  const costSql = sql<number>`sum(${testRunResults.tokens_cost})`;
  const latencySql = sql<number>`avg(${testRunResults.execution_time_ms})`;
  const correctCountSql = sql<number>`count(case when ${testRunResults.score} >= 8 then 1 end)`;
  const totalCountSql = sql<number>`count(${testRunResults.id})`;

  let orderByClause;
  const direction = sortOrder === "asc" ? asc : desc;

  switch (sortBy) {
    case "score":
      orderByClause = direction(scoreSql);
      break;
    case "cost":
      orderByClause = direction(costSql);
      break;
    case "latency":
      orderByClause = direction(latencySql);
      break;
    case "responses":
      orderByClause = direction(correctCountSql);
      break;
    case "victories":
      orderByClause = direction(models.victories);
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
        victories: models.victories,
        created_at: models.created_at,
        updated_at: models.updated_at,
        score: scoreSql.mapWith(Number),
        cost: costSql.mapWith(Number),
        latency: latencySql.mapWith(Number),
        correctCount: correctCountSql.mapWith(Number),
        totalCount: totalCountSql.mapWith(Number),
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

  // Transform the data to match SelectModelWithStats type
  const transformedModels: SelectModelWithStats[] = modelsData.map((m) => ({
    ...m,
    responses:
      m.totalCount > 0
        ? { correct: m.correctCount, total: m.totalCount }
        : null,
  }));

  return {
    models: transformedModels,
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

export async function getModelById(id: number): Promise<SelectModel | null> {
  const [model] = await db
    .select()
    .from(models)
    .where(eq(models.id, id))
    .limit(1);

  return model || null;
}

export async function getAvailableModelsFromDb(): Promise<SelectModel[]> {
  const availableModels = await db
    .select()
    .from(models)
    .orderBy(desc(models.default)); // Put default model first

  return availableModels;
}

export interface TopModelStats {
  highestScore: { name: string; score: number } | null;
  fastest: { name: string; avgExecutionTimeMs: number } | null;
  cheapest: { name: string; costPerTest: number } | null;
}

export async function getTopModelStats(): Promise<TopModelStats> {
  // Highest scoring model (by avg score)
  const highestScoreResult = await db
    .select({
      name: models.name,
      score: sql<number>`avg(${testRunResults.score})`.mapWith(Number),
    })
    .from(models)
    .innerJoin(testRunResults, eq(models.id, testRunResults.model_id))
    .where(sql`${testRunResults.score} IS NOT NULL`)
    .groupBy(models.id, models.name)
    .orderBy(desc(sql`avg(${testRunResults.score})`))
    .limit(1);

  // Fastest model (by avg execution time)
  const fastestResult = await db
    .select({
      name: models.name,
      avgExecutionTimeMs:
        sql<number>`avg(${testRunResults.execution_time_ms})`.mapWith(Number),
    })
    .from(models)
    .innerJoin(testRunResults, eq(models.id, testRunResults.model_id))
    .where(sql`${testRunResults.execution_time_ms} IS NOT NULL`)
    .groupBy(models.id, models.name)
    .orderBy(asc(sql`avg(${testRunResults.execution_time_ms})`))
    .limit(1);

  // Cheapest model (by cost per test = total cost / count of tests)
  const cheapestResult = await db
    .select({
      name: models.name,
      costPerTest:
        sql<number>`sum(${testRunResults.tokens_cost}) / count(*)`.mapWith(
          Number,
        ),
    })
    .from(models)
    .innerJoin(testRunResults, eq(models.id, testRunResults.model_id))
    .where(sql`${testRunResults.tokens_cost} IS NOT NULL`)
    .groupBy(models.id, models.name)
    .orderBy(asc(sql`sum(${testRunResults.tokens_cost}) / count(*)`))
    .limit(1);

  return {
    highestScore: highestScoreResult[0]
      ? {
          name: highestScoreResult[0].name,
          score: highestScoreResult[0].score,
        }
      : null,
    fastest: fastestResult[0]
      ? {
          name: fastestResult[0].name,
          avgExecutionTimeMs: fastestResult[0].avgExecutionTimeMs,
        }
      : null,
    cheapest: cheapestResult[0]
      ? {
          name: cheapestResult[0].name,
          costPerTest: cheapestResult[0].costPerTest,
        }
      : null,
  };
}

export async function incrementModelVictory(modelId: number): Promise<void> {
  await db
    .update(models)
    .set({
      victories: sql`${models.victories} + 1`,
      updated_at: new Date(),
    })
    .where(eq(models.id, modelId));
}
