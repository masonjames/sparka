import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { provisionFromStripe } from "@/lib/entitlements/provisioning";
import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = createModuleLogger("stripe-webhook");

/**
 * POST /api/webhooks/stripe
 * 
 * Receives Stripe webhooks for subscription events
 * 
 * Expected events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * 
 * Setup in Stripe Dashboard: Developers → Webhooks → Add endpoint
 * - Endpoint URL: https://yourdomain.com/api/webhooks/stripe
 * - Events to send: customer.subscription.*
 * - Signing secret: Set STRIPE_WEBHOOK_SECRET in env
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Stripe configuration
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      logger.error("Stripe not configured");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    });

    // Get raw body and signature for verification
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      logger.warn("Missing Stripe signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.warn({ error: err }, "Invalid Stripe signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    logger.info({ eventType: event.type, eventId: event.id }, "Received Stripe webhook");

    // Handle subscription events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await provisionFromStripe(event);
    } else {
      logger.info({ eventType: event.type }, "Unhandled Stripe webhook event type");
    }

    return NextResponse.json({ received: true, eventId: event.id });
  } catch (error) {
    logger.error({ error }, "Failed to process Stripe webhook");
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
