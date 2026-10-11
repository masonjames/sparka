"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import type { JSX as ReactJSX } from "react";

import {
  Artifact,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  ChatLayout,
  ChatLayoutHandle,
  ChatLayoutMain,
  ChatLayoutSecondary,
} from "@/components/chat/chat-layout";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { Button } from "@/components/ui/button";
import { ArtifactProvider, useArtifact } from "@/hooks/use-artifact";
import type { DocumentAssistantRequest } from "@/lib/eve/document-contracts";
import { eveDocumentResult } from "@/lib/eve/document-contracts";
import type {
  ReadonlyEveMessage,
  ReadonlyEveMessagePart,
} from "@/lib/eve/readonly-message-types";
import type { ReadonlyReactNode } from "@/lib/readonly-react-node";
import { DocumentRun } from "@/tools/chatjs/document-run";
import { useTRPC } from "@/trpc/react";

import { EveDocumentActions } from "./eve-document-actions";
import { EveDocumentAssistantActions } from "./eve-document-assistant-actions";
import { DocumentBody } from "./eve-document-body";
import {
  EveDocumentContext,
  EveDocumentReplayContext,
} from "./eve-document-context";
import { useDocumentDraft } from "./use-document-draft";

const artifactRegionProps = { role: "region" as const };
const emptyEveMessages: readonly ReadonlyEveMessage[] = [];

interface DocumentActionProps {
  readonly messages?: readonly ReadonlyEveMessage[];
  readonly replaying?: boolean;
  readonly onStopExecution?: (conversationId: string) => Promise<void>;
  readonly isExecutionBusy?: (conversationId: string) => boolean;
  readonly getExecutionMessages?: (
    conversationId: string
  ) => readonly ReadonlyEveMessage[];
  readonly onDocumentAction?: (
    request: DocumentAssistantRequest
  ) => Promise<void>;
  readonly documentActionsDisabled?: boolean;
}

/* oxlint-disable typescript/strict-boolean-expressions, typescript/strict-void-return -- DocumentSaveStatus: react/jsx-max-depth: the existing accessible component hierarchy preserves layout, provider, and interaction boundaries; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including editing.error); typescript/strict-void-return: this library event API ignores the return value while the existing handler owns its async pending and error lifecycle. */

const DocumentSaveStatus = ({
  editing,
}: {
  readonly editing: {
    readonly retry: () => Promise<void>;
    readonly discard: () => void;
    readonly storageError: boolean;
    readonly error: string | undefined;
  };
}): React.JSX.Element => {
  const [, startEventAction] = React.useTransition();
  const handleRetry = editing.retry;
  const handleDiscard = editing.discard;
  return (
    <div className="shrink-0 space-y-2 px-4 text-sm">
      {editing.storageError && (
        <p role="alert">
          Draft recovery is unavailable in this browser. Keep this panel open
          until saved.
        </p>
      )}
      {editing.error && (
        <div className="space-y-2" role="alert">
          <p>{editing.error} Your draft has been kept.</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const completion = handleRetry();
                startEventAction(async () => {
                  await completion;
                });
              }}
              size="sm"
              variant="outline"
            >
              Retry save
            </Button>
            <Button onClick={handleDiscard} size="sm" variant="outline">
              Discard draft
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions, typescript/strict-void-return */
/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions -- EveArtifactPanel: max-lines-per-function: keep this cohesive render, state lifecycle, or integration scenario together; extraction needs a separate ownership decision; typescript/promise-function-async: return the existing promise directly; adding async changes synchronous throw behavior and promise identity; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including artifact.followLive). */

// This panel coordinates editor, revision, assistant, and recovery states.
// oxlint-disable-next-line eslint/complexity -- Review debt #620: split this state/render orchestration only after verifying its pending, recovery and failure transitions.
const EveArtifactPanel = ({
  conversationId,
  readOnly,
  onDocumentAction,
  documentActionsDisabled = false,
  messages = emptyEveMessages,
  executionBusy,
  onStop,
}: {
  readonly conversationId: string;
  readonly executionBusy?: boolean;
  readonly onStop?: () => Promise<void>;
  readonly readOnly: boolean;
} & DocumentActionProps): ReactJSX.Element => {
  const { artifact, closeArtifact, setArtifact } = useArtifact();
  const selectedRevisionId = artifact.followLive
    ? undefined
    : artifact.revisionId;
  const setSelectedRevisionId = useCallback(
    (revisionId: string | undefined) => {
      setArtifact((current) => ({
        ...current,
        followLive: revisionId === undefined,
        revisionId,
      }));
    },
    [setArtifact]
  );
  const [showChanges, setShowChanges] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const document = useQuery(
    trpc.eve.document.queryOptions(
      {
        conversationId,
        documentId: artifact.documentId,
        revisionId: selectedRevisionId,
      },
      { enabled: artifact.documentId !== "init" }
    )
  );
  const history = document.data?.history ?? [];
  const revision = document.data?.revision;
  const index = history.findIndex(
    (item: { readonly id: string }) => item.id === revision?.id
  );
  const previewing =
    artifact.status === "streaming" && artifact.followLive !== false;
  const owned = !readOnly && document.data?.canEdit;
  const onSaved = useCallback(async () => {
    // Hydrate the destination query before switching the view: an empty latest query would unmount the focused editor.

    // Query refreshes the destination document before changing revision selection so the focused editor stays mounted.
    await queryClient.query(
      trpc.eve.document.queryOptions(
        {
          conversationId,
          documentId: artifact.documentId,
        },
        { staleTime: 0 }
      )
    );
    setSelectedRevisionId(undefined);
    await queryClient.invalidateQueries({
      queryKey: trpc.eve.document.pathKey(),
    });
  }, [
    queryClient,
    trpc,
    conversationId,
    artifact.documentId,
    setSelectedRevisionId,
  ]);
  const editing = useDocumentDraft({
    conversationId,
    documentId: artifact.documentId,
    enabled: Boolean(owned && !document.isError),
    onRestore: setSelectedRevisionId,
    onSaved,
    revision,
  });
  const editable =
    owned &&
    !previewing &&
    editing.ready &&
    (Boolean(editing.draft) || index === history.length - 1);
  const contentProps = {
    content: previewing
      ? artifact.content
      : (editing.draft?.content ?? revision?.content ?? ""),
    currentVersionIndex: index,
    isCurrentVersion: index === history.length - 1,
    isReadonly: !editable,
    onSaveContent: editing.edit,
    status: previewing ? ("streaming" as const) : ("idle" as const),
  };
  const selectRevision = (id: string | undefined): void => {
    setSelectedRevisionId(id);
    setArtifact((current) => ({ ...current, followLive: id === undefined }));
  };
  const restoreVersion = (): void => {
    const latest = history.at(-1);
    if (!revision || !latest) {
      return;
    }
    editing.restore(revision.content, revision.title, latest.id);
  };
  const previousRevisionId = history[index - 1]?.id;
  const canCompare = Boolean(previousRevisionId && !editing.draft);
  const comparing = showChanges && canCompare;
  const actionsDisabled =
    document.isError ||
    documentActionsDisabled ||
    !editable ||
    Boolean(editing.draft);
  let subtitle = "Loading document…";
  if (revision?.createdAt) {
    subtitle = `Updated ${formatDistanceToNow(new Date(revision.createdAt), { addSuffix: true })}`;
  }
  if (editing.draft || editing.saving) {
    subtitle = "Saving changes...";
  }
  if (previewing) {
    subtitle = "Writing document…";
  }
  return (
    <>
      {}
      <Artifact
        aria-label="Document"
        className="relative h-full min-h-0 w-full rounded-none border-0"
        data-testid="artifact"
        {...artifactRegionProps}
      >
        <ArtifactHeader className="bg-background/80 shrink-0 items-start p-2">
          <div className="flex min-w-0 items-start gap-4">
            <ArtifactClose
              className="hover:bg-accent h-fit p-2"
              onClick={closeArtifact}
              variant="outline"
            />
            <div className="min-w-0">
              <ArtifactTitle className="break-words">
                {previewing
                  ? artifact.title
                  : (revision?.title ?? artifact.title)}
              </ArtifactTitle>
              <ArtifactDescription>{subtitle} </ArtifactDescription>
            </div>
          </div>
          {revision && !document.isError && (
            <EveDocumentActions
              canCompare={canCompare}
              comparing={comparing}
              content={contentProps.content}
              kind={revision.kind}
              onCompare={() => {
                setShowChanges((current) => !current);
              }}
              disabled={previewing}
              previousDisabled={Boolean(editing.draft) || index <= 0}
              nextDisabled={
                Boolean(editing.draft) || index >= history.length - 1
              }
              onPrevious={() => {
                selectRevision(history[index - 1]?.id);
              }}
              onNext={() => {
                selectRevision(
                  index + 1 === history.length - 1
                    ? undefined
                    : history[index + 1]?.id
                );
              }}
              run={
                DocumentRun && (
                  <DocumentRun
                    documentId={artifact.documentId}
                    revisionId={revision.id}
                    title={revision.title}
                    kind={revision.kind}
                    messages={messages}
                    disabled={actionsDisabled}
                    onAction={owned ? onDocumentAction : undefined}
                    buttonOnly
                  />
                )
              }
            />
          )}
        </ArtifactHeader>
        {owned && <DocumentSaveStatus editing={editing} />}
        <span className="sr-only">
          Version {index + 1} of {history.length}
        </span>
        {owned && !editing.draft && !editing.saving && (
          <span className="sr-only">All changes saved</span>
        )}
        <ArtifactContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {document.isPending && !previewing && (
            <DocumentSkeleton artifactKind={artifact.kind} />
          )}
          {document.isError && (
            <div className="space-y-2 p-4" role="alert">
              <p>
                This document could not be loaded. It may no longer be shared.
              </p>
              <Button
                onClick={() => {
                  void document.refetch();
                }}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          )}
          {previewing && (
            <DocumentBody
              editorProps={contentProps}
              kind={artifact.kind}
              title={artifact.title}
            />
          )}
          {revision && !document.isError && !previewing && (
            <DocumentBody
              comparison={
                comparing && previousRevisionId
                  ? {
                      content: revision.content,
                      conversationId,
                      documentId: artifact.documentId,
                      previousRevisionId,
                      version: index + 1,
                    }
                  : undefined
              }
              editorProps={contentProps}
              kind={revision.kind}
              title={revision.title}
            />
          )}
          {previewing && !revision && !readOnly && executionBusy && onStop && (
            <EveDocumentAssistantActions
              kind={artifact.kind}
              documentId={artifact.documentId}
              revisionId=""
              disabled
              busy
              onStop={onStop}
            />
          )}
          {owned &&
            index === history.length - 1 &&
            // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- #602: These independent conditions are combined as a boolean disjunction, not a nullish fallback.
            (onDocumentAction || onStop) &&
            revision && (
              <EveDocumentAssistantActions
                disabled={actionsDisabled}
                busy={executionBusy}
                onStop={onStop}
                documentId={artifact.documentId}
                kind={revision.kind}
                onAction={
                  onDocumentAction
                    ? (request: DocumentAssistantRequest) => {
                        // oxlint-disable-next-line unicorn/no-useless-undefined -- The selection callback requires an argument; undefined selects the live revision.
                        selectRevision(undefined);
                        return onDocumentAction(request);
                      }
                    : undefined
                }
                revisionId={revision.id}
              />
            )}
        </ArtifactContent>
        {revision && !document.isError && (
          <>
            {DocumentRun && (
              <DocumentRun
                disabled={actionsDisabled}
                documentId={artifact.documentId}
                kind={revision.kind}
                messages={messages}
                onAction={owned ? onDocumentAction : undefined}
                revisionId={revision.id}
                title={revision.title}
                resultOnly
              />
            )}
            {owned && index !== -1 && index < history.length - 1 && (
              <div className="bg-background flex flex-col justify-between gap-4 border-t p-4 lg:flex-row">
                <div>
                  <div>You are viewing a previous version</div>
                  <div className="text-muted-foreground text-sm">
                    Restore this version to make edits
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button
                    disabled={Boolean(editing.draft) || editing.saving}
                    onClick={restoreVersion}
                  >
                    Restore this version
                  </Button>
                  <Button
                    disabled={Boolean(editing.draft)}
                    variant="outline"
                    onClick={() => {
                      // oxlint-disable-next-line unicorn/no-useless-undefined -- The selection callback requires an argument; undefined selects the live revision.
                      selectRevision(undefined);
                    }}
                  >
                    Back to latest version
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Artifact>
    </>
  );
};
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */

/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions -- Layout: max-lines-per-function: keep this cohesive render, state lifecycle, or integration scenario together; extraction needs a separate ownership decision; typescript/promise-function-async: return the existing promise directly; adding async changes synchronous throw behavior and promise identity; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including ownerId). */

const Layout = ({
  children,
  conversationId,
  readOnly = false,
  onDocumentAction,
  documentActionsDisabled,
  messages,
  isExecutionBusy,
  getExecutionMessages,
  onStopExecution,
}: {
  readonly children: ReadonlyReactNode;
  readonly conversationId?: string;
  readonly readOnly?: boolean;
} & DocumentActionProps) => {
  const { artifact, setArtifact } = useArtifact();
  const ownerId = artifact.conversationId ?? conversationId;
  const busy = ownerId ? isExecutionBusy?.(ownerId) : undefined;
  const ownerMessages = ownerId ? getExecutionMessages?.(ownerId) : undefined;
  useEffect(() => {
    if (artifact.status !== "streaming" || !artifact.previewCallId) {
      return;
    }
    const call = ownerMessages
      ?.flatMap(
        (message: Readonly<{ parts: readonly ReadonlyEveMessagePart[] }>) =>
          message.parts
      )
      .find(
        (part) =>
          part.type === "dynamic-tool" &&
          part.toolCallId === artifact.previewCallId
      );
    if (call?.type === "dynamic-tool" && call.state === "output-available") {
      const result = eveDocumentResult.safeParse(call.output);
      if (result.success) {
        setArtifact((current) => ({
          ...current,
          content: "",
          date: result.data.date,
          documentId: result.data.documentId,
          kind: result.data.kind,
          previewCallId: undefined,
          revisionId: undefined,
          status: "idle",
          title: result.data.title,
        }));
        return;
      }
    }
    if (busy === false) {
      setArtifact((current) => ({
        ...current,
        isVisible: current.documentId !== "init" && current.isVisible,
        previewCallId: undefined,
        status: "idle",
      }));
    }
  }, [
    artifact.status,
    artifact.previewCallId,
    busy,
    ownerMessages,
    setArtifact,
  ]);
  const visible = Boolean(conversationId && artifact.isVisible);
  return (
    <ChatLayout isSecondaryPanelVisible={visible}>
      <ChatLayoutMain defaultSize={visible ? 65 : 100}>
        {children}
      </ChatLayoutMain>
      <ChatLayoutHandle />
      <ChatLayoutSecondary>
        {visible && conversationId && (
          <EveArtifactPanel
            conversationId={artifact.conversationId ?? conversationId}
            documentActionsDisabled={documentActionsDisabled}
            executionBusy={busy}
            onStop={
              ownerId && onStopExecution
                ? () => onStopExecution(ownerId)
                : undefined
            }
            key={`${artifact.conversationId ?? conversationId}:${artifact.documentId}`}
            messages={ownerMessages ?? messages}
            onDocumentAction={
              !artifact.conversationId ||
              artifact.conversationId === conversationId
                ? onDocumentAction
                : undefined
            }
            readOnly={readOnly}
          />
        )}
      </ChatLayoutSecondary>
    </ChatLayout>
  );
};
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */

export const EveArtifactLayout = (
  props: {
    readonly children: ReadonlyReactNode;
    readonly conversationId?: string;
    readonly logicalChatId?: string;
    readonly readOnly?: boolean;
  } & DocumentActionProps
): React.JSX.Element => (
  <ArtifactProvider key={props.logicalChatId ?? props.conversationId ?? "new"}>
    <EveDocumentContext.Provider value={props.conversationId}>
      <EveDocumentReplayContext.Provider value={props.replaying ?? false}>
        <Layout {...props} />
      </EveDocumentReplayContext.Provider>
    </EveDocumentContext.Provider>
  </ArtifactProvider>
);
