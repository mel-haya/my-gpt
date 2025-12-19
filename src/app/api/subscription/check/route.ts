import { auth } from "@clerk/nextjs/server";
import { isUserSubscribed } from "@/services/subscriptionService";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const isSubscribed = await isUserSubscribed(userId);

    return Response.json({
      isSubscribed,
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}