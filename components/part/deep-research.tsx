"use client";

import { useChatStoreApi } from "@ai-sdk-tools/store";
import { useDocuments } from "@/hooks/chat-sync-hooks";
import type { ChatMessage } from "@/lib/ai/types";
import { useMessageResearchUpdatePartByToolCallId } from "@/lib/stores/hooks-message-parts";
import { isLastArtifact } from "../is-last-artifact";
import { DocumentToolResult } from "./document-common";
import { DocumentPreview } from "./document-preview";
import { ResearchUpdates } from "./message-annotations";

export function DeepResearch({
  messageId,
  part,
  isReadonly,
}: {
  messageId: string;
  part: Extract<ChatMessage["parts"][number], { type: "tool-deepResearch" }>;
  isReadonly: boolean;
}) {
  const { toolCallId, state } = part;
  const researchUpdates = useMessageResearchUpdatePartByToolCallId(
    messageId,
    toolCallId
  );
  const chatStore = useChatStoreApi<ChatMessage>();

  // Get document info for the report
  const documentId =
    state === "output-available" &&
    part.output?.format === "report" &&
    part.output.status === "success"
      ? part.output.documentId
      : "";
  const { data: documents } = useDocuments(documentId, !documentId);
  const document = documents?.[0];

  if (state === "input-available") {
    return (
      <div className="flex w-full flex-col gap-3" key={toolCallId}>
        <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
      </div>
    );
  }
  if (state === "output-available") {
    const { output, input } = part;
    const shouldShowFullPreview = isLastArtifact(
      chatStore.getState().messages,
      toolCallId
    );

    if (output.format === "report" || output.format === "problem") {
      // Transform the output to match what DocumentToolResult/DocumentPreview expect
      const transformedResult =
        output.format === "report" && output.status === "success" && document
          ? {
              id: output.documentId,
              title: document.title,
              kind: document.kind,
            }
          : null;

      return (
        <div key={toolCallId}>
          <div className="mb-2">
            <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
          </div>
          {output.format === "report" &&
            transformedResult &&
            (shouldShowFullPreview ? (
              <DocumentPreview
                args={input}
                isReadonly={isReadonly}
                messageId={messageId}
                result={transformedResult}
                type="create"
              />
            ) : (
              <DocumentToolResult
                isReadonly={isReadonly}
                messageId={messageId}
                result={transformedResult}
                type="create"
              />
            ))}
        </div>
      );
    }
  }
  return null;
}
