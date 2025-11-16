"use client";

import { memo } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { FileIcon } from "../icons";

export type ReadDocumentTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-readDocument" }
>;

function PureReadDocument({ tool }: { tool: ReadDocumentTool }) {
  if (tool.state === "input-available") {
    return null;
  }
  const result = tool.output;
  if (!result) {
    return null;
  }

  return (
    <div className="flex w-fit items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground">
      <FileIcon />
      <div className="flex items-center gap-1 text-left text-sm">
        <div className="">Read</div>
        <div className="">&ldquo;{result.title}&rdquo;</div>
      </div>
    </div>
  );
}

export const ReadDocument = memo(PureReadDocument, () => true);
