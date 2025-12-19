import { isUserSubscribed, getUserSubscription } from "@/services/subscriptionService";

/**
 * Utility functions for subscription management
 */

/**
 * Check if a user has an active subscription
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user has active subscription
 */
export async function checkUserSubscription(userId: string): Promise<boolean> {
  return await isUserSubscribed(userId);
}

/**
 * Get user subscription details
 * @param userId - The user ID to check
 * @returns Promise<SelectSubscription | null> - Subscription details or null
 */
export async function getUserSubscriptionDetails(userId: string) {
  return await getUserSubscription(userId);
}

/**
 * Check if a user should see the upgrade ribbon
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user should see upgrade ribbon
 */
export async function shouldShowUpgradeRibbon(userId: string): Promise<boolean> {
  const isSubscribed = await isUserSubscribed(userId);
  return !isSubscribed;
}

/**
 * Check if a user has unlimited messaging privileges
 * @param userId - The user ID to check  
 * @returns Promise<boolean> - True if user has unlimited messaging
 */
export async function hasUnlimitedMessages(userId: string): Promise<boolean> {
  return await isUserSubscribed(userId);
}