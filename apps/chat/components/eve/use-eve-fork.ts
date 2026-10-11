"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useTransition } from "react";

import type { SelectedModelValue, UiToolName } from "@/lib/ai/types";
import { expandSelectedModelValue, isSelectedModelValue } from "@/lib/ai/types";
import type { EveForkInput } from "@/lib/eve/contracts";
import { CreationRejectedError } from "@/lib/eve/create-conversation";
import type { DraftAttachment } from "@/lib/eve/draft";
import { draftMessage } from "@/lib/eve/draft";
import { eveUserForkBoundary, resolveForkSource } from "@/lib/eve/fork-source";
import type { EveMessageInput } from "@/lib/eve/message-input";
import { eveMessageTool } from "@/lib/eve/message-tool-selection";
import {
  finishCreation,
  prepareCreation,
  prepareResponseGroupCreation,
  readCreationRequest,
} from "@/lib/eve/pending-create";
import type {
  ReadonlyEveMessage,
  ReadonlyEveMessageInput,
  ReadonlyEveMessagePart,
} from "@/lib/eve/readonly-message-types";
import { resolveCreationRequest } from "@/lib/eve/resolve-creation-request";
import { responseModel } from "@/lib/eve/response-model";
import { useDefaultModel } from "@/providers/default-model-provider";
import { useTRPC } from "@/trpc/react";

import { useEveRuntime } from "./eve-logical-context";
import { useEveAttachments } from "./use-eve-attachments";

type Operation<Request = NonNullable<ReturnType<typeof readCreationRequest>>> =
  Request extends { message: EveMessageInput | ReadonlyEveMessageInput }
    ? Omit<Request, "message"> & { readonly message: ReadonlyEveMessageInput }
    : never;

interface EditContext {
  readonly events?: Parameters<typeof responseModel>[0];
  readonly modelSelection?: SelectedModelValue;
  readonly response?: ReadonlyEveMessage;
}

const responseModelSelection = (
  response: {
    readonly metadata?:
      | {
          readonly turnId?: string | undefined;
          readonly modelId?: string | undefined;
        }
      | undefined;
  },
  events: Parameters<typeof responseModel>[0]
): Extract<SelectedModelValue, string> | undefined => {
  const modelId = responseModel(
    events,
    response.metadata?.turnId ?? "",
    response.metadata?.modelId
  );
  if (isSelectedModelValue(modelId)) {
    return modelId;
  }
  return undefined;
};

/* oxlint-disable typescript/strict-boolean-expressions -- operationModelSelection: no-magic-numbers: these existing UI dimensions, timing values, marker offsets, or fixture expectations are part of this feature behavior (including 0); typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including operation.modelId). */

const operationModelSelection = (
  operation: Operation
): SelectedModelValue | undefined => {
  if (!("modelIds" in operation)) {
    if (operation.modelId && isSelectedModelValue(operation.modelId)) {
      return operation.modelId;
    }
    return undefined;
  }
  const selection: Record<string, number> = {};
  for (const modelId of operation.modelIds) {
    selection[modelId] = (selection[modelId] ?? 0) + 1;
  }
  if (isSelectedModelValue(selection)) {
    return selection;
  }
  return undefined;
};
/* oxlint-enable typescript/strict-boolean-expressions */
/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions -- useEveFork: ; typescript/promise-function-async: return the existing promise directly; adding async changes synchronous throw behavior and promise identity; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including editingMessageId)
 */

export const useEveFork = (
  ownerId: string,
  conversationId: string,
  onComparisonStarted?: (
    message: ReadonlyEveMessageInput,
    selectedTool: UiToolName | undefined,
    clearComposer: boolean
  ) => void
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const restoreAttachments = useMutation(
    trpc.eve.restoreAttachments.mutationOptions()
  );
  const family = useQuery(
    trpc.eve.branches.queryOptions({ id: conversationId })
  );
  const openRuntime = useEveRuntime();
  const [isNavigating, startTransition] = useTransition();
  const selectedModel = useDefaultModel();
  const files = useEveAttachments();
  const { setAttachments } = files;
  const [draft, setDraft] = useState("");
  const [selectedTool, setSelectedTool] = useState<UiToolName | null>(null);
  const [modelSelectionValue, setModelSelectionValue] =
    useState<SelectedModelValue>();
  const [source, setSource] = useState<EveForkInput>();
  const [pending, setPending] = useState<Operation>();
  const [editingBoundary, setEditingBoundary] = useState<string>();
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const [editRestoreFailed, setEditRestoreFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [failure, setFailure] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    try {
      const operation: Operation | undefined = readCreationRequest(
        sessionStorage,
        ownerId,
        {
          conversationId,
        }
      );
      if (operation) {
        if (!operation.fork) {
          // oxlint-disable-next-line react/todo -- Preserve the explicit missing-fork recovery error.
          throw new Error("Missing saved fork source.");
        }
        // oxlint-disable-next-line react/set-state-in-effect -- Hydrate the controlled fork editor from its durable request.
        setPending(operation);
        setModelSelectionValue(operationModelSelection(operation));
        setSelectedTool(operation.selectedTool ?? null);
        setSource(operation.fork);
        if (operation.forkKind === "edit") {
          setEditingBoundary(
            operation.fork.beforeTurnId ?? operation.fork.beforeMessageId
          );
        }
        setDraft(
          typeof operation.message === "string"
            ? operation.message
            : operation.message
                .filter(
                  (
                    part
                  ): part is Extract<
                    Exclude<ReadonlyEveMessageInput, string>[number],
                    { readonly type: "text" }
                  > => part.type === "text"
                )
                .map((part) => part.text)
                .join("\n")
        );
        setAttachments(
          typeof operation.message === "string"
            ? []
            : operation.message
                .filter(
                  (
                    part
                  ): part is Extract<
                    Exclude<ReadonlyEveMessageInput, string>[number],
                    { readonly type: "file" }
                  > => part.type === "file"
                )
                .map((part) => ({
                  contentType: part.mediaType,
                  digest: "",
                  name: part.filename,
                  url: part.data,
                }))
        );
      }
    } catch {
      setRestoreFailed(true);
      setFailure(
        "The saved version request could not be restored. Keep this tab for recovery."
      );
      // oxlint-disable-next-line react/todo -- React Compiler cannot analyze required restore cleanup in finally.
    } finally {
      setLoaded(true);
    }
  }, [conversationId, ownerId, setAttachments]);

  const execute = async (operation: Operation): Promise<void> => {
    const binding = await resolveCreationRequest(
      sessionStorage,
      ownerId,
      operation,
      {
        conversationId,
      }
    );
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.eve.branches.pathKey(),
        refetchType: "none",
      }),
      queryClient.invalidateQueries({ queryKey: trpc.eve.list.pathKey() }),
    ]);
    await openRuntime({ ...binding, operation, ownerId });
    startTransition(() => {
      // App Router Activity can keep this source route mounted while its successor
      // is active. Clear the fulfilled editor in the navigation transition so
      // recovery cannot revive an operation storage has already released.
      setPending(undefined);
      setEditingMessageId(undefined);
      setEditingBoundary(undefined);
      setSource(undefined);
      setDraft("");
      setSelectedTool(null);
      setModelSelectionValue(undefined);
      setEditRestoreFailed(false);
      setAttachments([]);
    });
  };
  const run = async (action: () => Promise<void>): Promise<void> => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailure("");
    try {
      await action();
    } catch (error) {
      if (error instanceof CreationRejectedError) {
        setRejected(true);
        try {
          finishCreation(sessionStorage, ownerId, { conversationId });
          setPending(undefined);
          setRejected(false);
        } catch {
          setFailure(
            "The rejected version request could not be cleared. Keep this tab for recovery."
          );
          return;
        }
      }
      setFailure(
        error instanceof Error ? error.message : "Unable to create a version."
      );
      // oxlint-disable-next-line react/todo -- React Compiler cannot analyze required fork lock cleanup in finally.
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const begin = (
    message: ReadonlyEveMessage,
    regeneration?: {
      readonly response: ReadonlyEveMessage;
      readonly events: Parameters<typeof responseModel>[0];
    },
    editContext?: EditContext
  ): Promise<void> =>
    run(async () => {
      const boundary = eveUserForkBoundary(message);
      if (pending || editingMessageId || !family.data || !boundary) {
        return;
      }
      const responseSelection = editContext?.response
        ? responseModelSelection(editContext.response, editContext.events ?? [])
        : undefined;
      const editingSelection =
        editContext?.modelSelection ?? responseSelection ?? selectedModel;
      const modelId = regeneration
        ? responseModelSelection(regeneration.response, regeneration.events)
        : undefined;
      const fork = resolveForkSource(
        conversationId,
        boundary,
        family.data.branches
      );
      const text = message.parts
        .filter((part: ReadonlyEveMessagePart) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      const originalTool = eveMessageTool(message);
      setSelectedTool(originalTool);
      setModelSelectionValue(editingSelection);
      setDraft(text);
      setSource(fork);
      if (!regeneration) {
        setEditRestoreFailed(false);
        setEditingBoundary(boundary);
        setEditingMessageId(message.id);
        files.setAttachments([]);
      }
      // Re-upload the exact native bytes; never silently drop a file on an edit.
      let attachments: DraftAttachment[];
      try {
        attachments = message.parts.some(
          (part: ReadonlyEveMessagePart) => part.type === "file"
        )
          ? await restoreAttachments.mutateAsync({
              conversationId,
              messageId: message.id,
            })
          : [];
      } catch (error) {
        if (!regeneration) {
          setEditRestoreFailed(true);
        }
        throw error;
      }
      files.setAttachments(attachments);
      if (regeneration) {
        if (!modelId || typeof modelId !== "string") {
          throw new Error(
            "The response model is unavailable. Reload before regenerating."
          );
        }
        const operation = prepareCreation(
          sessionStorage,
          ownerId,
          draftMessage(text, attachments),
          modelId,
          { conversationId, fork, forkKind: "regenerate" },
          originalTool ?? undefined
        );
        setPending(operation);
        await execute(operation);
      } else {
        setEditingMessageId(message.id);
      }
    });
  return {
    begin,
    busy,
    cancelEdit: () => {
      if (busy || pending || isNavigating) {
        return;
      }
      setEditingMessageId(undefined);
      setEditingBoundary(undefined);
      setEditRestoreFailed(false);
      setSource(undefined);
      setFailure("");
    },
    compare: (
      message: ReadonlyEveMessageInput,
      modelIds: readonly string[],
      beforeTurnId: string,
      requestedTool?: UiToolName,
      clearComposer = true
    ) =>
      run(async () => {
        if (!loaded || restoreFailed || pending || editingMessageId) {
          return;
        }
        const operation = prepareResponseGroupCreation(
          sessionStorage,
          ownerId,
          message,
          modelIds,
          {
            conversationId,
            fork: {
              beforeTurnId,
              checkpointId: crypto.randomUUID(),
              conversationId,
            },
          },
          requestedTool
        );
        onComparisonStarted?.(
          operation.message,
          operation.selectedTool,
          clearComposer
        );
        setPending(operation);
        await execute(operation);
      }),
    draft,
    editingBoundary,
    editingMessageId,
    error: failure,
    family,
    files,
    locked:
      !loaded ||
      restoreFailed ||
      editRestoreFailed ||
      busy ||
      isNavigating ||
      Boolean(pending),
    modelSelection: {
      onChange: (value: SelectedModelValue) => {
        if (busy || pending || isNavigating) {
          return Promise.resolve();
        }
        setModelSelectionValue(value);
        return Promise.resolve();
      },
      value: modelSelectionValue ?? selectedModel,
    },
    pending,
    rejected,
    retry: () =>
      run(async () => {
        if (pending && rejected) {
          try {
            finishCreation(sessionStorage, ownerId, { conversationId });
            setPending(undefined);
            setRejected(false);
          } catch {
            setFailure(
              "The rejected version request could not be cleared. Keep this tab for recovery."
            );
          }
        } else if (pending) {
          await execute(pending);
        }
      }),
    selectedTool,
    setDraft,
    setSelectedTool,
    submit: () =>
      run(async () => {
        if (
          !loaded ||
          restoreFailed ||
          editRestoreFailed ||
          isNavigating ||
          pending ||
          !source
        ) {
          return;
        }
        const modelIds = expandSelectedModelValue(
          modelSelectionValue ?? selectedModel
        );
        const message = draftMessage(draft, files.attachments);
        const operation =
          modelIds.length > 1
            ? prepareResponseGroupCreation(
                sessionStorage,
                ownerId,
                message,
                modelIds,
                { conversationId, fork: source, forkKind: "edit" },
                selectedTool ?? undefined
              )
            : prepareCreation(
                sessionStorage,
                ownerId,
                message,
                modelIds[0],
                { conversationId, fork: source, forkKind: "edit" },
                selectedTool ?? undefined
              );
        setPending(operation);
        await execute(operation);
      }),
  };
};
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */
