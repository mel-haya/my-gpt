import { generateText, convertToModelMessages, stepCountIs } from "ai";
import { ChatMessage } from "@/types/chatMessage";
import {
  getTools,
  getTestTools,
  SearchKnowledgeBaseResult,
} from "@/app/api/chat/tools";
import { getModelByStringId } from "@/services/modelsService";

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
 * Internal service function for generating chat completions with tool calls
 * Returns both the text response and tool call information
 */
export async function generateChatCompletionWithToolCalls(
  request: ChatRequest,
): Promise<ChatResponse> {
  try {
    const { messages, model, systemPrompt: customSystemPrompt } = request;

    const modelMessages = await convertToModelMessages(messages);

    // Validate model exists in database
    const dbModel = await getModelByStringId(model);
    if (!dbModel) {
      throw new Error(`Model "${model}" is not registered in the database`);
    }
    const selectedModel = dbModel.model_id;

    // Require custom system prompt - no fallback
    if (!customSystemPrompt) {
      throw new Error("Missing custom system prompt");
    }
    const systemPrompt = customSystemPrompt;

    // Use test tools if requested (mocked createStaffRequest that doesn't create DB entries)
    const activeTools = request.useTestTools
      ? await getTestTools()
      : await getTools();

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
    console.error("Error generating chat completion:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      model: request.model,
    });

    throw new Error(
      `Failed to generate chat completion: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
