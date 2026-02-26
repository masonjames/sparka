import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isTrustedAppOrigin } from "@/lib/app-url";
import { auth } from "@/lib/auth";
import { getUserCreditsInfo } from "@/lib/db/credits";
import {
  getUserEntitlements,
  isChatEntitled,
} from "@/lib/entitlements/provisioning";
import { createModuleLogger } from "@/lib/logger";

const logger = createModuleLogger("auth-validate");

/**
 * CORS headers for cross-subdomain requests
 * Allows *.masonjames.com to validate sessions
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is trusted
  if (origin && isTrustedAppOrigin(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }

  // Default: no CORS headers (same-origin only)
  return {};
}

/**
 * OPTIONS handler for CORS preflight
 */
export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/auth/validate
 *
 * Validates the current session and returns user info with entitlements and credits.
 * Used by consumer apps (Cal.com, Open-Lovable, Autumn) to check authentication state.
 *
 * Response shapes:
 *
 * Authenticated:
 * {
 *   authenticated: true,
 *   user: { id, email, name, image },
 *   entitlement: { entitled: boolean, tier?: string, reason?: string },
 *   credits: { totalCredits, availableCredits, reservedCredits }
 * }
 *
 * Not authenticated:
 * {
 *   authenticated: false,
 *   reason: "no_session"
 * }
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get session from Better Auth using the shared cookie
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      logger.debug({ origin }, "No session found for validation request");
      return NextResponse.json(
        {
          authenticated: false,
          reason: "no_session",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = session.user.id;
    if (!userId) {
      logger.warn({ origin }, "Session found but user ID missing");
      return NextResponse.json(
        {
          authenticated: false,
          reason: "invalid_session",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch entitlement status
    const entitlementResult = await isChatEntitled(userId);

    // Fetch credits info
    const creditsInfo = await getUserCreditsInfo({ userId });

    // Fetch all entitlements for detailed info
    const entitlements = await getUserEntitlements(userId);
    const activeEntitlement = entitlements.find((e) => e.status === "active");

    logger.info(
      {
        userId,
        email: session.user.email,
        origin,
        entitled: entitlementResult.entitled,
        tier: activeEntitlement?.tier,
      },
      "Session validated successfully"
    );

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
        entitlement: {
          entitled: entitlementResult.entitled,
          tier: activeEntitlement?.tier ?? null,
          source: activeEntitlement?.source ?? null,
          reason: entitlementResult.reason,
        },
        credits: creditsInfo
          ? {
              totalCredits: creditsInfo.totalCredits,
              availableCredits: creditsInfo.availableCredits,
              reservedCredits: creditsInfo.reservedCredits,
            }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error({ error, origin }, "Error validating session");
    return NextResponse.json(
      {
        authenticated: false,
        reason: "internal_error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
