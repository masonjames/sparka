"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  eveMessageDelivery,
  eveMessageOperationId,
} from "@/lib/eve/message-delivery";
import type { PendingEveMessage } from "@/lib/eve/message-delivery";

export const useEveMessageDelivery = (sessionId: string) => {
  const [pending, setPending] = useState<PendingEveMessage | null>(null);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React requires an initial ref value; undefined represents the uninitialized state.
  const pendingRef = useRef<PendingEveMessage | null | undefined>(undefined);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React requires an initial ref value; undefined represents the uninitialized state.
  const acknowledged = useRef<string | undefined>(undefined);

  useEffect(() => {
    const stored = eveMessageDelivery.read(sessionStorage, sessionId);
    pendingRef.current = stored;
    acknowledged.current = undefined;
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize the selected session with its browser delivery journal.
    setPending(stored);
    if (stored) {
      setPending((current) => {
        const restored = current ?? stored;
        pendingRef.current = restored;
        return restored;
      });
    }
  }, [sessionId]);

  const accept = useCallback(
    (event: Parameters<typeof eveMessageOperationId>[0]) => {
      const operationId = eveMessageOperationId(event);
      if (!(typeof operationId === "string" && operationId !== "")) {
        return;
      }
      const current =
        pendingRef.current === undefined
          ? eveMessageDelivery.read(sessionStorage, sessionId)
          : pendingRef.current;
      pendingRef.current = current;
      if (
        !current ||
        current.operationId !== operationId ||
        !eveMessageDelivery.acknowledge(
          sessionStorage,
          sessionId,
          current,
          event
        )
      ) {
        return;
      }
      acknowledged.current = operationId;
      pendingRef.current = null;
      setPending((pendingMessage) => {
        if (pendingMessage?.operationId === operationId) {
          return null;
        }
        return pendingMessage;
      });
    },
    [sessionId]
  );

  return {
    accept,
    begin: useCallback(
      (input: Parameters<typeof eveMessageDelivery.begin>[2]) => {
        acknowledged.current = undefined;
        const delivery = eveMessageDelivery.begin(
          sessionStorage,
          sessionId,
          input
        );
        pendingRef.current = delivery;
        setPending(delivery);
        return delivery;
      },
      [sessionId]
    ),
    hasAcknowledged: useCallback(
      (operationId: string) => acknowledged.current === operationId,
      []
    ),
    pending,
    reject: useCallback(
      (delivery: PendingEveMessage, message: string, retryable = false) => {
        const rejected = eveMessageDelivery.reject(
          sessionStorage,
          sessionId,
          delivery,
          message,
          retryable
        );
        pendingRef.current = rejected;
        setPending(rejected);
      },
      [sessionId]
    ),
    release: useCallback(
      (delivery: Readonly<Pick<PendingEveMessage, "operationId">>) => {
        eveMessageDelivery.clear(
          sessionStorage,
          sessionId,
          delivery.operationId
        );
        if (pendingRef.current?.operationId === delivery.operationId) {
          pendingRef.current = null;
        }
        setPending((current) => {
          if (current?.operationId === delivery.operationId) {
            return null;
          }
          return current;
        });
      },
      [sessionId]
    ),
    retry: useCallback(
      (delivery: PendingEveMessage) => {
        const retried = eveMessageDelivery.retry(
          sessionStorage,
          sessionId,
          delivery
        );
        if (retried) {
          pendingRef.current = retried;
          setPending(retried);
        }
        return retried;
      },
      [sessionId]
    ),
  };
};
