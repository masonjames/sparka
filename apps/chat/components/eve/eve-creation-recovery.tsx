"use client";

import { useRouter } from "next/navigation";
import type { JSX as ReactJSX } from "react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CreationRejectedError } from "@/lib/eve/create-conversation";
import { eveMessageTitle } from "@/lib/eve/message-input";
import {
  moveRejectedProjectCreation,
  readCreationRequest,
} from "@/lib/eve/pending-create";
import type { CreationScope } from "@/lib/eve/pending-create";
import { resolveCreationRequest } from "@/lib/eve/resolve-creation-request";
/* oxlint-disable typescript/strict-boolean-expressions, typescript/strict-void-return -- EveCreationRecovery: ; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including scope?.projectId); typescript/strict-void-return: this library event API ignores the return value while the existing handler owns its async pending and error lifecycle
 */

// oxlint-disable-next-line complexity -- Keep the existing persisted-request, project fallback and rejected-cleanup branches in the same recovery owner.
export const EveCreationRecovery = ({
  ownerId,
  operationId,
  firstMessage,
  scope,
  initiallyRejected = false,
  initialFailure = "",
  onClearRejected,
}: {
  readonly ownerId: string;
  readonly operationId?: string;
  readonly firstMessage: string;
  readonly scope?: Readonly<CreationScope>;
  readonly initiallyRejected?: boolean;
  readonly initialFailure?: string;
  readonly onClearRejected?: () => void;
}): ReactJSX.Element => {
  const [, startEventAction] = React.useTransition();
  const router = useRouter();
  const lock = useRef(false);
  const [pending, setPending] =
    useState<ReturnType<typeof readCreationRequest>>();
  const [rejected, setRejected] = useState(initiallyRejected);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Reset recovery state when the server-provided rejection status changes.
    setRejected(initiallyRejected);
    try {
      const saved = readCreationRequest(sessionStorage, ownerId, scope);
      setPending(
        saved &&
          (typeof operationId === "string" && operationId !== ""
            ? saved.operationId === operationId
            : scope?.projectId && saved.projectId === scope.projectId)
          ? saved
          : undefined
      );
    } catch {
      setFailure("The saved request could not be restored.");
    }
    setLoaded(true);
  }, [ownerId, operationId, scope, initiallyRejected]);

  const retry = async (): Promise<void> => {
    if (!pending || lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailure("");
    /* oxlint-disable react/todo -- Preserve the recovery lock cleanup in finally. */
    try {
      const { id } = await resolveCreationRequest(
        sessionStorage,
        ownerId,
        pending,
        scope
      );
      globalThis.location.assign(`/chat/${id}`);
    } catch (error) {
      if (error instanceof CreationRejectedError && scope?.projectId) {
        setRejected(true);
      }
      setFailure(
        error instanceof Error ? error.message : "Unable to recover. Try again."
      );
      // oxlint-disable-next-line react/todo -- React Compiler cannot analyze required recovery lock cleanup in finally.
    } finally {
      lock.current = false;
      setBusy(false);
    }
    /* oxlint-enable react/todo */
  };
  const continueWithoutProject = (): void => {
    if (!(rejected && pending && scope?.projectId)) {
      return;
    }
    try {
      moveRejectedProjectCreation(
        sessionStorage,
        ownerId,
        scope.projectId,
        pending.operationId
      );
      globalThis.location.assign("/");
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Unable to restore the draft."
      );
    }
  };

  let status = "Checking the saved request…";
  if (loaded) {
    status = pending
      ? "Conversation creation is unconfirmed. Retry the saved request to recover it."
      : "This browser does not have the original request. Return to the tab where you sent it, or check again if creation is still running.";
  }
  if (rejected && onClearRejected) {
    status =
      "The original request was rejected. Clear the saved request before sending again.";
  } else if (rejected) {
    status =
      "The original request was rejected. You can continue with the saved message outside this project.";
  }
  return (
    <section
      aria-label="Conversation recovery"
      className="mx-auto w-full max-w-3xl space-y-4 p-4"
    >
      <p className="break-words whitespace-pre-wrap">
        {pending ? eveMessageTitle(pending.message) : firstMessage}
      </p>
      <output className="block">{status}</output>
      {(failure || initialFailure) && (
        <p role="alert">{failure || initialFailure}</p>
      )}
      {rejected && onClearRejected && (
        <Button onClick={onClearRejected}>Clear rejected request</Button>
      )}
      {rejected && !onClearRejected && scope?.projectId ? (
        <Button onClick={continueWithoutProject}>
          Continue without project
        </Button>
      ) : null}
      {!rejected && pending ? (
        <Button
          disabled={busy}

          onClick={() => {
            const completion = retry();
            startEventAction(async () => {
              await completion;
            });
          }}
        >
          {busy ? "Recovering…" : "Retry creation"}
        </Button>
      ) : null}
      {!pending && (
        <Button
          disabled={!loaded}
          onClick={() => {
            router.refresh();
          }}
          variant="outline"
        >
          Check again
        </Button>
      )}
    </section>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions, typescript/strict-void-return */
