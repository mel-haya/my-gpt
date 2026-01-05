import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { db } from "@/lib/db-config";
import { testRuns, testRunResults, tests } from "@/lib/db-schema";
import { eq, desc, count, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    // Check for any running test runs
    const [runningTestRun] = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        created_at: testRuns.created_at
      })
      .from(testRuns)
      .where(eq(testRuns.status, "Running"))
      .orderBy(desc(testRuns.created_at))
      .limit(1);

    let progress = null;
    
    // If there's a running test, get progress information
    if (runningTestRun) {
      // Get total test count from the tests table (all available tests)
      const [totalResult] = await db
        .select({ count: count() })
        .from(tests);
      
      // Get completed test count from testRunResults (Success, Failed, or Stopped status)
      const [completedResult] = await db
        .select({ count: count() })
        .from(testRunResults)
        .where(
          and(
            eq(testRunResults.test_run_id, runningTestRun.id),
            or(
              eq(testRunResults.status, "Success"),
              eq(testRunResults.status, "Failed"),
              eq(testRunResults.status, "Stopped")
            )
          )
        );

      const total = totalResult?.count || 0;
      const completed = completedResult?.count || 0;
      
      if (total > 0) {
        progress = { completed, total };
      }
    }

    return NextResponse.json({
      isRunning: !!runningTestRun,
      currentTestRunId: runningTestRun?.id || null,
      startedAt: runningTestRun?.created_at || null,
      progress
    });
  } catch (error) {
    console.error("Error in test-status API:", error);
    return NextResponse.json(
      { error: "Failed to get test status" },
      { status: 500 }
    );
  }
}