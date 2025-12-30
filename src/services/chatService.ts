import { generateText, convertToModelMessages, stepCountIs } from "ai";
import { ChatMessage } from "@/types/chatMessage";
import { getSystemPrompt } from "@/services/settingsService";
import { tools } from "@/app/api/chat/tools";


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
}

/**
 * Internal service function for generating chat completions
 * This bypasses the API route authentication and is intended for internal use like testing
 */
export async function generateChatCompletion(request: ChatRequest): Promise<string> {
  try {
    const { messages, model } = request;
    
    const modelMessages = convertToModelMessages(messages);
    
    const selectedModel = supportedModels.includes(model)
      ? model 
      : "openai/gpt-4o";
    
    // Get configurable system prompt
    let systemPrompt = '';
    try {
      systemPrompt = await getSystemPrompt();
    } catch (systemError) {
      systemPrompt = "You are a helpful assistant.";
    }
    
    const result = await generateText({
      messages: modelMessages,
      model: selectedModel,
      system: systemPrompt,
      tools,
      stopWhen: stepCountIs(2)
    });
    
    // The result should contain the final text after tool execution
    if (!result.text || result.text.trim() === '') {
      throw new Error(`No text content generated from AI model ${selectedModel}`);
    }

    return result.text.trim();
  } catch (error) {
    // For testing, return a simple fallback response to identify if the error is in AI generation
    console.error("Detailed error generating chat completion:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      model: request.model,
      hasTools: !!tools
    });
    if (process.env.NODE_ENV === 'development') {
      return "This is a fallback response for testing purposes. The AI service is currently unavailable.";
    }
    
    throw new Error(`Failed to generate chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}