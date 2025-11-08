import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { appBaseUrl, authTrustedOrigins, authCookieDomain } from "@/lib/app-url";
import { env } from "@/lib/env";
import { createModuleLogger } from "@/lib/logger";
import { db } from "./db/client";
import { schema } from "./db/schema";

export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
};

const magicLinkLogger = createModuleLogger("magic-link");
const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const rawFromEmail = env.RESEND_FROM_EMAIL?.trim();
const fromEmailAddress =
  rawFromEmail && rawFromEmail.includes("<")
    ? rawFromEmail
    : rawFromEmail
      ? `Chat by Mason James <${rawFromEmail}>`
      : null;

const buildMagicLinkEmailHtml = (magicLinkUrl: string) => `
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
`;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: appBaseUrl,
  trustedOrigins: authTrustedOrigins,
  secret: env.AUTH_SECRET,

  socialProviders: (() => {
    const googleId = env.AUTH_GOOGLE_ID;
    const googleSecret = env.AUTH_GOOGLE_SECRET;
    const githubId = env.AUTH_GITHUB_ID;
    const githubSecret = env.AUTH_GITHUB_SECRET;

    const google =
      typeof googleId === "string" &&
      googleId.length > 0 &&
      typeof googleSecret === "string" &&
      googleSecret.length > 0
        ? { clientId: googleId, clientSecret: googleSecret }
        : undefined;

    const github =
      typeof githubId === "string" &&
      githubId.length > 0 &&
      typeof githubSecret === "string" &&
      githubSecret.length > 0
        ? { clientId: githubId, clientSecret: githubSecret }
        : undefined;

    return { google, github } as const;
  })(),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later when email provider is configured
  },
  
  advanced: authCookieDomain
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: authCookieDomain,
        },
      }
    : undefined,
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!env.RESEND_API_KEY || !fromEmailAddress) {
          magicLinkLogger.warn({ email }, "Resend not configured - magic link not sent");
          return;
        }

        if (!resendClient) {
          magicLinkLogger.error({ email }, "Resend client unavailable");
          throw new Error("Email provider unavailable");
        }

        try {
          await resendClient.emails.send({
            from: fromEmailAddress,
            to: email,
            subject: "Sign in to Chat by Mason James",
            html: buildMagicLinkEmailHtml(url),
          });
          magicLinkLogger.info({ email }, "Magic link email sent via Resend");
        } catch (error) {
          magicLinkLogger.error({ email, error }, "Failed to send magic link email via Resend");
          throw error;
        }
      },
    }),
  ],
});
