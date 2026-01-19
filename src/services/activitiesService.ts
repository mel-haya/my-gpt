import { activities, InsertActivity, SelectActivity } from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import {
  eq,
  and,
  desc,
  ilike,
  or,
  count,
  cosineDistance,
  gt,
  sql,
} from "drizzle-orm";
import { generateEmbedding } from "@/lib/embedding";

export type PaginatedActivities = {
  activities: SelectActivity[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export async function getActivities(
  searchQuery?: string,
  category?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedActivities> {
  const offset = (page - 1) * limit;

  let whereClause = undefined;
  const conditions = [];

  if (searchQuery) {
    conditions.push(
      or(
        ilike(activities.name, `%${searchQuery}%`),
        ilike(activities.description, `%${searchQuery}%`),
        ilike(activities.location, `%${searchQuery}%`),
      ),
    );
  }

  if (category && category !== "all") {
    conditions.push(
      eq(
        activities.category,
        category as
          | "restaurants"
          | "tours"
          | "wellness"
          | "sports"
          | "entertainment"
          | "shopping"
          | "culture"
          | "nature",
      ),
    );
  }

  if (conditions.length > 0) {
    whereClause = and(...conditions);
  }

  const totalCountResult = await db
    .select({ count: count() })
    .from(activities)
    .where(whereClause);

  const totalCount = Number(totalCountResult[0]?.count || 0);

  const result = await db
    .select()
    .from(activities)
    .where(whereClause)
    .orderBy(desc(activities.id))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    activities: result,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getActivityById(
  id: number,
): Promise<SelectActivity | undefined> {
  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);
  return result[0];
}

export async function createActivity(
  data: InsertActivity,
): Promise<SelectActivity> {
  const textForEmbedding = `${data.name} ${data.description} ${data.category || ""} ${data.location || ""}`;
  const embedding = await generateEmbedding(textForEmbedding);

  const [newActivity] = await db
    .insert(activities)
    .values({ ...data, embedding })
    .returning();
  return newActivity;
}

export async function updateActivity(
  id: number,
  data: Partial<InsertActivity>,
): Promise<SelectActivity> {
  let embedding;

  if (data.name || data.description || data.category || data.location) {
    const existing = await getActivityById(id);
    if (existing) {
      const textForEmbedding = `${data.name ?? existing.name} ${data.description ?? existing.description} ${data.category ?? existing.category ?? ""} ${data.location ?? existing.location ?? ""}`;
      embedding = await generateEmbedding(textForEmbedding);
    }
  }

  const [updatedActivity] = await db
    .update(activities)
    .set({ ...data, ...(embedding && { embedding }), updated_at: new Date() })
    .where(eq(activities.id, id))
    .returning();
  return updatedActivity;
}

export async function deleteActivity(id: number): Promise<void> {
  await db.delete(activities).where(eq(activities.id, id));
}

export async function searchActivitiesForSuggestion(
  query: string,
  limit: number = 5,
  threshold: number = 0.3,
): Promise<SelectActivity[]> {
  const embedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(
    activities.embedding,
    embedding,
  )})`;

  return await db
    .select()
    .from(activities)
    .where(gt(similarity, threshold))
    .orderBy(desc(similarity))
    .limit(limit);
}
