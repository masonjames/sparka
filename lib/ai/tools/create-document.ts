import type { ModelId } from "@/lib/ai/app-models";
import type { ToolSession } from "@/lib/ai/tools/types";
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import type { DocumentHandler } from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";
import type { StreamWriter } from "../types";

type ArtifactToolResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
};

/**
 * Utility function for creating documents with custom handlers.
 * Used by deep-research for report generation.
 * For regular document creation, use the createTextDocument/createCodeDocument/createSheetDocument tools.
 */
export async function createDocument({
  dataStream,
  kind,
  title,
  description,
  session,
  prompt,
  messageId,
  selectedModel,
  documentHandler,
}: {
  dataStream: StreamWriter;
  kind: ArtifactKind;
  title: string;
  description: string;
  session: ToolSession;
  prompt: string;
  messageId: string;
  selectedModel: ModelId;
  documentHandler: DocumentHandler<ArtifactKind>;
}): Promise<ArtifactToolResult> {
  const id = generateUUID();

  dataStream.write({
    type: "data-kind",
    data: kind,
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: id,
    transient: true,
  });

  dataStream.write({
    type: "data-messageId",
    data: messageId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  await documentHandler.onCreateDocument({
    id,
    title,
    description,
    dataStream,
    session,
    prompt,
    messageId,
    selectedModel,
  });

  dataStream.write({ type: "data-finish", data: null, transient: true });

  return {
    id,
    title,
    kind,
    content: "A document was created and is now visible to the user.",
  };
}
