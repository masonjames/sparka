import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import type { CostAccumulator } from "@/lib/credits/cost-accumulator";
import type { ModelId } from "../../app-models";
import type { ToolSession } from "../types";

export type DocumentToolResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  status: "streaming" | "complete" | "error";
};

export type DocumentToolProps = {
  session: ToolSession;
  // dataStream: StreamWriter;
  messageId: string;
  selectedModel: ModelId;
  costAccumulator?: CostAccumulator;
};
