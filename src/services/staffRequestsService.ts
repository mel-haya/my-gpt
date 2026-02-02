import {
  staffRequests,
  InsertStaffRequest,
  SelectStaffRequest,
  users,
} from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import {
  eq,
  and,
  desc,
  ilike,
  or,
  count,
  sql,
  getTableColumns,
} from "drizzle-orm";

export type StaffRequestWithCompleter = SelectStaffRequest & {
  completer_name: string | null;
};

export type PaginatedStaffRequests = {
  requests: StaffRequestWithCompleter[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export async function getStaffRequests(
  searchQuery?: string,
  category?: string,
  status?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedStaffRequests> {
  const offset = (page - 1) * limit;

  let whereClause = undefined;
  const conditions = [];

  if (searchQuery) {
    conditions.push(
      or(
        ilike(staffRequests.title, `%${searchQuery}%`),
        ilike(staffRequests.description, `%${searchQuery}%`),
      ),
    );
  }

  if (category && category !== "all") {
    conditions.push(
      eq(
        staffRequests.category,
        category as
          | "reservation"
          | "room_issue"
          | "room_service"
          | "housekeeping"
          | "maintenance"
          | "concierge"
          | "other",
      ),
    );
  }

  if (status && status !== "all") {
    conditions.push(
      eq(staffRequests.status, status as "pending" | "in_progress" | "done"),
    );
  }

  if (conditions.length > 0) {
    whereClause = and(...conditions);
  }

  const totalCountResult = await db
    .select({ count: count() })
    .from(staffRequests)
    .where(whereClause);

  const totalCount = Number(totalCountResult[0]?.count || 0);

  // Sorting: Critical (0), High (1), Medium (2), Low (3)
  // Within urgency: Oldest created_at first
  const result = await db
    .select({
      ...getTableColumns(staffRequests),
      completer_name: users.username,
    })
    .from(staffRequests)
    .leftJoin(users, eq(staffRequests.completed_by, users.id))
    .where(whereClause)
    .orderBy(desc(staffRequests.created_at))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    requests: result,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function createStaffRequest(
  data: InsertStaffRequest,
): Promise<SelectStaffRequest> {
  const [newRequest] = await db.insert(staffRequests).values(data).returning();
  return newRequest;
}

export async function completeStaffRequest(
  id: number,
  completedByUserId: string,
  note?: string,
): Promise<SelectStaffRequest> {
  const [updatedRequest] = await db
    .update(staffRequests)
    .set({
      status: "done",
      completed_by: completedByUserId,
      completion_note: note,
      completed_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(staffRequests.id, id))
    .returning();
  return updatedRequest;
}

export async function deleteStaffRequest(id: number): Promise<void> {
  await db.delete(staffRequests).where(eq(staffRequests.id, id));
}

export type StaffRequestStats = {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  avgResponseTimeMinutes: number | null;
};

export async function getStaffRequestStats(): Promise<StaffRequestStats> {
  const [totalResult] = await db.select({ count: count() }).from(staffRequests);

  const [pendingResult] = await db
    .select({ count: count() })
    .from(staffRequests)
    .where(eq(staffRequests.status, "pending"));

  const [completedResult] = await db
    .select({ count: count() })
    .from(staffRequests)
    .where(eq(staffRequests.status, "done"));

  // Calculate average response time for completed requests (in minutes)
  const avgTimeResult = await db
    .select({
      avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${staffRequests.completed_at} - ${staffRequests.created_at})) / 60)`,
    })
    .from(staffRequests)
    .where(
      and(
        eq(staffRequests.status, "done"),
        sql`${staffRequests.completed_at} IS NOT NULL`,
      ),
    );

  return {
    totalRequests: Number(totalResult?.count || 0),
    pendingRequests: Number(pendingResult?.count || 0),
    completedRequests: Number(completedResult?.count || 0),
    avgResponseTimeMinutes: avgTimeResult[0]?.avgTime
      ? Math.round(avgTimeResult[0].avgTime)
      : null,
  };
}

export async function getPendingRequestsCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(staffRequests)
    .where(eq(staffRequests.status, "pending"));
  return Number(result?.count || 0);
}
