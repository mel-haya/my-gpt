import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response, NextRequest as Request } from "next/server";
import { changeConversationTitle } from "@/services/conversationsService";

export async function ALTER(req: Request) {
    const { userId } = await auth();
    const { conversationId, title } = await req.json();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const conversation = await changeConversationTitle(userId, conversationId, title);
    return new Response(JSON.stringify(conversation), { status: 200 });
}