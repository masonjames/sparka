import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { getSubscriptionByUserId } from '@/lib/db/queries-subscription';
import { z } from 'zod';
import { hasActiveSubscription } from '@/lib/subscription/subscription-utils';

export const subscriptionRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getSubscriptionByUserId({
      userId: ctx.user.id,
    });

    if (!subscription) {
      return null;
    }

    return {
      ...subscription,
      isActive: hasActiveSubscription({
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      }),
    };
  }),

  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(['monthly', 'annual']),
      }),
    )
    .mutation(async ({ input }) => {
      // The actual checkout session creation is handled by the API route
      // This is just for type-safe client calls
      return { plan: input.plan };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await getSubscriptionByUserId({
      userId: ctx.user.id,
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // The actual portal session creation is handled by the API route
    return { hasSubscription: true };
  }),
});
