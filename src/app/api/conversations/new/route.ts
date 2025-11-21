import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response } from "next/server";
import { addConversation } from "@/services/conversationsService";

export async function POST() {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const conversation = await addConversation(userId);
    return new Response(JSON.stringify(conversation), { status: 200 });
}