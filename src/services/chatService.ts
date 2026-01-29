import { generateText, convertToModelMessages, stepCountIs } from "ai";
import { ChatMessage } from "@/types/chatMessage";
import { getSystemPrompt } from "@/services/settingsService";
import {
  tools,
  testTools,
  SearchKnowledgeBaseResult,
} from "@/app/api/chat/tools";
import { metadata } from "@/app/layout";

const supportedModels = [
  "openai/gpt-4o",
  "google/gemini-2.5-flash",
  "anthropic/claude-haiku-4.5",
  "xai/grok-4-fast-non-reasoning",
];

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  webSearch?: boolean;
  systemPrompt?: string;
  useTestTools?: boolean; // Use mocked tools that don't create actual DB entries
}

export interface ChatResponse {
  text: string;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

/**
 * Internal service function for generating chat completions
 * This bypasses the API route authentication and is intended for internal use like testing
 */
export async function generateChatCompletion(
  request: ChatRequest,
): Promise<string> {
  const response = await generateChatCompletionWithToolCalls(request);
  return response.text;
}

/**
 * Internal service function for generating chat completions with tool calls
 * Returns both the text response and tool call information
 */
export async function generateChatCompletionWithToolCalls(
  request: ChatRequest,
): Promise<ChatResponse> {
  try {
    const { messages, model, systemPrompt: customSystemPrompt } = request;

    const modelMessages = await convertToModelMessages(messages);

    const selectedModel = supportedModels.includes(model)
      ? model
      : "openai/gpt-4o";

    // Use custom system prompt if provided, otherwise get configurable system prompt
    let systemPrompt = "";
    if (customSystemPrompt) {
      systemPrompt = customSystemPrompt;
    } else {
      try {
        systemPrompt = await getSystemPrompt();
      } catch {
        systemPrompt = "You are a helpful assistant.";
      }
    }

    // Use test tools if requested (mocked createStaffRequest that doesn't create DB entries)
    const activeTools = request.useTestTools ? testTools : tools;

    const result = await generateText({
      messages: modelMessages,
      model: selectedModel,
      system: systemPrompt,
      tools: activeTools,
      stopWhen: stepCountIs(5),
    });

    // The result should contain the final text after tool execution
    if (!result.text || result.text.trim() === "") {
      throw new Error(
        `No text content generated from AI model ${selectedModel}`,
      );
    }

    // Extract tool calls information with their results
    const toolCalls =
      result.steps
        ?.filter((step) => step.toolCalls && step.toolCalls.length > 0)
        .flatMap((step) => {
          return step.toolCalls.map((toolCall) => {
            // Find the corresponding tool result
            const toolResult = step.toolResults?.find(
              (r) => r.toolCallId === toolCall.toolCallId,
            );

            // Extract args - handle both static and dynamic tool calls
            let args: Record<string, unknown> = {};
            if ("args" in toolCall) {
              args = toolCall.args as Record<string, unknown>;
            }

            // Extract result - the result might be nested differently
            let resultData: unknown = undefined;
            if (toolResult) {
              // Handle tool result wrapper structure
              const wrappedResult = toolResult as {
                result?: SearchKnowledgeBaseResult;
                content?: unknown;
              };

              if (wrappedResult.result !== undefined) {
                resultData = wrappedResult.result;
              } else if (wrappedResult.content !== undefined) {
                resultData = wrappedResult.content;
              } else {
                // If neither result nor content, store the whole object
                resultData = toolResult;
              }
            }

            return {
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: args,
              result: resultData,
            };
          });
        }) || [];

    return {
      text: result.text.trim(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: result.usage
        ? {
            promptTokens: result.usage.inputTokens || 0,
            completionTokens: result.usage.outputTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      cost: result.providerMetadata?.gateway?.cost as number,
    };
  } catch (error) {
    // For testing, return a simple fallback response to identify if the error is in AI generation
    console.error("Detailed error generating chat completion:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      model: request.model,
      hasTools: !!tools,
    });
    if (process.env.NODE_ENV === "development") {
      return {
        text: "This is a fallback response for testing purposes. The AI service is currently unavailable.",
      };
    }

    throw new Error(
      `Failed to generate chat completion: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
