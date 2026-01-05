import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { updateTestRunStatus } from "@/services/testsService";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { testRunId } = await req.json();

    if (!testRunId) {
      return NextResponse.json(
        { error: "Test run ID is required" },
        { status: 400 }
      );
    }

    // Update the test run status to stopped
    await updateTestRunStatus(testRunId, "Stopped");

    return NextResponse.json({
      success: true,
      message: "Test run stop signal sent"
    });
  } catch (error) {
    console.error("Error in stop-tests API:", error);
    return NextResponse.json(
      { error: "Failed to stop tests" },
      { status: 500 }
    );
  }
}