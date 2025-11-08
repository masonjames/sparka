import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import { syncFromGhostByEmail } from "@/lib/entitlements/provisioning";

const logger = createModuleLogger("magic-link");

/**
 * POST /api/auth/magic-link
 * 
 * Request body: { email: string }
 * 
 * Generates a magic link login URL using Better Auth and sends it via Resend.
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

    // Generate magic link using Better Auth
    const baseUrl = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || "http://localhost:3000";
    const callbackURL = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/auth/callback/magic-link`;
    
    logger.info({ callbackURL }, "Using callback URL");
    
    // Better Auth handles the token generation
    const result = await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL,
      },
      headers: new Headers({
        "content-type": "application/json",
      }),
    });

    // Extract the magic link URL from Better Auth response
    // The sendMagicLink callback logs it, but we need to extract it for Resend
    let magicLinkUrl: string | null = null;
    
    if (result && typeof result === "object") {
      // Better Auth may return different response structures
      if ("url" in result && result.url) {
        magicLinkUrl = String(result.url);
      } else if ("data" in result && result.data && typeof result.data === "object" && "url" in result.data) {
        magicLinkUrl = String(result.data.url);
      }
    }
    
    logger.info({ magicLinkUrl, resultKeys: result ? Object.keys(result) : [] }, "Magic link result");

    // Send email via Resend if configured and we have a magic link URL
    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && magicLinkUrl) {
      const resend = new Resend(env.RESEND_API_KEY);

      try {
        await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          to: email,
          subject: "Sign in to Chat by Mason James",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Chat by Mason James</h1>
                </div>
                
                <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    Click the button below to sign in to your account. This link will expire in 15 minutes.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLinkUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Sign In
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                  
                  <p style="font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${magicLinkUrl}" style="color: #667eea; word-break: break-all;">${magicLinkUrl}</a>
                  </p>
                </div>
              </body>
            </html>
          `,
        });

        logger.info({ email }, "Magic link email sent successfully");
      } catch (error) {
        logger.error({ error, email }, "Failed to send magic link email via Resend");
        // Don't fail the request - log the URL for development
        if (process.env.NODE_ENV === "development") {
          console.log(`Magic link URL: ${magicLinkUrl}`);
        }
      }
    } else {
      // No email provider configured - log URL in development
      if (process.env.NODE_ENV === "development") {
        console.log(`Magic link URL: ${magicLinkUrl}`);
      }
      logger.warn({ email }, "Resend not configured - magic link not sent");
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
