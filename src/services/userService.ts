import { db } from "@/lib/db-config";
import { users, userTokenUsage, type InsertUser, type SelectUser } from "@/lib/db-schema";
import { eq, or, sql, desc, count } from "drizzle-orm";

export async function createUser(userData: {
  id: string;
  username: string;
  email: string;
}) {
  try {
    const newUser: InsertUser = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
    };

    const result = await db.insert(users).values(newUser).returning();
    return result[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
}

export async function createUserIfNotExists(userData: {
  id: string;
  username: string;
  email: string;
}) {
  try {
    // Check if user already exists by ID or email
    const existingUser = await db
      .select()
      .from(users)
      .where(or(eq(users.id, userData.id), eq(users.email, userData.email)))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log(`User with ID ${userData.id} or email ${userData.email} already exists, skipping creation`);
      return existingUser[0];
    }

    // User doesn't exist, create new one
    return await createUser(userData);
  } catch (error) {
    console.error("Error creating user if not exists:", error);
    throw new Error("Failed to create user");
  }
}

export async function getUserById(id: string) {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user[0] || null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw new Error("Failed to get user");
  }
}

export async function updateUser(id: string, userData: {
  username?: string;
  email?: string;
}) {
  try {
    const updateData = {
      ...userData,
      updated_at: new Date(),
    };

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
}

export async function deleteUser(id: string) {
  try {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0] || null;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

export interface UserWithTokenUsage extends SelectUser {
  totalTokensUsed: number;
  totalMessagesCount: number;
}

export async function getUsersWithTokenUsage(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<{
  users: UserWithTokenUsage[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  statistics: {
    totalUsersCount: number;
    totalTokensUsed: number;
  };
}> {
  try {
    const offset = (page - 1) * limit;

    // Build base query
    let whereCondition = sql`1 = 1`;
    if (searchQuery) {
      whereCondition = sql`
        (${users.username} ILIKE ${`%${searchQuery}%`} OR 
         ${users.email} ILIKE ${`%${searchQuery}%`})
      `;
    }

    // Get users with token usage aggregation
    const usersWithUsage = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        created_at: users.created_at,
        updated_at: users.updated_at,
        totalTokensUsed: sql<number>`COALESCE(SUM(${userTokenUsage.tokens_used}), 0)`.as('totalTokensUsed'),
        totalMessagesCount: sql<number>`COALESCE(SUM(${userTokenUsage.messages_sent}), 0)`.as('totalMessagesCount'),
      })
      .from(users)
      .leftJoin(userTokenUsage, eq(users.id, userTokenUsage.user_id))
      .where(whereCondition)
      .groupBy(users.id, users.username, users.email, users.created_at, users.updated_at)
      .orderBy(desc(users.created_at))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalCountResult] = await db
      .select({
        count: count()
      })
      .from(users)
      .where(whereCondition);

    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get overall statistics
    const [statisticsResult] = await db
      .select({
        totalUsersCount: count(users.id),
        totalTokensUsed: sql<number>`COALESCE(SUM(${userTokenUsage.tokens_used}), 0)`,
      })
      .from(users)
      .leftJoin(userTokenUsage, eq(users.id, userTokenUsage.user_id));

    return {
      users: usersWithUsage.map(user => ({
        ...user,
        totalTokensUsed: Number(user.totalTokensUsed) || 0,
        totalMessagesCount: Number(user.totalMessagesCount) || 0,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      statistics: {
        totalUsersCount: Number(statisticsResult?.totalUsersCount) || 0,
        totalTokensUsed: Number(statisticsResult?.totalTokensUsed) || 0,
      },
    };
  } catch (error) {
    console.error("Error getting users with token usage:", error);
    throw new Error("Failed to fetch users data");
  }
}
