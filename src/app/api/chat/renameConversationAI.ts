import { changeConversationTitle } from "@/services/conversationsService";
import { generateText, ModelMessage } from "ai";

async function renameConversationAI(
  messages: ModelMessage[],
  conversationId: number,
  userId: string | null,
  previousTitle?: string,
) {
  const systemPrompt = `You are an AI assistant that helps generate a concise conversation title based on the messages. Keep it under 5 words and avoid generic phrases like "Chat" or "Conversation".${previousTitle ? ` Current title: "${previousTitle}". Only suggest a new title if it would be significantly better.` : ""} Output ONLY the title text with no thinking, no prefixes like "Title:", and no explanations.`;
  const { text: aiGeneratedTitle } = await generateText({
    model: "openai/gpt-5-nano",
    messages,
    system: systemPrompt,
  });
  return changeConversationTitle(
    userId,
    conversationId,
    aiGeneratedTitle.trim(),
  );
}

export { renameConversationAI };
