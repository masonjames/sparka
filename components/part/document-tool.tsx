"use client";

import { memo, useEffect } from "react";
import { useArtifact } from "@/hooks/use-artifact";
import {
  type DocumentToolType,
  getToolKind,
  isEditTool,
} from "@/lib/ai/tools/documents/types";
import type { ChatMessage } from "@/lib/ai/types";
import { DocumentPreview } from "./document-preview";

type DocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: DocumentToolType }
>;

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
          date: output.date,
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

export const DocumentTool = memo(
  PureDocumentTool,
  (prevProps, nextProps) =>
    prevProps.tool.state === nextProps.tool.state &&
    prevProps.tool.input?.title === nextProps.tool.input?.title &&
    prevProps.tool.input?.content === nextProps.tool.input?.content &&
    prevProps.tool.output === nextProps.tool.output &&
    prevProps.tool.errorText === nextProps.tool.errorText &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.messageId === nextProps.messageId
);
