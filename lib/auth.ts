import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";
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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
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
  
  plugins: [
    nextCookies(),
    magicLink({
      // Email sending will be configured when email provider (Resend) is set up
      sendMagicLink: async ({ email, url }) => {
        // TODO: Implement when RESEND_API_KEY is configured
        // For now, just log the magic link URL (dev only)
        if (process.env.NODE_ENV === "development") {
          console.log(`Magic link for ${email}: ${url}`);
        }
        // Return success to avoid errors, but link won't be sent until email provider is configured
      },
    }),
  ],
});
