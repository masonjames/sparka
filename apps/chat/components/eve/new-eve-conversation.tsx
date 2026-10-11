"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { JSX as ReactJSX } from "react";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { ChatWelcomeView } from "@/components/chat/chat-welcome-view";
import { ThinkingMessage } from "@/components/thinking-message";
import type { SelectedModelValue, UiToolName } from "@/lib/ai/types";
import {
  expandSelectedModelValue,
  getPrimarySelectedModelId,
} from "@/lib/ai/types";
import { CreationRejectedError } from "@/lib/eve/create-conversation";
import { draftMessage, restoreDraft } from "@/lib/eve/draft";
import {
  finishCreation,
  prepareSelectedCreation,
  readCreationRequest,
} from "@/lib/eve/pending-create";
import { resolveCreationRequest } from "@/lib/eve/resolve-creation-request";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";
import {
  useDefaultModel,
  useModelChange,
} from "@/providers/default-model-provider";

import { EveComposer } from "./eve-composer";
import { EveCreationRecovery } from "./eve-creation-recovery";
import { EveInitialMessage } from "./eve-initial-message";
import { useEveRuntime } from "./eve-logical-context";
import { EveOptimisticResponseGroup } from "./eve-optimistic-response-group";
import { useEveAttachments } from "./use-eve-attachments";
/* oxlint-disable typescript/strict-boolean-expressions, typescript/strict-void-return -- NewEveConversation: ; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including projectId); typescript/strict-void-return: this library event API ignores the return value while the existing handler owns its async pending and error lifecycle
 */

export const NewEveConversation = ({
  ownerId,
  projectId,
  onPendingChange,
}: {
  readonly ownerId: string;
  readonly projectId?: string;
  readonly onPendingChange?: (pending: boolean) => void;
}): ReactJSX.Element => {
  const [, startEventAction] = React.useTransition();
  const openRuntime = useEveRuntime();
  const scope = useMemo((): { projectId: string } | undefined => {
    if (typeof projectId === "string" && projectId !== "") {
      return { projectId };
    }
    return undefined;
  }, [projectId]);
  const selectedModel = useDefaultModel();
  const changeModel = useModelChange();
  const [selection, setSelection] = useState<SelectedModelValue>();
  const files = useEveAttachments();
  const { setAttachments } = files;
  const [draft, setDraft] = useState("");
  const [selectedTool, setSelectedTool] = useState<UiToolName | null>(null);
  const [cleanupRejected, setCleanupRejected] = useState(false);
  const [projectRejected, setProjectRejected] = useState(false);
  const [retainedOperationId, setRetainedOperationId] = useState<string>();
  const retained = retainedOperationId !== undefined;
  const [retainedModelId, setRetainedModelId] = useState<string>();
  const [retainedModelIds, setRetainedModelIds] = useState<readonly string[]>();
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [optimisticComparison, setOptimisticComparison] =
    useState<
      Extract<
        ReturnType<typeof prepareSelectedCreation>,
        { readonly modelIds: readonly string[] }
      >
    >();
  const lock = useRef(false);
  useEffect(() => {
    onPendingChange?.(busy || retained);
  }, [busy, retained, onPendingChange]);
  useEffect(() => {
    try {
      const pending = readCreationRequest(sessionStorage, ownerId, scope);
      if (pending) {
        // oxlint-disable-next-line react/set-state-in-effect -- Hydrate the recovery composer from its durable request.
        setRetainedOperationId(pending.operationId);
        setSelectedTool(pending.selectedTool ?? null);
        const restored = restoreDraft(pending.message);
        setDraft(restored.text);
        setAttachments(restored.attachments);
        setRetainedModelIds(
          "modelIds" in pending ? pending.modelIds : undefined
        );
        setRetainedModelId("modelIds" in pending ? undefined : pending.modelId);
      }
    } catch {
      setFailure("The saved draft could not be restored.");
    }
  }, [ownerId, scope, setAttachments]);
  const retainOperation = (
    operation: ReadonlyNativeSurface<ReturnType<typeof prepareSelectedCreation>>
  ): void => {
    setDraft(restoreDraft(operation.message).text);
    setSelectedTool(operation.selectedTool ?? null);
    setRetainedModelId("modelIds" in operation ? undefined : operation.modelId);
    setRetainedModelIds(
      "modelIds" in operation ? operation.modelIds : undefined
    );
    setOptimisticComparison("modelIds" in operation ? operation : undefined);
    setRetainedOperationId(operation.operationId);
  };
  const submit = async (): Promise<void> => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailure("");
    let navigating = false;
    /* oxlint-disable react/todo -- Preserve operation lock cleanup across navigation and errors. */
    try {
      const modelIds = expandSelectedModelValue(selection ?? selectedModel);
      const operation = prepareSelectedCreation(
        sessionStorage,
        ownerId,
        draftMessage(draft, files.attachments),
        modelIds,
        scope,
        selectedTool ?? undefined
      );
      retainOperation(operation);
      const binding = await resolveCreationRequest(
        sessionStorage,
        ownerId,
        operation,
        scope
      );
      await openRuntime({ ...binding, operation, ownerId });
      navigating = true;
    } catch (error) {
      if (
        error instanceof CreationRejectedError &&
        error.projectUnavailable &&
        projectId
      ) {
        setProjectRejected(true);
      } else if (error instanceof CreationRejectedError) {
        try {
          finishCreation(sessionStorage, ownerId, scope);
          setRetainedModelId(undefined);
          setRetainedModelIds(undefined);
          setOptimisticComparison(undefined);
          setRetainedOperationId(undefined);
        } catch {
          setCleanupRejected(true);
          setFailure(
            "The rejected request could not be cleared. Keep this tab for recovery."
          );
          return;
        }
      }
      setFailure(
        error instanceof Error
          ? error.message
          : "Unable to start. Retain this operation before retrying."
      );
      // oxlint-disable-next-line react/todo -- React Compiler cannot analyze required operation lock cleanup in finally.
    } finally {
      lock.current = false;
      if (!navigating) {
        setBusy(false);
      }
    }
    /* oxlint-enable react/todo */
  };
  const clearRejected = (): void => {
    try {
      finishCreation(sessionStorage, ownerId, scope);
      setRetainedModelId(undefined);
      setRetainedModelIds(undefined);
      setOptimisticComparison(undefined);
      setRetainedOperationId(undefined);
      setCleanupRejected(false);
      setFailure("");
    } catch {
      setFailure(
        "The rejected request could not be cleared. Keep this tab for recovery."
      );
    }
  };
  if (projectRejected || (retained && !busy)) {
    return (
      <EveCreationRecovery
        firstMessage={draft}
        initiallyRejected={projectRejected || cleanupRejected}
        initialFailure={failure}
        onClearRejected={cleanupRejected ? clearRejected : undefined}
        operationId={retainedOperationId}
        ownerId={ownerId}
        scope={scope}
      />
    );
  }
  const composer = (
    <>
      <EveComposer
        autoFocus
        status={busy ? "submitted" : "ready"}
        disabled={busy}
        draft={busy ? "" : draft}
        files={busy ? { ...files, attachments: [] } : files}
        modelSelection={{
          onChange: async (value) => {
            setSelection(value);
            const primary = getPrimarySelectedModelId(value);
            if (primary) {
              await changeModel(primary);
            }
          },
          value: selection ?? selectedModel,
        }}
        onDraftChange={(value) => {
          // Clearing the controlled editor must not erase the saved send intent.
          if (!busy) {
            setDraft(value);
          }
        }}

        onSubmit={() => {
          const completion = submit();
          startEventAction(async () => {
            await completion;
          });
        }}
        onToolChange={setSelectedTool}
        readOnly={retained}
        retainedModelId={retainedModelId}
        retainedModelIds={retainedModelIds}
        selectedTool={selectedTool}
      />
      {failure && <p role="alert">{failure}</p>}
    </>
  );
  if (busy) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {optimisticComparison ? (
              <EveOptimisticResponseGroup operation={optimisticComparison} />
            ) : (
              <EveInitialMessage
                message={draftMessage(draft, files.attachments)}
              />
            )}
            {!optimisticComparison && <ThinkingMessage />}
            <output className="sr-only">Sending…</output>
          </ConversationContent>
        </Conversation>
        <div className="mx-auto w-full max-w-3xl p-4">{composer}</div>
      </div>
    );
  }
  if (projectId) {
    return composer;
  }
  return <ChatWelcomeView>{composer}</ChatWelcomeView>;
};
/* oxlint-enable typescript/strict-boolean-expressions, typescript/strict-void-return */
