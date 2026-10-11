import { requireEveDeletionLifecycle } from "./deletion-lifecycle";
import {
  retireEveFamilyForDeletion,
  retireEveSessionForDeletion,
} from "./retire-session";

/** Authorize and retire the whole family before fencing work for external-resource inventory.
 * @param {string} ownerId Owner whose conversation family is authorized and retired.
 * @param {string} conversationId Conversation used to resolve the deletion family.
 * @returns {ReturnType<typeof prepareEveFamilyDeletion>} The retired family with each native session inventory and sorted distinct run/stream identities, or no result for an absent family. Missing session bindings and lifecycle preparation failures reject before external-resource cleanup.
 */
export const prepareEveFamilyDeletion = async (
  ownerId: string,
  conversationId: string
): Promise<
  | (NonNullable<Awaited<ReturnType<typeof retireEveFamilyForDeletion>>> & {
      nativeInventories: {
        sessionId: string;
        runIds: string[];
        streamIds: string[];
      }[];
      runIds: string[];
      streamIds: string[];
    })
  | undefined
> => {
  const lifecycle = requireEveDeletionLifecycle();
  const family = await retireEveFamilyForDeletion(ownerId, conversationId);
  if (!family) {
    return;
  }
  const nativeInventories: {
    sessionId: string;
    runIds: string[];
    streamIds: string[];
  }[] = [];
  const runIds = new Set<string>();
  const streamIds = new Set<string>();
  for (const conversation of family.conversations) {
    const { sessionId } = conversation;
    if (typeof sessionId !== "string" || sessionId === "") {
      throw new Error("Resolve the missing session binding before cleanup.");
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Process one resource at a time so fencing and cleanup stay ordered and bounded.
    const inventory = await lifecycle.prepare(sessionId, async () => {
      await retireEveSessionForDeletion(ownerId, sessionId);
    });
    nativeInventories.push({ sessionId, ...inventory });
    for (const id of inventory.runIds) {
      runIds.add(id);
    }
    for (const id of inventory.streamIds) {
      streamIds.add(id);
    }
  }
  // oxlint-disable-next-line typescript/consistent-return -- #580: prepareEveFamilyDeletion has an optional result; absent or inapplicable records intentionally return undefined rather than a fabricated value.
  return {
    ...family,
    nativeInventories,
    runIds: [...runIds].toSorted(),
    streamIds: [...streamIds].toSorted(),
  };
};
