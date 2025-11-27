import { Tools } from "./Tools";
import { UIMessage, UIDataTypes, InferUITools } from "ai";

export type ChatMessage = UIMessage<never, UIDataTypes, InferUITools<Tools>>;
