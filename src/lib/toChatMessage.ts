import { ChatMessage } from "@/types/chatMessage";
import { SelectMessage } from "@/lib/db-schema";
import {UIMessagePart, UIDataTypes} from "ai";
import { Tools } from "@/types/Tools";

export function toChatMessage(selectMessage: SelectMessage): ChatMessage 
{
  return {
    id: selectMessage.id.toString(),
    role: selectMessage.role,
    parts: selectMessage.parts as UIMessagePart<UIDataTypes, Tools>[],
  };
}