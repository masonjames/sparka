import "server-only";
import { eq, and, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entitlement, user, webhookEvent } from "@/lib/db/schema";
import type { Entitlement } from "@/lib/db/schema";
import { grantCredits, addCredits } from "@/lib/repositories/credits";
import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = createModuleLogger("entitlements");

// Credit amounts per tier - adjust based on your pricing
const TIER_CREDITS: Record<string, number> = {
  "pro": 1000,
  "premium": 5000,
  "enterprise": 20000,
  "default": 500,
};

function getCreditsForTier(tier: string | null): number {
  if (!tier) return TIER_CREDITS.default;
  return TIER_CREDITS[tier.toLowerCase()] ?? TIER_CREDITS.default;
}

/**
 * Log webhook event for idempotency tracking
 */
async function logWebhookEvent({
  source,
  eventId,
  eventType,
  payload,
}: {
  source: "ghost" | "stripe";
  eventId: string;
  eventType: string;
  payload: unknown;
}): Promise<boolean> {
  try {
    // Check if event already processed
    const existing = await db
      .select()
      .from(webhookEvent)
      .where(
        and(
          eq(webhookEvent.source, source),
          eq(webhookEvent.eventId, eventId)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].processed) {
      logger.info({ source, eventId, eventType }, "Event already processed, skipping");
      return false; // Already processed
    }

    // Insert or update event log
    await db
      .insert(webhookEvent)
      .values({
        source,
        eventId,
        eventType,
        payload: payload as any,
        processed: false,
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    return true; // Can proceed
  } catch (error) {
    logger.error({ error, source, eventId }, "Failed to log webhook event");
    throw error;
  }
}

/**
 * Mark webhook event as processed
 */
async function markWebhookProcessed(source: "ghost" | "stripe", eventId: string, error?: string) {
  try {
    // Get current retry count if there's an error
    let newRetryCount = 0;
    if (error) {
      const current = await db
        .select({ retryCount: webhookEvent.retryCount })
        .from(webhookEvent)
        .where(
          and(
            eq(webhookEvent.source, source),
            eq(webhookEvent.eventId, eventId)
          )
        )
        .limit(1);
      newRetryCount = (current[0]?.retryCount || 0) + 1;
    }

    await db
      .update(webhookEvent)
      .set({
        processed: !error,
        processedAt: new Date(),
        error: error || null,
        retryCount: newRetryCount,
      })
      .where(
        and(
          eq(webhookEvent.source, source),
          eq(webhookEvent.eventId, eventId)
        )
      );
  } catch (err) {
    logger.error({ err, source, eventId }, "Failed to mark webhook as processed");
  }
}

/**
 * Upsert or create user by email
 */
async function ensureUser(email: string, name?: string): Promise<string> {
  try {
    // Check if user exists
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new user
    const [newUser] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        email,
        name: name || email.split("@")[0],
      })
      .returning();

    logger.info({ userId: newUser.id, email }, "Created new user from webhook");
    return newUser.id;
  } catch (error) {
    logger.error({ error, email }, "Failed to ensure user");
    throw error;
  }
}

/**
 * Provision entitlement from Ghost webhook
 * 
 * Ghost webhook payload (member.added, member.edited):
 * {
 *   member: {
 *     current: {
 *       id: "ghost-member-id",
 *       email: "user@example.com",
 *       name: "User Name",
 *       status: "free" | "paid",
 *       tiers: [{
 *         id: "tier-id",
 *         name: "Pro",
 *         slug: "pro"
 *       }]
 *     }
 *   }
 * }
 */
export async function provisionFromGhost(payload: any): Promise<void> {
  const eventId = payload.member?.current?.id || crypto.randomUUID();
  const eventType = "member.updated";

  try {
    // Check idempotency
    const canProcess = await logWebhookEvent({
      source: "ghost",
      eventId,
      eventType,
      payload,
    });

    if (!canProcess) return;

    const member = payload.member?.current;
    if (!member) {
      throw new Error("Invalid Ghost webhook payload: missing member.current");
    }

    const email = member.email;
    const name = member.name;
    const status = member.status; // "free" | "paid"
    const tiers = member.tiers || [];

    // Ensure user exists
    const userId = await ensureUser(email, name);

    // Determine tier and credits
    const isPaid = status === "paid" && tiers.length > 0;
    const tier = isPaid ? tiers[0].slug : null;
    const credits = getCreditsForTier(tier);

    if (isPaid) {
      // Upsert entitlement
      const [ent] = await db
        .insert(entitlement)
        .values({
          userId,
          source: "ghost",
          externalId: member.id,
          tier: tier,
          status: "active",
          creditsGranted: credits,
          metadata: { ghostTiers: tiers },
          startDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [entitlement.source, entitlement.externalId],
          set: {
            status: "active",
            tier: tier,
            creditsGranted: credits,
            metadata: { ghostTiers: tiers },
            updatedAt: new Date(),
          },
        })
        .returning();

      // Grant credits
      await grantCredits({ userId, amount: credits });

      logger.info(
        { userId, email, tier, credits, entitlementId: ent.id },
        "Provisioned Ghost entitlement"
      );
    } else {
      // Revoke entitlement if exists
      await db
        .update(entitlement)
        .set({
          status: "canceled",
          endDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(entitlement.userId, userId),
            eq(entitlement.source, "ghost"),
            eq(entitlement.status, "active")
          )
        );

      logger.info({ userId, email }, "Revoked Ghost entitlement (free tier)");
    }

    await markWebhookProcessed("ghost", eventId);
  } catch (error) {
    logger.error({ error, eventId, payload }, "Failed to provision from Ghost");
    await markWebhookProcessed("ghost", eventId, String(error));
    throw error;
  }
}

/**
 * Provision entitlement from Stripe webhook
 * 
 * Stripe event types:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * 
 * Payload:
 * {
 *   id: "evt_xxx",
 *   type: "customer.subscription.updated",
 *   data: {
 *     object: {
 *       id: "sub_xxx",
 *       customer: "cus_xxx",
 *       status: "active" | "canceled" | "past_due",
 *       items: {
 *         data: [{
 *           price: {
 *             id: "price_xxx",
 *             product: "prod_xxx"
 *           }
 *         }]
 *       },
 *       metadata: {
 *         userId: "optional-user-id"
 *       }
 *     }
 *   }
 * }
 */
export async function provisionFromStripe(event: any): Promise<void> {
  const eventId = event.id;
  const eventType = event.type;

  try {
    // Check idempotency
    const canProcess = await logWebhookEvent({
      source: "stripe",
      eventId,
      eventType,
      payload: event,
    });

    if (!canProcess) return;

    const subscription = event.data?.object;
    if (!subscription) {
      throw new Error("Invalid Stripe webhook: missing data.object");
    }

    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    const status = subscription.status; // "active" | "canceled" | "past_due" etc.
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const productId = subscription.items?.data?.[0]?.price?.product;

    // Try to get user from metadata or lookup by customer ID
    let userId = subscription.metadata?.userId;

    if (!userId) {
      // TODO: Implement customer lookup - for now, we'll need userId in metadata
      logger.warn(
        { subscriptionId, customerId },
        "No userId in Stripe subscription metadata - cannot provision"
      );
      await markWebhookProcessed("stripe", eventId, "No userId in metadata");
      return;
    }

    // Determine credits based on price/product
    // TODO: Map Stripe price IDs to tier credits
    const tier = priceId || productId;
    const credits = getCreditsForTier(tier);

    if (status === "active") {
      // Upsert entitlement
      const [ent] = await db
        .insert(entitlement)
        .values({
          userId,
          source: "stripe",
          externalId: subscriptionId,
          tier: tier,
          status: "active",
          creditsGranted: credits,
          metadata: {
            customerId,
            priceId,
            productId,
          },
          startDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [entitlement.source, entitlement.externalId],
          set: {
            status: "active",
            tier: tier,
            creditsGranted: credits,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Grant credits
      await grantCredits({ userId, amount: credits });

      logger.info(
        { userId, subscriptionId, tier, credits, entitlementId: ent.id },
        "Provisioned Stripe entitlement"
      );
    } else if (status === "canceled" || status === "unpaid") {
      // Revoke entitlement
      await db
        .update(entitlement)
        .set({
          status: "canceled",
          endDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(entitlement.source, "stripe"),
            eq(entitlement.externalId, subscriptionId)
          )
        );

      logger.info({ userId, subscriptionId }, "Revoked Stripe entitlement");
    }

    await markWebhookProcessed("stripe", eventId);
  } catch (error) {
    logger.error({ error, eventId, event }, "Failed to provision from Stripe");
    await markWebhookProcessed("stripe", eventId, String(error));
    throw error;
  }
}

/**
 * Sync entitlement from Ghost Admin API by email
 * Used for JIT provisioning when user logs in
 */
export async function syncFromGhostByEmail(email: string, userId: string): Promise<void> {
  try {
    if (!env.GHOST_ADMIN_URL || !env.GHOST_ADMIN_API_KEY) {
      logger.warn("Ghost Admin API not configured, skipping sync");
      return;
    }

    // Import Ghost Admin API dynamically
    // @ts-expect-error - No type definitions available for @tryghost/admin-api
    const GhostAdminAPI = (await import("@tryghost/admin-api")).default;
    const api = new GhostAdminAPI({
      url: env.GHOST_ADMIN_URL,
      key: env.GHOST_ADMIN_API_KEY,
      version: "v5.0",
    });

    // Fetch member by email
    const members = await api.members.browse({ filter: `email:'${email}'` });

    if (!members || members.length === 0) {
      logger.info({ email, userId }, "No Ghost member found for email");
      return;
    }

    const member = members[0];
    const status = member.status;
    const tiers = member.tiers || [];
    
    // Ghost member status can be: 'free', 'paid', or 'comped' (complimentary)
    // Both 'paid' and 'comped' should have access
    const hasAccess = (status === "paid" || status === "comped") && tiers.length > 0;
    const tier = hasAccess ? tiers[0].slug : null;
    const credits = getCreditsForTier(tier);
    
    logger.info({ email, userId, status, tiers, hasAccess }, "Ghost member found");

    if (hasAccess) {
      // Upsert entitlement
      await db
        .insert(entitlement)
        .values({
          userId,
          source: "ghost",
          externalId: member.id,
          tier: tier,
          status: "active",
          creditsGranted: credits,
          metadata: { ghostTiers: tiers },
          startDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [entitlement.source, entitlement.externalId],
          set: {
            status: "active",
            tier: tier,
            creditsGranted: credits,
            updatedAt: new Date(),
          },
        });

      // Grant credits
      await grantCredits({ userId, amount: credits });

      logger.info({ userId, email, tier, credits }, "Synced Ghost entitlement from API");
    }
  } catch (error) {
    logger.error({ error, email, userId }, "Failed to sync from Ghost");
    // Don't throw - allow login to proceed even if sync fails
  }
}

/**
 * Check if user has active entitlement for chat access
 */
export async function isChatEntitled(userId: string): Promise<{
  entitled: boolean;
  entitlement?: Entitlement;
  reason?: string;
}> {
  try {
    const activeEntitlements = await db
      .select()
      .from(entitlement)
      .where(
        and(
          eq(entitlement.userId, userId),
          eq(entitlement.status, "active")
        )
      )
      .limit(1);

    if (activeEntitlements.length > 0) {
      return {
        entitled: true,
        entitlement: activeEntitlements[0],
      };
    }

    return {
      entitled: false,
      reason: "no_active_subscription",
    };
  } catch (error) {
    logger.error({ error, userId }, "Failed to check entitlement");
    return {
      entitled: false,
      reason: "error_checking_entitlement",
    };
  }
}

/**
 * Get all active entitlements for a user
 */
export async function getUserEntitlements(userId: string): Promise<Entitlement[]> {
  try {
    return await db
      .select()
      .from(entitlement)
      .where(eq(entitlement.userId, userId))
      .orderBy(entitlement.createdAt);
  } catch (error) {
    logger.error({ error, userId }, "Failed to get user entitlements");
    return [];
  }
}
