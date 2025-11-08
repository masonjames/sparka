import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { buildAppUrl } from "@/lib/app-url";
import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import { syncFromGhostByEmail } from "@/lib/entitlements/provisioning";

const logger = createModuleLogger("magic-link");

/**
 * POST /api/auth/magic-link
 * 
 * Request body: { email: string }
 * 
 * Generates a magic link login URL using Better Auth. Email delivery happens
 * inside the Better Auth magic-link plugin (Resend).
 * Also syncs entitlements from Ghost if configured.
 * 
 * Returns: { success: boolean, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    logger.info({ email }, "Generating magic link");

    // Generate magic link using Better Auth (email delivery handled in plugin)
    const callbackURL = buildAppUrl("/");
    const errorCallbackURL = buildAppUrl("/error");
    
    logger.info({ callbackURL, errorCallbackURL }, "Using callback URLs");
    
    // Better Auth handles the token generation
    const magicLinkEndpoint = (auth.api as Record<string, unknown>)
      .signInMagicLink as
      | ((
          args: {
            body: {
              email: string;
              callbackURL?: string;
              name?: string;
              newUserCallbackURL?: string;
              errorCallbackURL?: string;
            };
            headers: HeadersInit;
            method?: "POST";
          }
        ) => Promise<unknown>)
      | undefined;

    if (!magicLinkEndpoint) {
      logger.error(
        { email },
        "Better Auth magic-link endpoint missing from auth.api"
      );
      return NextResponse.json(
        { success: false, error: "Magic link is temporarily unavailable" },
        { status: 500 }
      );
    }

    const result = await magicLinkEndpoint({
      body: {
        email,
        callbackURL,
        errorCallbackURL,
        newUserCallbackURL: callbackURL,
      },
      headers: new Headers({
        "content-type": "application/json",
      }),
    });

    let status = false;
    if (result instanceof Response) {
      status = result.ok;
    } else if (
      result &&
      typeof result === "object" &&
      "response" in result &&
      result.response &&
      typeof result.response === "object" &&
      "status" in result.response
    ) {
      status = Boolean((result.response as { status?: boolean }).status);
    } else if (result && typeof result === "object" && "status" in result) {
      status = Boolean((result as { status?: boolean }).status);
    }
    
    logger.info({ status }, "Magic link request processed");

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Failed to send magic link" },
        { status: 500 }
      );
    }

    // Async: Try to sync entitlements from Ghost if configured
    // Don't await this - let it happen in background
    if (env.GHOST_ADMIN_URL && env.GHOST_ADMIN_API_KEY) {
      // We don't have userId yet since this is pre-auth
      // This will be synced after successful login via the chat route
      logger.info({ email }, "Will sync Ghost entitlements after login");
    }

    return NextResponse.json({
      success: true,
      message: "Magic link sent! Check your email to sign in.",
    });
  } catch (error) {
    logger.error({
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, "Failed to generate magic link");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate magic link",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
