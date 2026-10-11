"use client";

import { createElement } from "react";

import { getEveInstalledToolRenderer } from "@/lib/ai/tool-renderer-registry";
import type { ReadonlyEveMessagePart } from "@/lib/eve/readonly-message-types";
import { toolOutputSchema } from "@/lib/eve/tool-result";

/* oxlint-disable typescript/strict-boolean-expressions -- EveToolResult: ; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including platformOutput?.success)
 */

export const EveToolResult = ({
  part,
  messageId,
  isReadonly,
}: {
  readonly part: Extract<
    ReadonlyEveMessagePart,
    { readonly type: "dynamic-tool" }
  >;
  readonly messageId: string;
  readonly isReadonly: boolean;
}) => {
  const Renderer = getEveInstalledToolRenderer(`tool-${part.toolName}`);
  if (!Renderer) {
    return null;
  }
  const platformOutput =
    part.state === "output-available"
      ? toolOutputSchema.safeParse(part.output)
      : null;
  if (platformOutput?.success && platformOutput.data.status === "error") {
    return createElement(Renderer, {
      isReadonly,
      messageId,
      tool: {
        ...part,
        errorText: platformOutput.data.error,
        state: "output-error",
        updates: platformOutput.data.updates,
      },
    });
  }
  const tool = platformOutput?.success
    ? {
        ...part,
        output: platformOutput.data.output,
        updates: platformOutput.data.updates,
      }
    : part;
  return createElement(Renderer, { isReadonly, messageId, tool });
};
/* oxlint-enable typescript/strict-boolean-expressions */
