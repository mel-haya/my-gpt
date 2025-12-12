import { db } from "@/lib/db-config";
import { users, type InsertUser } from "@/lib/db-schema";
import { eq, or } from "drizzle-orm";

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
