import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { db } from "@/lib/db-config";
import { testRuns, testRunResults, tests } from "@/lib/db-schema";
import { eq, desc, count} from "drizzle-orm";

export async function GET() {
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

    // Get the latest test run (running or most recent)
    const [latestTestRun] = await db
      .select({
        id: testRuns.id,
        status: testRuns.status,
        created_at: testRuns.created_at
      })
      .from(testRuns)
      .orderBy(desc(testRuns.created_at))
      .limit(1);

    let progress = null;
    
    // If there's a test run, get detailed progress information
    if (latestTestRun) {
      // Get total test count from the tests table (all available tests)
      const [totalResult] = await db
        .select({ count: count() })
        .from(tests);

      // Get status counts for the latest test run
      const statusCounts = await db
        .select({
          status: testRunResults.status,
          count: count()
        })
        .from(testRunResults)
        .where(eq(testRunResults.test_run_id, latestTestRun.id))
        .groupBy(testRunResults.status);

      const total = totalResult?.count || 0;
      
      // Initialize all statuses with 0
      const statusMap = {
        "Pending": 0,
        "Running": 0,
        "Success": 0,
        "Failed": 0,
        "Evaluating": 0,
        "Stopped": 0
      };

      // Update with actual counts
      statusCounts.forEach(({ status, count }) => {
        if (status in statusMap) {
          statusMap[status as keyof typeof statusMap] = count;
        }
      });
      
      progress = {
        ...statusMap,
        total
      };
    }

    const isRunning = latestTestRun?.status === "Running";

    return NextResponse.json({
      isRunning,
      currentTestRunId: latestTestRun?.id || null,
      startedAt: latestTestRun?.created_at || null,
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