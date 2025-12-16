
import { getTodaysUsage, getRemainingMessages, hasReachedDailyLimit } from "@/services/tokenUsageService";
import { auth } from "@clerk/nextjs/server";



export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized - Please sign in", {
        status: 401,
      });
    }

    const todaysUsage = await getTodaysUsage(userId);
    const remainingMessages = await getRemainingMessages(userId);
    const hasReachedLimit = await hasReachedDailyLimit(userId);

    return Response.json({
      todaysUsage: {
        messages_sent: todaysUsage.messages_sent,
        tokens_used: todaysUsage.tokens_used,
        daily_message_limit: todaysUsage.daily_message_limit,
        usage_date: todaysUsage.usage_date,
      },
      remainingMessages,
      hasReachedLimit,
    });
  } catch (error) {
    console.error("Error getting usage status:", error);
    return new Response("Error getting usage status", {
      status: 500,
      statusText: String(error),
    });
  }
}

