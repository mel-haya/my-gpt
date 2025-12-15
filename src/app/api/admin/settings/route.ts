import { db } from "@/lib/db-config";
import { settings } from "@/lib/db-schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { checkRole } from "@/lib/checkRole";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return new Response("Forbidden - Admin access required", { status: 403 });
    }

    // Get system prompt setting
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "system_prompt"))
      .limit(1);

    const systemPrompt = result[0]?.value || `You are a helpful assistant with access to a knowledge base. 
When users ask questions, search the knowledge base for relevant information.
Always search before answering if the question might relate to uploaded documents.
Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`;

    return Response.json({ systemPrompt });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return new Response("Forbidden - Admin access required", { status: 403 });
    }

    const { systemPrompt } = await req.json();

    if (!systemPrompt || typeof systemPrompt !== "string") {
      return new Response("Invalid system prompt", { status: 400 });
    }

    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "system_prompt"))
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(settings)
        .set({ 
          value: systemPrompt,
          updated_at: new Date()
        })
        .where(eq(settings.key, "system_prompt"));
    } else {
      // Insert new setting
      await db.insert(settings).values({
        key: "system_prompt",
        value: systemPrompt,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}