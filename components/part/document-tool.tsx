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

function getToolKind(toolType: DocumentTool["type"]): ArtifactKind {
  if (toolType.includes("Text")) {
    return "text";
  }
  if (toolType.includes("Code")) {
    return "code";
  }
  if (toolType.includes("Sheet")) {
    return "sheet";
  }
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
  const kind = getToolKind(tool.type);
  const isEdit = isEditTool(tool.type);

  const inputTitle = tool.input?.title ?? "";
  const inputContent = tool.input?.content ?? "";

  // Sync streaming content to artifact panel
  useEffect(() => {
    if (tool.state === "input-streaming" || tool.state === "input-available") {
      setArtifact((prev) => ({
        ...prev,
        documentId: "init",
        title: inputTitle,
        content: inputContent,
        kind,
        messageId,
        status: "streaming",
        ...(prev.status !== "streaming" && { isVisible: true }),
      }));
    }

    if (tool.state === "output-available" && tool.output) {
      const output = tool.output;
      if (output.status === "success") {
        setArtifact((prev) => ({
          ...prev,
          documentId: output.documentId,
          status: "idle",
        }));
      }
    }
  }, [tool, messageId, kind, inputTitle, inputContent, setArtifact]);

  if (tool.state === "output-error" || tool.output?.status === "error") {
    const output = tool.output;
    const error = output?.status === "error" ? output.error : tool.errorText;

    return (
      <div className="rounded border p-2 text-red-500">Error: {error}</div>
    );
  }

  if (
    tool.state === "input-streaming" ||
    tool.state === "input-available" ||
    (tool.state === "output-available" && tool.output)
  ) {
    return (
      <DocumentPreview
        args={{ title: inputTitle, kind }}
        isReadonly={isReadonly}
        messageId={messageId}
        result={{
          id: tool.output?.documentId ?? "init",
          title: inputTitle,
          kind,
        }}
        type={isEdit ? "update" : "create"}
      />
    );
  }

  return null;
}

export const DocumentTool = memo(PureDocumentTool);
