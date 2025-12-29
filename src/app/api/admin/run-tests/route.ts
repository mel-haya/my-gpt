import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { streamText, convertToModelMessages } from "ai";
import { getSystemPrompt } from "@/services/settingsService";
import { 
  createTestRun,
  getAllTests,
  createTestRunResult,
  updateTestRunResult,
  updateTestRunStatus,
  type TestWithUser
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
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { selectedModel } = await req.json();

    if (!selectedModel) {
      return NextResponse.json(
        { error: "Model selection is required" },
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
        testRunId: testRun.id
      });
    }

    // Start running tests in the background
    runTestsInBackground(testRun.id, allTests, selectedModel);

    return NextResponse.json({
      success: true,
      message: "Tests started",
      testRunId: testRun.id
    });
  } catch (error) {
    console.error("Error in run-tests API:", error);
    return NextResponse.json(
      { error: "Failed to run tests" },
      { status: 500 }
    );
  }
}

// Helper function to run tests in the background
async function runTestsInBackground(
  testRunId: number, 
  tests: TestWithUser[], 
  selectedModel: string
) {
  try {
    // Get the system prompt (same as used in chat API)
    const systemPrompt = await getSystemPrompt();
    
    for (const test of tests) {
      try {
        // Create initial test result record
        await createTestRunResult(testRunId, test.id, "Running");
        
        console.log(`Running test ${test.id} (${test.name}) with model: ${selectedModel}`);
        
        // Prepare messages for the AI model in the correct format
        const messages = [
          {
            id: `test-${test.id}-${Date.now()}`,
            role: 'user' as const,
            parts: [
              {
                type: 'text' as const,
                text: test.prompt
              }
            ]
          }
        ];

        // Call the AI model directly using the same approach as the chat API
        const result = await streamText({
          model: selectedModel,
          messages: convertToModelMessages(messages),
          system: systemPrompt,
        });

        // Collect the full response text from the stream
        let fullResponse = '';
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
        }

        // Mark test as successful since the AI responded without errors
        // We're not comparing with expected_result as requested
        const testResult = fullResponse;

        await updateTestRunResult(
          testRunId, 
          test.id, 
          "Success", 
          testResult
        );
        
        console.log(`✅ Test ${test.id} (${test.name}) completed successfully`);
        
      } catch (testError) {
        console.error(`❌ Error running test ${test.id}:`, testError);
        
        // Mark individual test as failed
        const errorMessage = `Error: ${testError instanceof Error ? testError.message : 'Unknown error'}`;

        await updateTestRunResult(
          testRunId, 
          test.id, 
          "Failed", 
          errorMessage
        );
      }
    }
    
    // Mark the entire test run as done
    await updateTestRunStatus(testRunId, "Done");
    
    console.log(`🎉 Test run ${testRunId} completed successfully with ${tests.length} tests`);
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