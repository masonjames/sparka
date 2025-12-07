"use client";

import type { DynamicToolUIPart } from "ai";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

type DynamicToolPartProps = {
  messageId: string;
  isReadonly: boolean;
  part: DynamicToolUIPart;
};

export function DynamicToolPart({ part }: DynamicToolPartProps) {
  return (
    <Tool defaultOpen={true}>
      <ToolHeader
        state={part.state}
        title={part.title ?? part.toolName}
        type={`tool-${part.toolName}`}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          errorText={part.state === "output-error" ? part.errorText : undefined}
          output={part.state === "output-available" ? part.output : undefined}
        />
      </ToolContent>
    </Tool>
  );
}
