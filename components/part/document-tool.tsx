"use client";

import { memo, useEffect } from "react";
import { useArtifact } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import { DocumentPreview } from "./document-preview";

type CreateTextDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-createTextDocument" }
>;
type CreateCodeDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-createCodeDocument" }
>;
type CreateSheetDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-createSheetDocument" }
>;
type EditTextDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-editTextDocument" }
>;
type EditCodeDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-editCodeDocument" }
>;
type EditSheetDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-editSheetDocument" }
>;

type DocumentTool =
  | CreateTextDocumentTool
  | CreateCodeDocumentTool
  | CreateSheetDocumentTool
  | EditTextDocumentTool
  | EditCodeDocumentTool
  | EditSheetDocumentTool;

type DocumentToolOutput = {
  status: "streaming" | "complete";
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
};

function isDocumentToolOutput(output: unknown): output is DocumentToolOutput {
  if (typeof output !== "object" || output === null) return false;
  const o = output as Record<string, unknown>;
  return (
    typeof o.status === "string" &&
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.kind === "string" &&
    typeof o.content === "string"
  );
}

function isErrorOutput(output: unknown): output is { error: string } {
  if (typeof output !== "object" || output === null) return false;
  return "error" in output && typeof (output as { error: unknown }).error === "string";
}

function getToolKind(
  toolType: DocumentTool["type"]
): ArtifactKind {
  if (toolType.includes("Text")) return "text";
  if (toolType.includes("Code")) return "code";
  if (toolType.includes("Sheet")) return "sheet";
  return "text";
}

function isEditTool(toolType: DocumentTool["type"]): boolean {
  return toolType.startsWith("tool-edit");
}

type DocumentToolComponentProps = {
  tool: DocumentTool;
  isReadonly: boolean;
  messageId: string;
};

function PureDocumentTool({
  tool,
  isReadonly,
  messageId,
}: DocumentToolComponentProps) {
  const { setArtifact } = useArtifact();
  const isEdit = isEditTool(tool.type);
  const kind = getToolKind(tool.type);
  const output = tool.output as DocumentToolOutput | { error: string } | undefined;

  // Sync streaming content to artifact panel
  useEffect(() => {
    if (output && isDocumentToolOutput(output)) {
      setArtifact({
        documentId: output.id,
        title: output.title,
        content: output.content,
        kind: output.kind,
        messageId,
        isVisible: true,
        status: output.status === "streaming" ? "streaming" : "idle",
      });
    }
  }, [output, messageId, setArtifact]);

  // Handle input-available state (tool is being called)
  if (tool.state === "input-available") {
    const title = "title" in tool.input ? tool.input.title : undefined;
    return (
      <DocumentPreview
        args={{ title, kind }}
        isReadonly={isReadonly}
        messageId={messageId}
        type={isEdit ? "update" : "create"}
      />
    );
  }

  // Handle error output
  if (output && isErrorOutput(output)) {
    return (
      <div className="rounded border p-2 text-red-500">
        Error: {output.error}
      </div>
    );
  }

  // Handle no output
  if (!output || !isDocumentToolOutput(output)) {
    return null;
  }

  // Handle streaming and complete states
  return (
    <DocumentPreview
      args={{ title: output.title, kind: output.kind }}
      isReadonly={isReadonly}
      messageId={messageId}
      result={{
        id: output.id,
        title: output.title,
        kind: output.kind,
      }}
      type={isEdit ? "update" : "create"}
    />
  );
}

export const DocumentTool = memo(PureDocumentTool);
