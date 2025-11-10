import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  DocumentToolResult,
  CreateDocumentTool,
  isArtifactToolResult,
} from "./document-common";
import { DocumentPreview } from "./document-preview";
import { isLastArtifact } from "../isLastArtifact";

export function CreateDocumentMessage({
  tool,
  isReadonly,
  messageId,
}: {
  tool: CreateDocumentTool;
  isReadonly: boolean;
  messageId: string;
}) {
  const chatStore = useChatStoreApi();
  if (tool.state === "input-available") {
    return (
      <DocumentPreview
        args={tool.input}
        isReadonly={isReadonly}
        messageId={messageId}
      />
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
      type="create"
    />
  ) : (
    <DocumentToolResult
      isReadonly={isReadonly}
      messageId={messageId}
      result={output}
      type="create"
    />
  );
}


