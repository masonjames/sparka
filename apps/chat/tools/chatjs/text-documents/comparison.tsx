"use client";
import { Button } from "@/components/ui/button";
import { DocumentSkeleton } from "@/components/document-skeleton";
import React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

/* oxlint-disable typescript/promise-function-async -- Return the existing promise directly to preserve its identity and the current synchronous-throw boundary. */
const DiffView = dynamic(
  // Named exports need a promise projection for next/dynamic.
  // oxlint-disable-next-line promise/prefer-await-to-then -- Next dynamic expects a loader promise selecting the named DiffView export; this then maps the module to that component.
  () => import("./diffview").then((module) => module.DiffView),
  {
    loading: () => <DocumentSkeleton artifactKind="text" />,
    ssr: false,
  }
);
/* oxlint-enable typescript/promise-function-async */

export const EveDocumentComparison = ({
  conversationId,
  documentId,
  previousRevisionId,
  content,
  version,
}: {
  readonly conversationId: string;
  readonly documentId: string;
  readonly previousRevisionId: string;
  readonly content: string;
  readonly version: number;
}): React.JSX.Element => {
  const trpc = useTRPC();
  const previous = useQuery(
    trpc.eve.document.queryOptions({
      conversationId,
      documentId,
      revisionId: previousRevisionId,
    })
  );
  return (
    <section
      aria-label="Document changes"
      className="mx-auto max-w-3xl space-y-4 px-4 py-8"
    >
      <p className="text-muted-foreground text-sm">
        Changes from version {version - 1} to {version}
      </p>
      {previous.isPending && <DocumentSkeleton artifactKind="text" />}
      {previous.isError && (
        <div className="space-y-2" role="alert">
          <p>The previous version could not be loaded.</p>
          {}
          <Button
            onClick={(): void => {
              void previous.refetch();
            }}
            variant="outline"
          >
            Retry comparison
          </Button>
        </div>
      )}
      {previous.data && !previous.isError && (
        <DiffView
          newContent={content}
          oldContent={previous.data.revision.content}
        />
      )}
    </section>
  );
};
