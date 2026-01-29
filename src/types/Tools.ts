import { getTools } from "@/app/api/chat/tools";
import { Tool } from "ai";

export type Tools = Awaited<ReturnType<typeof getTools>> & {
  webSearch?: Tool;
};
