import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { generateObject } from 'ai';    
import { z } from 'zod';
import { generateChatCompletion } from "@/services/chatService";
import { 
  createTestRun,
  getAllTests,
  createTestRunResult,
  updateTestRunResult,
  updateTestRunStatus,
  getTestRunStatus,
  markRemainingTestsAsStopped,
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
        testRunId: testRun.id
      });
    }

    // Start running tests in the background
    runTestsInBackground(testRun.id, allTests, selectedModel, selectedEvaluatorModel);

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
  selectedModel: string,
  selectedEvaluatorModel: string
) {
  try {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      // Check if the test run has been stopped before processing each test
      const currentStatus = await getTestRunStatus(testRunId);
      if (currentStatus === "Stopped") {
        console.log(`🛑 Test run ${testRunId} was stopped. Marking remaining tests as stopped.`);
        // Mark all remaining tests that haven't started as stopped
        await markRemainingTestsAsStopped(testRunId, test.id);
        return; // Exit the function early
      }
      
      try {
        // Create initial test result record
        await createTestRunResult(testRunId, test.id, "Running");
        
        console.log(`Running test ${test.id} (${test.name}) with model: ${selectedModel}`);
        
        // Use internal chat service instead of making HTTP API calls
        const fullResponse = await generateChatCompletion({
          messages: [
            {
              id: `test-${test.id}-${Date.now()}`,
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: test.prompt
                }
              ]
            }
          ],
          model: selectedModel,
          webSearch: false
        });

        if (!fullResponse.trim()) {
          throw new Error('No response content received from chat service');
        }

        // Now evaluate the response using generateObject with system prompt
        // Define evaluation schema with simple enum output
        const evaluationSchema = z.object({
          result: z.enum(['success', 'fail']).describe('Whether the AI response is helpful and provides expected information'),
          explanation: z.string().describe('Brief explanation of why it passed or failed')
        });

        // Evaluate the response using generateObject with system prompt
        const { object: evaluation } = await generateObject({
          model: selectedEvaluatorModel,
          system: `You are an AI response evaluator. Your job is to evaluate if the AI output is helpful and provides the same information as would be expected for the given prompt. 
          
          Return 'success' if the response adequately answers the prompt and would be helpful to a user.
          Return 'fail' if the response is inadequate, unhelpful, or doesn't address the prompt properly.
          
          Be objective and fair in your assessment.`,
          prompt: `Evaluate this AI response:

Original Test Prompt: "${test.prompt}"

Expected Response: "${test.expected_result}"

AI Response: "${fullResponse.trim()}"

Determine if this is a success or fail.`,
          schema: evaluationSchema,
        });

        // Format the evaluation result
        const evaluationResult = `Result: ${evaluation.result}
Explanation: ${evaluation.explanation}`;

        // Combine the original response with the evaluation
        const finalResult = `AI Response:\n${fullResponse.trim()}\n\nEvaluation:\n${evaluationResult}`;

        // Mark test based on evaluation result
        const testStatus = evaluation.result === 'success' ? 'Success' : 'Failed';
        await updateTestRunResult(
          testRunId, 
          test.id, 
          testStatus, 
          finalResult
        );
        
        const statusEmoji = evaluation.result === 'success' ? '✅' : '❌';
        console.log(`${statusEmoji} Test ${test.id} (${test.name}) completed with result: ${evaluation.result}`);
        
        // Check if the test run has been stopped after completing this test
        const statusAfterTest = await getTestRunStatus(testRunId);
        if (statusAfterTest === "Stopped") {
          console.log(`🛑 Test run ${testRunId} was stopped after test ${test.id}. Marking remaining tests as stopped.`);
          // Mark all remaining tests that haven't started as stopped
          await markRemainingTestsAsStopped(testRunId, test.id);
          return; // Exit the function early
        }
        
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