import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/subscription/stripe';
import { env } from '@/lib/env';
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionByStripeId,
} from '@/lib/db/queries-subscription';
import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/lib/subscription/subscription-utils';
import { STRIPE_PRICE_IDS } from '@/lib/subscription/stripe';
import { db } from '@/lib/db/client';
import { userCredit } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCreditsForPlan } from '@/lib/subscription/subscription-utils';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;

          const stripeSubscription =
            await stripe.subscriptions.retrieve(subscriptionId);

          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan as SubscriptionPlan;

          if (!userId || !plan) {
            console.error('Missing userId or plan in session metadata');
            break;
          }

          await createSubscription({
            id: stripeSubscription.id,
            userId,
            stripeCustomerId:
              typeof stripeSubscription.customer === 'string'
                ? stripeSubscription.customer
                : stripeSubscription.customer.id,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: stripeSubscription.items.data[0].price.id,
            status: stripeSubscription.status as SubscriptionStatus,
            plan,
            currentPeriodStart: new Date(
              (stripeSubscription as any).current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(
              (stripeSubscription as any).current_period_end * 1000,
            ),
          });

          // Grant credits for the subscription
          const credits = getCreditsForPlan(plan);
          await db
            .update(userCredit)
            .set({ credits })
            .where(eq(userCredit.userId, userId));

          console.log(`Subscription created for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await updateSubscription({
          stripeSubscriptionId: subscription.id,
          status: subscription.status as SubscriptionStatus,
          currentPeriodStart: new Date(
            (subscription as any).current_period_start * 1000,
          ),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const dbSubscription = await getSubscriptionByStripeId({
          stripeSubscriptionId: subscription.id,
        });

        if (dbSubscription) {
          // Reset credits to free tier
          await db
            .update(userCredit)
            .set({ credits: 100 })
            .where(eq(userCredit.userId, dbSubscription.userId));

          await deleteSubscription({
            stripeSubscriptionId: subscription.id,
          });

          console.log(`Subscription deleted: ${subscription.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if ((invoice as any).subscription) {
          const subscriptionId =
            typeof (invoice as any).subscription === 'string'
              ? (invoice as any).subscription
              : (invoice as any).subscription.id;

          const dbSubscription = await getSubscriptionByStripeId({
            stripeSubscriptionId: subscriptionId,
          });

          if (dbSubscription) {
            // Refresh credits for the billing period
            const credits = getCreditsForPlan(dbSubscription.plan);
            await db
              .update(userCredit)
              .set({ credits })
              .where(eq(userCredit.userId, dbSubscription.userId));

            console.log(
              `Credits refreshed for user ${dbSubscription.userId}`,
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscriptionId =
            typeof (invoice as any).subscription === 'string'
              ? (invoice as any).subscription
              : (invoice as any).subscription.id;

          const dbSubscription = await getSubscriptionByStripeId({
            stripeSubscriptionId: subscriptionId,
          });

          if (dbSubscription) {
            console.log(
              `Payment failed for subscription ${subscriptionId}`,
            );
            // Stripe will handle retry logic and status updates
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}
