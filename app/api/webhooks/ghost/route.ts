import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { provisionFromGhost } from "@/lib/entitlements/provisioning";
import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = createModuleLogger("ghost-webhook");

/**
 * Verify Ghost webhook signature
 * Ghost signs webhooks using HMAC-SHA256
 */
function verifyGhostSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/ghost
 * 
 * Receives Ghost webhooks for member events
 * 
 * Expected events:
 * - member.added
 * - member.edited
 * - member.deleted
 * 
 * Setup in Ghost Admin: Settings → Integrations → Webhooks
 * - Target URL: https://yourdomain.com/api/webhooks/ghost
 * - Secret: Set GHOST_WEBHOOK_SECRET in env
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret is configured
    if (!env.GHOST_WEBHOOK_SECRET) {
      logger.error("GHOST_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-ghost-signature");

    // Verify signature
    const isValid = verifyGhostSignature(
      rawBody,
      signature,
      env.GHOST_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn({ signature }, "Invalid Ghost webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.type || "unknown";

    logger.info({ eventType }, "Received Ghost webhook");

    // Process member events
    if (
      eventType === "member.added" ||
      eventType === "member.edited" ||
      eventType === "member.deleted"
    ) {
      await provisionFromGhost(payload);
    } else {
      logger.warn({ eventType }, "Unhandled Ghost webhook event type");
    }

    return NextResponse.json({ received: true, eventType });
  } catch (error) {
    logger.error({ error }, "Failed to process Ghost webhook");
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
