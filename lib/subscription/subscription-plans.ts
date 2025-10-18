// Shared subscription plan constants (can be used on client or server)

export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    id: 'monthly' as const,
    name: 'Monthly Pro',
    price: 7,
    currency: 'USD',
    interval: 'month' as const,
    credits: 1000,
    features: [
      'Access to all 120+ AI models',
      '1,000 credits per month',
      'Priority support',
      'Advanced features',
      'No rate limits',
    ],
  },
  ANNUAL: {
    id: 'annual' as const,
    name: 'Annual Pro',
    price: 50,
    currency: 'USD',
    interval: 'year' as const,
    credits: 12000,
    features: [
      'Access to all 120+ AI models',
      '12,000 credits per year',
      'Priority support',
      'Advanced features',
      'No rate limits',
      'Save $34/year (40% off)',
    ],
  },
} as const;

export const FREE_PLAN = {
  id: 'free' as const,
  name: 'Free',
  price: 0,
  credits: 100,
  features: [
    'Access to select AI models',
    '100 credits',
    'Basic features',
    'Community support',
  ],
} as const;

export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';
