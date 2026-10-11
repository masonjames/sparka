"use client";
import type { DocumentBodyProps, DocumentUi } from "@/lib/eve/document-ui";
import type { Editor as EditorExport } from "./editor";
import React from "react";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EveDocumentComparison } from "./comparison";
import dynamic from "next/dynamic";

/* oxlint-disable typescript/promise-function-async -- Return the existing promise directly to preserve its identity and the current synchronous-throw boundary. */
const Editor = dynamic(
  () =>
    // oxlint-disable-next-line promise/prefer-await-to-then -- Next dynamic requires a loader promise selecting the named editor export.
    import("./editor").then(
      (
        editorModule: Readonly<{
          Editor: React.ExoticComponent<
            React.ComponentProps<typeof EditorExport>
          >;
        }>
      ) => editorModule.Editor
    ),
  {
    ssr: false,
  }
);
/* oxlint-enable typescript/promise-function-async */

export const documentUi: DocumentUi = {
  Body: ({
    inline,
    editorProps,
    comparison,
  }: ReadonlyNativeSurface<DocumentBodyProps>) => (
    <ScrollArea className="min-h-0 flex-1">
      {comparison ? (
        <EveDocumentComparison {...comparison} />
      ) : (
        <div
          className={
            inline === true
              ? "p-4 sm:px-14 sm:py-16"
              : "mx-auto max-w-3xl px-4 py-8"
          }
        >
          <Editor {...editorProps} />
        </div>
      )}
    </ScrollArea>
  ),
};
