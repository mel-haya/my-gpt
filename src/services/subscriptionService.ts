import { SelectSubscription, InsertSubscription, subscriptions } from "@/lib/db-schema";
import { db } from "@/lib/db-config";

export async function addSubscription(
  userId: string
): Promise<SelectSubscription> {
  const insertSubscription: InsertSubscription = {
    user_id: userId,
    expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month from now
    created_date: new Date(),
  };
  const result = await db
    .insert(subscriptions)
    .values(insertSubscription)
    .returning();
  return result[0];
}