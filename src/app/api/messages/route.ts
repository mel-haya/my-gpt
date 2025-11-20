import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response, NextRequest as Request } from "next/server";
import { getMessagesByConversationId } from "@/services/messagesService";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const conversationId = Number(searchParams.get("conversationId"));
    const messages = await getMessagesByConversationId(conversationId);
    return new Response(JSON.stringify(messages), { status: 200 });
  } catch (error) {
    return new Response("Error processing request", {
      status: 500,
      statusText: String(error),
    });
  }
}
