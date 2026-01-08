import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { systemPrompts } from "@/lib/db-schema";
import { checkRole } from "@/lib/checkRole";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkRole("admin", userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [activePrompt] = await db
      .select()
      .from(systemPrompts)
      .where(and(eq(systemPrompts.user_id, userId), eq(systemPrompts.is_active, true)))
      .limit(1);

    if (!activePrompt) {
      return NextResponse.json(
        { error: "No active system prompt found" },
        { status: 404 }
      );
    }

    return NextResponse.json(activePrompt);
  } catch (error) {
    console.error("Error fetching active system prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch active system prompt" },
      { status: 500 }
    );
  }
}