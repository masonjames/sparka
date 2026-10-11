"use client";

import React from "react";

import { McpToolResult } from "@/components/part/mcp-tool-result";
import { eveMcpResult } from "@/lib/eve/mcp-result";
import type { ReadonlyEveMessagePart } from "@/lib/eve/readonly-message-types";

/* oxlint-disable typescript/strict-boolean-expressions -- no-undefined: undefined preserves the optional prop, cache, or missing-value contract; null is a different value; react-perf/jsx-no-new-object-as-prop: this prop object derives from current render state or feature styling; hoisting changes its ownership; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including failed). */

export const EveMcpResult = ({
  part,
  defaultOpen,
}: {
  readonly part: Extract<
    ReadonlyEveMessagePart,
    { readonly type: "dynamic-tool" }
  >;
  readonly defaultOpen?: boolean;
}): React.JSX.Element => {
  const result =
    part.state === "output-available"
      ? eveMcpResult.safeParse(part.output)
      : undefined;
  const failed = part.state === "output-error" || (result && !result.success);
  return (
    <McpToolResult
      defaultOpen={defaultOpen}
      part={{
        errorText: failed
          ? "MCP tool failed. Check the connector in settings and try again."
          : undefined,
        input: part.input,
        output: result?.success ? result.data.output : undefined,
        state: failed ? "output-error" : part.state,
        toolName: part.toolName,
      }}
    />
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */
