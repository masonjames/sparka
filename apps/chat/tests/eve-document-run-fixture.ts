import type { EveMessagePart } from "eve/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

import { EveDocumentRun } from "../tools/chatjs/saved-code-execution/document";

const input = {
  documentId: "60dbe86a-b2c4-4d32-ae09-a00e90b84e99",
  revisionId: "663ccf42-10c9-453f-b9da-ebf684a6da97",
};
const base = {
  input,
  toolCallId: "run",
  toolName: "runCodeDocument",
  type: "dynamic-tool" as const,
};
const states: {
  title: string;
  part?: EveMessagePart;
  disabled?: boolean;
  readOnly?: boolean;
}[] = [
  { title: "Ready" },
  { disabled: true, title: "Unsaved changes" },
  {
    disabled: true,
    part: { ...base, state: "input-available" },
    title: "Running",
  },
  {
    part: {
      ...base,
      errorText: "Code document not found.",
      state: "output-error",
    },
    title: "Execution error",
  },
  {
    part: {
      ...base,
      approval: { approved: false, id: "declined" },
      state: "output-denied",
    },
    title: "Declined",
  },
  {
    part: { ...base, output: {}, state: "output-available" },
    readOnly: true,
    title: "Malformed result",
  },
];

/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions --
 * typescript/promise-function-async (#606): process.stdout.write preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 * typescript/strict-boolean-expressions (#610): process.stdout.write intentionally keeps the existing falsy-value behavior of readOnly; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
process.stdout.write(
  renderToStaticMarkup(
    createElement(
      "main",
      { className: "mx-auto max-w-3xl space-y-4 p-4" },
      states.map(
        ({
          title,
          part,
          disabled,
          readOnly,
        }: ReadonlyNativeSurface<(typeof states)[number]>) =>
          createElement(
            "section",
            { className: "rounded border p-3", key: title },
            createElement("h2", null, title),
            createElement(EveDocumentRun, {
              ...input,
              disabled: disabled ?? false,
              kind: "code",
              messages: part
                ? [{ id: title, role: "assistant", parts: [part] }]
                : [],
              onAction: readOnly ? undefined : () => Promise.resolve(),
              title: "saved.js",
            })
          )
      )
    )
  )
);
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */
