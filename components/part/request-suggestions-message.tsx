import {
  DocumentToolCall,
  DocumentToolResult,
  hasProp,
  isArtifactToolResult,
  type RequestSuggestionsTool,
} from "./document-common";

export function RequestSuggestionsMessage({
  tool,
  isReadonly,
  messageId,
}: {
  tool: RequestSuggestionsTool;
  isReadonly: boolean;
  messageId: string;
}) {
  if (tool.state === "input-available") {
    const input = tool.input;
    const title =
      hasProp(input, "title") && typeof input.title === "string"
        ? input.title
        : undefined;
    return (
      <DocumentToolCall
        args={{ title }}
        isReadonly={isReadonly}
        type="request-suggestions"
      />
    );
  }
  const { output } = tool;
  if (!output) {
    return null;
  }
  if ("error" in output) {
    return (
      <div className="rounded border p-2 text-red-500">
        Error: {String(output.error)}
      </div>
    );
  }
  if (!isArtifactToolResult(output)) {
    return null;
  }
  return (
    <DocumentToolResult
      isReadonly={isReadonly}
      messageId={messageId}
      result={output}
      type="request-suggestions"
    />
  );
}
