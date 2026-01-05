import { SelectSubscription, InsertSubscription, subscriptions } from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { addMonths } from 'date-fns';
import { eq, and, gte } from "drizzle-orm";

export async function addSubscription(
  userId: string
): Promise<SelectSubscription> {
  const today = new Date();
  
  const insertSubscription: InsertSubscription = {
    user_id: userId,
    expiry_date: addMonths(today, 1),
    created_date: today,
  };
  const result = await db
    .insert(subscriptions)
    .values(insertSubscription)
    .returning();
  return result[0];
}

/**
 * Check if a user has an active subscription
 */
export async function isUserSubscribed(userId: string): Promise<boolean> {
  const today = new Date();
  
  const activeSubscription = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        gte(subscriptions.expiry_date, today)
      )
    )
    .limit(1);

  return activeSubscription.length > 0;
}

/**
 * Get the user's current subscription details
 */
export async function getUserSubscription(userId: string): Promise<SelectSubscription | null> {
  const today = new Date();
  
  const activeSubscription = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        gte(subscriptions.expiry_date, today)
      )
    )
    .orderBy(subscriptions.expiry_date)
    .limit(1);

  return activeSubscription.length > 0 ? activeSubscription[0] : null;
}