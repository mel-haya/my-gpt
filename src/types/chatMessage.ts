import { Tools } from "./Tools";
import { UIMessage, UIDataTypes } from "ai";

export type ChatMessage = UIMessage<never, UIDataTypes, Tools>;
