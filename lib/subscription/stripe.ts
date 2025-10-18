import 'server-only';
import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// These should match your Stripe Dashboard product price IDs
// You'll need to create products in Stripe and update these
export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_placeholder',
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || 'price_annual_placeholder',
} as const;
