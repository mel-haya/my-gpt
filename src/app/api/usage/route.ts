import { NextRequest, NextResponse } from "next/server";
import { TokenUsageService } from "@/services/tokenUsageService";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from '@/lib/checkRole';


export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized - Please sign in", {
        status: 401,
      });
    }

    const todaysUsage = await TokenUsageService.getTodaysUsage(userId);
    const remainingMessages = await TokenUsageService.getRemainingMessages(userId);
    const hasReachedLimit = await TokenUsageService.hasReachedDailyLimit(userId);

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

// export async function PUT(req: NextRequest) {
//   try {
    
//     const isAdmin = await checkRole('admin');
//         if (!isAdmin) {
//           return NextResponse.json(
//             { error: 'Unauthorized. Admin access required.' },
//             { status: 403 }
//           );
//         }

//     const { newLimit } = await req.json();

//     if (!newLimit || typeof newLimit !== 'number' || newLimit < 1) {
//       return new Response("Invalid limit provided", {
//         status: 400,
//       });
//     }

//     await TokenUsageService.updateDailyLimit(userId, newLimit);

//     return Response.json({
//       success: true,
//       message: `Daily limit updated to ${newLimit} messages`,
//     });
//   } catch (error) {
//     console.error("Error updating daily limit:", error);
//     return new Response("Error updating daily limit", {
//       status: 500,
//       statusText: String(error),
//     });
//   }
// }