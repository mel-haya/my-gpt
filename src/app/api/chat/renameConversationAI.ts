import { changeConversationTitle } from "@/services/conversationsService";
import { ChatMessage } from "@/types/chatMessage";
import { generateText, ModelMessage } from "ai";

async function renameConversationAI(
  messages: ModelMessage[],
  conversationId: number,
  userId: string
) {
  const systemPrompt = `You are an AI assistant that helps to generate a concise and relevant conversation title based on the content of the conversation.
   The title should accurately reflect the main topic or theme discussed in the conversation.
    Keep the title brief, ideally under 5 words, and avoid using generic phrases like "Chat" or "Conversation" don't give multiple options.`;
  const { text: aiGeneratedTitle } = await generateText({
    model: "openai/gpt-5-nano",
    messages,
    system: systemPrompt,
  });
  console.log("AI Generated Title:", aiGeneratedTitle);
  return changeConversationTitle(
    userId,
    conversationId,
    aiGeneratedTitle.trim()
  );
}

export { renameConversationAI };