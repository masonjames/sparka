import 'server-only';
import { SUBSCRIPTION_PLANS, FREE_PLAN, type SubscriptionPlan, type SubscriptionStatus } from './subscription-plans';

export { SUBSCRIPTION_PLANS, FREE_PLAN, type SubscriptionPlan, type SubscriptionStatus };

export function getCreditsForPlan(plan: SubscriptionPlan | null | undefined): number {
  if (!plan) return FREE_PLAN.credits;
  return plan === 'monthly'
    ? SUBSCRIPTION_PLANS.MONTHLY.credits
    : SUBSCRIPTION_PLANS.ANNUAL.credits;
}

export function isSubscriptionActive(
  status: SubscriptionStatus | null,
): boolean {
  return status === 'active' || status === 'trialing';
}

export function hasActiveSubscription({
  status,
  currentPeriodEnd,
}: {
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
}): boolean {
  if (!status || !currentPeriodEnd) return false;
  
  const isActive = isSubscriptionActive(status);
  const notExpired = currentPeriodEnd > new Date();
  
  return isActive && notExpired;
}

export function getSubscriptionDisplayName(plan: SubscriptionPlan | null): string {
  if (!plan) return FREE_PLAN.name;
  return plan === 'monthly'
    ? SUBSCRIPTION_PLANS.MONTHLY.name
    : SUBSCRIPTION_PLANS.ANNUAL.name;
}
