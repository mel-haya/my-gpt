import { generateText, convertToModelMessages } from "ai";
import { ChatMessage } from "@/types/chatMessage";
import { getSystemPrompt } from "@/services/settingsService";

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
      systemPrompt = "You are a helpful assistant."; // Fallback
    }
    
    const result = await generateText({
      messages: modelMessages,
      model: selectedModel,
      system: systemPrompt,
    });
    
    if (!result.text || result.text.trim() === '') {
      throw new Error(`No text content generated from AI model ${selectedModel}`);
    }

    return result.text.trim();
  } catch (error) {
    // For testing, return a simple fallback response to identify if the error is in AI generation
    if (process.env.NODE_ENV === 'development') {
      return "This is a fallback response for testing purposes. The AI service is currently unavailable.";
    }
    
    throw new Error(`Failed to generate chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}