import {tools} from "@/app/api/chat/tools";
import {
  InferUITools,
} from "ai";

export type Tools = InferUITools<typeof tools>;

