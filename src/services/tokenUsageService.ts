import { db } from "../lib/db-config";
import { userTokenUsage, type SelectUserTokenUsage } from "../lib/db-schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { isUserSubscribed } from "./subscriptionService";

/**
 * Get or create today's token usage record for a user
 */
export async function getTodaysUsage(userId: string): Promise<SelectUserTokenUsage> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const existingUsage = await db
    .select()
    .from(userTokenUsage)
    .where(
      and(
        eq(userTokenUsage.user_id, userId),
        eq(userTokenUsage.usage_date, today)
      )
    )
    .limit(1);

  if (existingUsage.length > 0) {
    return existingUsage[0];
  }

  // Create new record for today
  const newUsage = await db
    .insert(userTokenUsage)
    .values({
      user_id: userId,
      usage_date: today,
      messages_sent: 0,
      tokens_used: 0,
      daily_message_limit: 10
    })
    .returning();

  return newUsage[0];
}

/**
 * Check if user has reached their daily message limit (returns false for subscribed users)
 */
export async function hasReachedDailyLimit(userId: string): Promise<boolean> {
  // Subscribed users have no daily limit
  const isSubscribed = await isUserSubscribed(userId);
  if (isSubscribed) {
    return false;
  }

  const todaysUsage = await getTodaysUsage(userId);
  return todaysUsage.messages_sent >= todaysUsage.daily_message_limit;
}

/**
 * Record both message and token usage in one operation
 */
export async function recordUsage(userId: string, tokensUsed: number): Promise<{
  usage: SelectUserTokenUsage;
  hasReachedLimit: boolean;
}> {
  const todaysUsage = await getTodaysUsage(userId);
  
  const updated = await db
    .update(userTokenUsage)
    .set({
      messages_sent: todaysUsage.messages_sent + 1,
      tokens_used: todaysUsage.tokens_used + tokensUsed,
      updated_at: new Date()
    })
    .where(eq(userTokenUsage.id, todaysUsage.id))
    .returning();

  const hasReachedLimit = updated[0].messages_sent >= updated[0].daily_message_limit;

  return {
    usage: updated[0],
    hasReachedLimit
  };
}

/**
 * Get remaining messages for today (returns -1 for unlimited if subscribed)
 */
export async function getRemainingMessages(userId: string): Promise<number> {
  // Subscribed users have unlimited messages
  const isSubscribed = await isUserSubscribed(userId);
  if (isSubscribed) {
    return -1; // -1 indicates unlimited
  }

  const todaysUsage = await getTodaysUsage(userId);
  return Math.max(0, todaysUsage.daily_message_limit - todaysUsage.messages_sent);
}
