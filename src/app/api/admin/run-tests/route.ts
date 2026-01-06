import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { generateChatCompletionWithToolCalls } from "@/services/chatService";
import {
  createTestRun,
  getAllTests,
  createAllTestRunResults,
  updateTestRunResult,
  updateTestRunStatus,
  getTestRunStatus,
  markRemainingTestsAsStopped,
  evaluateTestResponse,
  type TestWithUser,
} from "@/services/testsService";

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
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { selectedModel, selectedEvaluatorModel } = await req.json();

    if (!selectedModel || !selectedEvaluatorModel) {
      return NextResponse.json(
        { error: "Both model and evaluator model selections are required" },
        { status: 400 }
      );
    }

    // Create a new test run
    const testRun = await createTestRun(userId);

    // Get all tests
    const allTests = await getAllTests();

    if (allTests.length === 0) {
      // Mark test run as done if no tests exist
      await updateTestRunStatus(testRun.id, "Done");
      return NextResponse.json({
        success: true,
        message: "No tests to run",
        testRunId: testRun.id,
      });
    }

    // Create all test run results immediately with pending status
    const testIds = allTests.map(test => test.id);
    await createAllTestRunResults(testRun.id, testIds);

    // Start running tests in the background
    runTestsInBackground(
      testRun.id,
      allTests,
      selectedModel,
      selectedEvaluatorModel
    );

    return NextResponse.json({
      success: true,
      message: "Tests started",
      testRunId: testRun.id,
    });
  } catch (error) {
    console.error("Error in run-tests API:", error);
    return NextResponse.json({ error: "Failed to run tests" }, { status: 500 });
  }
}

// Helper function to run tests in the background
async function runTestsInBackground(
  testRunId: number,
  tests: TestWithUser[],
  selectedModel: string,
  selectedEvaluatorModel: string
) {
  try {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];

      // Check if the test run has been stopped before processing each test
      const currentStatus = await getTestRunStatus(testRunId);
      if (currentStatus === "Stopped") {
        console.log(
          `🛑 Test run ${testRunId} was stopped. Marking remaining tests as stopped.`
        );
        // Mark all remaining tests that haven't started as stopped
        await markRemainingTestsAsStopped(testRunId);
        return; // Exit the function early
      }

      try {
        // Update test result to Running status
        await updateTestRunResult(testRunId, test.id, "Running");

        console.log(
          `Running test ${test.id} (${test.name}) with model: ${selectedModel}`
        );

        // Use internal chat service instead of making HTTP API calls
        const chatResponse = await generateChatCompletionWithToolCalls({
          messages: [
            {
              id: `test-${test.id}-${Date.now()}`,
              role: "user",
              parts: [
                {
                  type: "text",
                  text: test.prompt,
                },
              ],
            },
          ],
          model: selectedModel,
          webSearch: false,
        });

        if (!chatResponse.text.trim()) {
          throw new Error("No response content received from chat service");
        }

        // Evaluate the response using the new evaluation function
        const evaluation = await evaluateTestResponse(
          test.prompt,
          test.expected_result,
          chatResponse.text.trim(),
          selectedEvaluatorModel
        );

        // Store only the AI response in output, and evaluation explanation separately
        const finalResult = chatResponse.text.trim();

        // Mark test based on evaluation result
        const testStatus = evaluation.status;
        await updateTestRunResult(
          testRunId,
          test.id,
          testStatus,
          finalResult,
          evaluation.explanation,
          chatResponse.toolCalls
        );

        const statusEmoji = evaluation.status === "Success" ? "✅" : "❌";
        console.log(
          `${statusEmoji} Test ${test.id} (${test.name}) completed with result: ${evaluation.status}`
        );

        // Check if the test run has been stopped after completing this test
        const statusAfterTest = await getTestRunStatus(testRunId);
        if (statusAfterTest === "Stopped") {
          console.log(
            `🛑 Test run ${testRunId} was stopped after test ${test.id}. Marking remaining tests as stopped.`
          );
          // Mark all remaining tests that haven't started as stopped
          await markRemainingTestsAsStopped(testRunId);
          return; // Exit the function early
        }
      } catch (testError) {
        console.error(`❌ Error running test ${test.id}:`, testError);

        // Mark individual test as failed
        const errorMessage = `Error: ${
          testError instanceof Error ? testError.message : "Unknown error"
        }`;

        await updateTestRunResult(testRunId, test.id, "Failed", errorMessage);
      }
    }

    // Mark the entire test run as done
    await updateTestRunStatus(testRunId, "Done");

    console.log(
      `🎉 Test run ${testRunId} completed successfully with ${tests.length} tests`
    );
  } catch (error) {
    console.error("💥 Error in background test execution:", error);
    // Mark test run as failed
    try {
      await updateTestRunStatus(testRunId, "Failed");
    } catch (updateError) {
      console.error("Error updating test run status to failed:", updateError);
    }
  }
}
