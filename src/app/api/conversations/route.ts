import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response } from "next/server";
import { getConversationsByUserId } from "@/services/conversationsService";

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const conversations = await getConversationsByUserId(userId);
    return new Response(JSON.stringify(conversations), { status: 200 });
}