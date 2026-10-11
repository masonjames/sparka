import type { ToolContext } from "eve/tools";

import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

import type { ToolOutput, ToolResult } from "./tool-result";

type CodeExecutionInput = Readonly<{
  code: string;
  language: "python" | "javascript";
  title: string;
}>;

type CodeExecutionContext = Pick<
  ToolContext,
  "abortSignal" | "callId" | "session"
>;

/* oxlint-disable typescript/consistent-type-definitions -- typescript/consistent-type-definitions (#559): CodeExecutionOutput preserves its current alias/interface semantics; declaration merging and implicit index-signature assignability differ between those forms. */
type CodeExecutionOutput = { chart: ToolOutput; message: string };
/* oxlint-enable typescript/consistent-type-definitions */

/** Executes exact source and owns its single usage receipt under the invoking tool call. */
type CodeExecutor = (
  input: CodeExecutionInput,
  context: ReadonlyNativeSurface<CodeExecutionContext>
) => Promise<ToolResult<CodeExecutionOutput>>;

export type {
  CodeExecutionContext,
  CodeExecutionInput,
  CodeExecutionOutput,
  CodeExecutor,
};
