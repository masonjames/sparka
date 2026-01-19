import type { CostAccumulator } from "@/lib/credits/cost-accumulator";
import type { ModelId } from "../../app-models";
import type { ToolSession } from "../types";

export type DocumentToolResult =
  | {
      status: "success";
      documentId: string;
      result: string;
    }
  | {
      status: "error";
      error: string;
    };

export type DocumentToolContext = {
  session: ToolSession;
  // dataStream: StreamWriter;
  messageId: string;
  selectedModel: ModelId;
  costAccumulator?: CostAccumulator;
};
