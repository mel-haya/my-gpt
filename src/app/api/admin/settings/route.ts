import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import {
  getSystemPrompt,
  updateSystemPrompt,
} from "@/services/settingsService";

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
    const systemPrompt = await getSystemPrompt();

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

    await updateSystemPrompt(systemPrompt);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
