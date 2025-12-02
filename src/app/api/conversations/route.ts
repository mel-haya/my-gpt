import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response } from "next/server";
import { deleteConversationById, getConversationsByUserId } from "@/services/conversationsService";

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("search");
    
    const conversations = await getConversationsByUserId(
        userId, 
        searchQuery || undefined
    );
    return new Response(JSON.stringify(conversations), { status: 200 });
}

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const conversationId = Number(searchParams.get("conversationId"));
    const deletedCount = await deleteConversationById(userId, conversationId);
    return new Response(JSON.stringify({ deletedCount }), { status: 202 });
}