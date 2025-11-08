import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  DocumentToolResult,
  DocumentToolCall,
  UpdateDocumentTool,
  hasProp,
  isArtifactToolResult,
  isLastArtifact,
} from "./document-common";
import { DocumentPreview } from "./document-preview";

export function UpdateDocumentMessage({
  tool,
  isReadonly,
  messageId,
}: {
  tool: UpdateDocumentTool;
  isReadonly: boolean;
  messageId: string;
}) {
  const chatStore = useChatStoreApi();
  if (tool.state === "input-available") {
    const input = tool.input;
    const title =
      hasProp(input, "title") && typeof input.title === "string"
        ? input.title
        : undefined;
    return (
      <DocumentToolCall type="update" args={{ title }} isReadonly={isReadonly} />
    );
  }
  const { output, input, toolCallId } = tool;
  if (!output) {
    return null;
  }
  const shouldShowFullPreview = isLastArtifact(
    chatStore.getState().messages,
    toolCallId
  );
  if ("error" in output) {
    return (
      <div className="rounded border p-2 text-red-500">Error: {String(output.error)}</div>
    );
  }
  if (!isArtifactToolResult(output)) {
    return null;
  }
  return shouldShowFullPreview ? (
    <DocumentPreview
      args={input}
      isReadonly={isReadonly}
      messageId={messageId}
      result={output}
      type="update"
    />
  ) : (
    <DocumentToolResult
      isReadonly={isReadonly}
      messageId={messageId}
      result={output}
      type="update"
    />
  );
}


