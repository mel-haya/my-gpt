export interface HistoryConversation {
  id: number;
  title: string | null;
  userId: string;
  username: string | null;
  email: string | null;
  messageCount: number;
  lastMessageAt: string;
}

export type HistoryMessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolName: string;
      toolCallId: string;
      args: Record<string, unknown>;
    }
  | { type: "tool-result"; toolCallId: string; result: unknown };
