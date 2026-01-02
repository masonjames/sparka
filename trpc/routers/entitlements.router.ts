import {
  getUserEntitlements,
  isChatEntitled,
} from "@/lib/entitlements/provisioning";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const entitlementsRouter = createTRPCRouter({
  /**
   * Check if current user is entitled to use chat
   */
  checkEntitlement: protectedProcedure.query(async ({ ctx }) => {
    const result = await isChatEntitled(ctx.user.id);
    return result;
  }),

  /**
   * Get all entitlements for current user
   */
  getEntitlements: protectedProcedure.query(async ({ ctx }) => {
    const entitlements = await getUserEntitlements(ctx.user.id);
    return entitlements;
  }),
});
