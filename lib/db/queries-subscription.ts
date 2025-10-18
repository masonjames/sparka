import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { subscription } from './schema';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/subscription/subscription-utils';

export async function getSubscriptionByUserId({ userId }: { userId: string }) {
  const result = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function getSubscriptionByStripeId({
  stripeSubscriptionId,
}: {
  stripeSubscriptionId: string;
}) {
  const result = await db
    .select()
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return result[0] || null;
}

export async function createSubscription({
  id,
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  status,
  plan,
  currentPeriodStart,
  currentPeriodEnd,
}: {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  const result = await db
    .insert(subscription)
    .values({
      id,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      plan,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    })
    .returning();

  return result[0];
}

export async function updateSubscription({
  stripeSubscriptionId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}) {
  const result = await db
    .update(subscription)
    .set({
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
    .returning();

  return result[0];
}

export async function deleteSubscription({
  stripeSubscriptionId,
}: {
  stripeSubscriptionId: string;
}) {
  await db
    .delete(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId));
}
