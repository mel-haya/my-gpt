import { db } from "../lib/db-config";
import { userTokenUsage, type SelectUserTokenUsage } from "../lib/db-schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class TokenUsageService {
  /**
   * Get or create today's token usage record for a user
   */
  static async getTodaysUsage(userId: string): Promise<SelectUserTokenUsage> {
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
   * Check if user has reached their daily message limit
   */
  static async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const todaysUsage = await this.getTodaysUsage(userId);
    return todaysUsage.messages_sent >= todaysUsage.daily_message_limit;
  }

  /**
   * Increment message count for today
   */
  static async incrementMessageCount(userId: string): Promise<SelectUserTokenUsage> {
    const todaysUsage = await this.getTodaysUsage(userId);
    
    const updated = await db
      .update(userTokenUsage)
      .set({
        messages_sent: todaysUsage.messages_sent + 1,
        updated_at: new Date()
      })
      .where(eq(userTokenUsage.id, todaysUsage.id))
      .returning();

    return updated[0];
  }

  /**
   * Update token usage for a user
   */
  static async updateTokenUsage(userId: string, tokensUsed: number): Promise<SelectUserTokenUsage> {
    const todaysUsage = await this.getTodaysUsage(userId);
    
    const updated = await db
      .update(userTokenUsage)
      .set({
        tokens_used: todaysUsage.tokens_used + tokensUsed,
        updated_at: new Date()
      })
      .where(eq(userTokenUsage.id, todaysUsage.id))
      .returning();

    return updated[0];
  }

  /**
   * Record both message and token usage in one operation
   */
  static async recordUsage(userId: string, tokensUsed: number): Promise<{
    usage: SelectUserTokenUsage;
    hasReachedLimit: boolean;
  }> {
    const todaysUsage = await this.getTodaysUsage(userId);
    
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
   * Get user's usage history for a date range
   */
  static async getUserUsageHistory(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<SelectUserTokenUsage[]> {
    return await db
      .select()
      .from(userTokenUsage)
      .where(
        and(
          eq(userTokenUsage.user_id, userId),
          gte(userTokenUsage.usage_date, startDate),
          lte(userTokenUsage.usage_date, endDate)
        )
      )
      .orderBy(userTokenUsage.usage_date);
  }

  /**
   * Update daily message limit for a user
   */
  static async updateDailyLimit(userId: string, newLimit: number): Promise<void> {
    const todaysUsage = await this.getTodaysUsage(userId);
    
    await db
      .update(userTokenUsage)
      .set({
        daily_message_limit: newLimit,
        updated_at: new Date()
      })
      .where(eq(userTokenUsage.id, todaysUsage.id));
  }

  /**
   * Get remaining messages for today
   */
  static async getRemainingMessages(userId: string): Promise<number> {
    const todaysUsage = await this.getTodaysUsage(userId);
    return Math.max(0, todaysUsage.daily_message_limit - todaysUsage.messages_sent);
  }

  /**
   * Reset usage for a specific date (useful for testing or admin operations)
   */
  static async resetUsageForDate(userId: string, date: string): Promise<void> {
    await db
      .update(userTokenUsage)
      .set({
        messages_sent: 0,
        tokens_used: 0,
        updated_at: new Date()
      })
      .where(
        and(
          eq(userTokenUsage.user_id, userId),
          eq(userTokenUsage.usage_date, date)
        )
      );
  }
}