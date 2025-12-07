"use client";

import { useChatStoreApi } from "@ai-sdk-tools/store";
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

    if (output.format === "report") {
      return (
        <div key={toolCallId}>
          <div className="mb-2">
            <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
          </div>
          {shouldShowFullPreview ? (
            <DocumentPreview
              args={input}
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="create"
            />
          ) : (
            <DocumentToolResult
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="create"
            />
          )}
        </div>
      );
    }
  }
  return null;
}
