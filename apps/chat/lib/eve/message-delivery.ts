import type { MessageStreamEvent } from "eve/client";
import { z } from "zod";

import { frontendToolsSchema } from "@/lib/ai/types";
import type { UiToolName } from "@/lib/ai/types";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

import { draftAttachment } from "./draft";
import { eveToolMetadata } from "./message-tool-selection";

type DeliveryEvent =
  | {
      readonly type: "message.received";
      readonly data: { readonly metadata?: unknown };
    }
  | { readonly type: Exclude<MessageStreamEvent["type"], "message.received"> };

const EVE_MESSAGE_OPERATION_HEADER = "x-chatjs-message-operation";

const pendingMessage = z.object({
  attachments: z.array(draftAttachment).default([]),
  message: z.string(),
  modelId: z.string().optional(),
  operationId: z.uuid().optional(),
  rejection: z.string().optional(),
  retryable: z.boolean().optional(),
  selectedTool: frontendToolsSchema.optional(),
});

const deliveryMetadata = z.object({
  chatjs: z.object({ operationId: z.uuid() }),
});

type PendingEveMessage = ReadonlyNativeSurface<z.infer<typeof pendingMessage>>;

type ActivePendingEveMessage = PendingEveMessage & {
  operationId: string;
};

type NewPendingEveMessage = Omit<
  PendingEveMessage,
  "operationId" | "rejection"
>;
type DeliveryStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const storageKey = (sessionId: string): string =>
  `chatjs.eve.pending-message:${sessionId}`;

const write = <T extends PendingEveMessage>(
  storage: DeliveryStorage,
  sessionId: string,
  value: T
): T => {
  storage.setItem(storageKey(sessionId), JSON.stringify(value));
  return value;
};

/* oxlint-disable typescript/strict-boolean-expressions --
 * typescript/strict-boolean-expressions (#610): read intentionally keeps the existing falsy-value behavior of stored; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
const read = (
  storage: DeliveryStorage,
  sessionId: string
): PendingEveMessage | null => {
  const stored = storage.getItem(storageKey(sessionId));
  if (!stored) {
    return null;
  }
  try {
    const parsed = pendingMessage.safeParse(JSON.parse(stored));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid tab state cannot be recovered safely.
  }
  storage.removeItem(storageKey(sessionId));
  return null;
};
/* oxlint-enable typescript/strict-boolean-expressions */

/* oxlint-disable typescript/strict-boolean-expressions --typescript/strict-boolean-expressions (#610): eveMessageDelivery intentionally keeps the existing falsy-value behavior of pending.operationId; current?.retryable; distinguishing empty, zero, and absent states requires a domain behavior decision. */
/** One durable client contract for sending, reloading, rejecting, and acknowledging a message. */
const eveMessageDelivery = {
  acknowledge: (
    storage: DeliveryStorage,
    sessionId: string,
    pending: ReadonlyNativeSurface<PendingEveMessage>,
    event: DeliveryEvent
  ): boolean => {
    if (
      event.type !== "message.received" ||
      !pending.operationId ||
      deliveryMetadata.safeParse(event.data.metadata).data?.chatjs
        .operationId !== pending.operationId
    ) {
      return false;
    }
    const stored = read(storage, sessionId);
    if (stored?.operationId === pending.operationId) {
      storage.removeItem(storageKey(sessionId));
    }
    return true;
  },
  begin: (
    storage: DeliveryStorage,
    sessionId: string,
    input: ReadonlyNativeSurface<NewPendingEveMessage>
  ): ActivePendingEveMessage =>
    write(storage, sessionId, {
      ...input,
      operationId: crypto.randomUUID(),
    }),
  clear: (
    storage: DeliveryStorage,
    sessionId: string,
    operationId: string | undefined
  ): void => {
    const stored = read(storage, sessionId);
    if (stored && stored.operationId === operationId) {
      storage.removeItem(storageKey(sessionId));
    }
  },
  read,
  reject: (
    storage: DeliveryStorage,
    sessionId: string,
    pending: ReadonlyNativeSurface<PendingEveMessage>,
    rejection: string,
    retryable = false
  ): PendingEveMessage & { rejection: string; retryable: boolean } =>
    write(storage, sessionId, { ...pending, rejection, retryable }),
  retry: (
    storage: DeliveryStorage,
    sessionId: string,
    pending: ReadonlyNativeSurface<PendingEveMessage>
  ): ActivePendingEveMessage | undefined => {
    const current = read(storage, sessionId);
    if (
      !pending.operationId ||
      !current?.retryable ||
      current.operationId !== pending.operationId
    ) {
      return;
    }
    // oxlint-disable-next-line typescript/consistent-return -- #580: eveMessageDelivery has an optional result; absent or inapplicable records intentionally return undefined rather than a fabricated value.
    return write(storage, sessionId, {
      ...current,
      operationId: pending.operationId,
      rejection: undefined,
      retryable: undefined,
    });
  },
};
/* oxlint-enable typescript/strict-boolean-expressions */

/**
 * The proxy owns this metadata so caller input cannot forge an acknowledgement.
 * @param {string} operationId Proxy-owned delivery operation UUID, validated before it enters message metadata.
 * @param {UiToolName | null | undefined} selectedTool App UI tool selection, normalized to null when no tool is selected.
 * @returns {{ chatjs: ReturnType<typeof eveToolMetadata>["chatjs"] & { operationId: string; }; }} The app namespace containing the operation acknowledgement and display-safe tool selection.
 */
const eveMessageDeliveryMetadata = (
  operationId: string,
  selectedTool: UiToolName | null | undefined
): {
  chatjs: ReturnType<typeof eveToolMetadata>["chatjs"] & {
    operationId: string;
  };
} => ({
  chatjs: {
    ...eveToolMetadata(selectedTool).chatjs,
    operationId: z.uuid().parse(operationId),
  },
});

const eveMessageOperationId = (event: DeliveryEvent): string | undefined => {
  if (event.type === "message.received") {
    return deliveryMetadata.safeParse(event.data.metadata).data?.chatjs
      .operationId;
  }
  return undefined;
};
export {
  EVE_MESSAGE_OPERATION_HEADER,
  eveMessageDelivery,
  eveMessageDeliveryMetadata,
  eveMessageOperationId,
};
export type { ActivePendingEveMessage, PendingEveMessage };
