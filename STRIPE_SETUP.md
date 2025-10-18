# Stripe Subscription Setup Guide

This guide will walk you through setting up Stripe subscriptions for Sparka AI.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to your Stripe Dashboard

## Step 1: Install Dependencies

Dependencies are already installed:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK

## Step 2: Create Stripe Products

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add Product"

### Monthly Plan
- **Name**: Sparka Pro Monthly
- **Description**: Monthly subscription with 1,000 credits
- **Pricing**: 
  - Type: Recurring
  - Price: $7.00 USD
  - Billing period: Monthly
- Click "Save product"
- **Copy the Price ID** (starts with `price_...`)

### Annual Plan
- **Name**: Sparka Pro Annual
- **Description**: Annual subscription with 12,000 credits
- **Pricing**:
  - Type: Recurring
  - Price: $50.00 USD
  - Billing period: Yearly
- Click "Save product"
- **Copy the Price ID** (starts with `price_...`)

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Required Stripe Keys
STRIPE_SECRET_KEY=sk_test_...  # From Stripe Dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook setup (Step 4)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # From Stripe Dashboard → Developers → API keys

# Optional: Stripe Price IDs (if not using placeholder values)
STRIPE_MONTHLY_PRICE_ID=price_...  # From Monthly product
STRIPE_ANNUAL_PRICE_ID=price_...  # From Annual product
```

### Finding Your API Keys

1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Copy the **Secret key** (starts with `sk_test_...` for test mode)
3. Copy the **Publishable key** (starts with `pk_test_...` for test mode)

## Step 4: Set Up Webhook

### Local Development (using Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_...`)
5. Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Production (Vercel)

1. Deploy your app to Vercel
2. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
3. Click "Add endpoint"
4. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe/webhook`
5. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click "Add endpoint"
7. **Copy the Signing secret** (starts with `whsec_...`)
8. Add it to your Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Run Database Migration

Generate and apply the subscription table migration:

```bash
bun db:generate  # Already done
bun db:migrate
```

## Step 6: Configure Customer Portal

1. Go to [Stripe Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the customer portal
3. Configure what customers can do:
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Cancel subscription
4. Set cancellation behavior:
   - Recommended: "Cancel at end of billing period"
5. Save settings

## Step 7: Test the Integration

### Test Mode

1. Make sure you're using test mode keys (they start with `sk_test_` and `pk_test_`)
2. Use test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - Use any future expiry date and any 3-digit CVC

### Test Flow

1. Start your development server: `bun dev`
2. Sign in to your app
3. Go to `/subscription`
4. Click "Subscribe Monthly" or "Subscribe Annually"
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify:
   - You're redirected back to `/subscription?success=true`
   - Your subscription appears in the database
   - Your credits are updated
   - Webhook events are received (check Stripe Dashboard → Developers → Webhooks)

### Test Subscription Management

1. Go to `/subscription`
2. Click "Manage Subscription"
3. You should be redirected to Stripe Customer Portal
4. Test canceling subscription
5. Verify the webhook updates your database

## Step 8: Go Live

### Before Going Live

1. Complete Stripe account verification
2. Switch to live mode in Stripe Dashboard
3. Create live products (same as test products)
4. Update environment variables with live keys:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from live webhook)
   - `STRIPE_MONTHLY_PRICE_ID=price_...` (live)
   - `STRIPE_ANNUAL_PRICE_ID=price_...` (live)
5. Update webhook endpoint to use production URL

### Security Checklist

- ✅ Webhook signature verification is enabled
- ✅ API keys are stored securely in environment variables
- ✅ Never expose secret keys in client-side code
- ✅ HTTPS is enabled in production
- ✅ CORS is properly configured

## Architecture Overview

### Subscription Flow

1. **User clicks "Subscribe"** → `/subscription` page
2. **Frontend calls** → `POST /api/stripe/checkout`
3. **Backend creates** → Stripe Checkout Session
4. **User redirected** → Stripe hosted checkout page
5. **User completes payment** → Stripe processes payment
6. **Stripe sends webhook** → `POST /api/stripe/webhook`
7. **Backend creates subscription** → Database record created
8. **Credits allocated** → User receives subscription credits
9. **User redirected back** → `/subscription?success=true`

### Credit Refresh

- **On payment success**: `invoice.payment_succeeded` webhook grants credits
- **Periodic refresh**: Credits are refreshed at the start of each billing period
- **Cancellation**: Credits reset to free tier when subscription is deleted

### Database Schema

```typescript
subscription {
  id: string (primary key)
  userId: string (foreign key → user.id)
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: 'active' | 'canceled' | 'past_due' | ...
  plan: 'monthly' | 'annual'
  currentPeriodStart: timestamp
  currentPeriodEnd: timestamp
  cancelAtPeriodEnd: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check Stripe Dashboard → Developers → Webhooks for delivery logs
4. Make sure your endpoint is publicly accessible (for production)
5. For local dev, ensure Stripe CLI is running

### Subscription Not Created

1. Check webhook logs in Stripe Dashboard
2. Verify database migration was applied
3. Check application logs for errors
4. Ensure `userId` exists in user table

### Credits Not Updating

1. Verify webhook received `checkout.session.completed`
2. Check that `userId` in webhook metadata matches database
3. Ensure `userCredit` table has a row for the user
4. Check application logs for credit update errors

### Portal Not Working

1. Verify Customer Portal is enabled in Stripe settings
2. Check that subscription has a valid `stripeCustomerId`
3. Ensure user is authenticated
4. Check application logs for portal session errors

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Webhook Testing**: Use Stripe CLI for local testing
- **Test Cards**: https://stripe.com/docs/testing

## Additional Resources

- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
