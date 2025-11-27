import { tools } from "@/app/api/chat/tools";
import { Tool } from "ai";

export type Tools = typeof tools & {
  webSearch?: Tool;
};
