import { getBalanceCents } from "@/lib/db/credits";
import { reconcileEveOwnerUsage } from "./reconcile-usage";

/** Repair recorded usage before checking the balance. This does not reserve funds. */
export const canStartPaidTurn = async (
  ownerId: string,
  sessionId?: string
): Promise<boolean> => {
  await reconcileEveOwnerUsage(ownerId, sessionId);
  return (await getBalanceCents(ownerId)) > 0;
};
