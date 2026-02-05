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
  evaluateTestResponse,
  type TestWithUser,
} from "@/services/testsService";
import { getModelByStringId } from "@/services/modelsService";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // Check if user has admin role
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const { selectedModel, selectedEvaluatorModel, systemPrompt } =
      await req.json();

    if (!selectedModel || !selectedEvaluatorModel) {
      return NextResponse.json(
        { error: "Both model and evaluator model selections are required" },
        { status: 400 },
      );
    }

    // Resolve model ID
    const model = await getModelByStringId(selectedModel);
    if (!model) {
      return NextResponse.json(
        { error: "Invalid model selected" },
        { status: 400 },
      );
    }
    const modelId = model.id;

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
    const testIds = allTests.map((test) => test.id);
    await createAllTestRunResults(testRun.id, testIds);

    // Start running tests in the background
    runTestsInBackground(
      testRun.id,
      allTests,
      selectedModel,
      modelId,
      selectedEvaluatorModel,
      systemPrompt,
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
  modelId: number,
  selectedEvaluatorModel: string,
  systemPrompt?: string,
) {
  // Timeout helper
  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    return Promise.race([
      promise.then((result) => {
        clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise,
    ]);
  };

  try {
    // Create individual test runner functions
    const testPromises = tests.map(async (test) => {
      try {
        // Check if the test run has been stopped before start
        const currentStatus = await getTestRunStatus(testRunId);
        if (currentStatus === "Stopped") {
          console.log(
            `🛑 Test run ${testRunId} was stopped. Skipping test ${test.id}.`,
          );
          await updateTestRunResult({
            testRunId,
            testId: test.id,
            status: "Failed",
            output: "Test run was stopped",
            modelId,
            systemPrompt,
          });
          return { testId: test.id, status: "Stopped" };
        }

        // Update test result to Running status
        await updateTestRunResult({
          testRunId,
          testId: test.id,
          status: "Running",
        });

        console.log(`Running test ${test.id} with model: ${selectedModel}`);

        // Track execution time
        const startTime = Date.now();

        // Use internal chat service with a timeout (e.g., 3 minutes)
        // This prevents infinite hanging if the LLM provider doesn't respond
        const chatResponse = await withTimeout(
          generateChatCompletionWithToolCalls({
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
            systemPrompt: systemPrompt,
          }),
          90000, // 1 minute timeout for generation
          "Test execution timed out after 90 seconds",
        );

        const executionTime = Date.now() - startTime;

        if (!chatResponse.text.trim()) {
          throw new Error("No response content received from chat service");
        }

        // Check again if stopped before evaluation (in case it was stopped during chat)
        const statusBeforeEval = await getTestRunStatus(testRunId);
        if (statusBeforeEval === "Stopped") {
          console.log(
            `🛑 Test run ${testRunId} was stopped during test ${test.id}. Marking as stopped.`,
          );
          await updateTestRunResult({
            testRunId,
            testId: test.id,
            status: "Failed",
            output: "Test run was stopped during execution",
            modelId,
            systemPrompt,
          });
          return { testId: test.id, status: "Stopped" };
        }

        // Evaluate the response using the new evaluation function with timeout
        const evaluation = await withTimeout(
          evaluateTestResponse(
            test.prompt,
            test.expected_result,
            chatResponse.text.trim(),
            selectedEvaluatorModel,
          ),
          60000, // 1 minute timeout for evaluation
          "Evaluation timed out after 1 minute",
        );

        const finalResult = chatResponse.text.trim();
        const costInDollars = chatResponse.cost;

        // Mark test based on evaluation result
        const testStatus = evaluation.status;
        await updateTestRunResult({
          testRunId,
          testId: test.id,
          status: testStatus,
          output: finalResult,
          explanation: evaluation.explanation,
          toolCalls: chatResponse.toolCalls,
          modelId,
          systemPrompt,
          tokensCost: costInDollars ?? 0,
          executionTimeMs: executionTime,
          score: evaluation.score,
        });

        const statusEmoji = evaluation.status === "Success" ? "✅" : "❌";
        console.log(
          `${statusEmoji} Test ${test.id} completed with result: ${evaluation.status}`,
        );

        return { testId: test.id, status: testStatus };
      } catch (testError) {
        console.error(`❌ Error running test ${test.id}:`, testError);

        // Mark individual test as failed
        const errorMessage = `Error: ${
          testError instanceof Error ? testError.message : "Unknown error"
        }`;

        await updateTestRunResult({
          testRunId,
          testId: test.id,
          status: "Failed",
          output: errorMessage,
          modelId, // Use modelId here
          systemPrompt,
        });
        return { testId: test.id, status: "Failed", error: errorMessage };
      }
    });

    // Run all tests concurrently using Promise.allSettled
    console.log(`🚀 Starting ${tests.length} tests in parallel...`);
    const results = await Promise.allSettled(testPromises);

    // Check final status and log results
    const successCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === "Success",
    ).length;
    const failedCount = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && result.value.status === "Failed"),
    ).length;
    const stoppedCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === "Stopped",
    ).length;

    console.log(
      `📊 Test run ${testRunId} completed: ${successCount} passed, ${failedCount} failed, ${stoppedCount} stopped`,
    );

    // Mark the entire test run as done
    await updateTestRunStatus(testRunId, "Done");

    console.log(
      `🎉 Test run ${testRunId} completed with ${tests.length} tests`,
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
