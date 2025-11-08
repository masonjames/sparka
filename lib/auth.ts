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
      sendMagicLink: async ({ email, url, token }) => {
        // Magic links are sent via our custom API endpoint
        // This callback is called by Better Auth, but we handle email sending separately
        // through the POST /api/auth/magic-link endpoint which calls Resend directly
        
        if (process.env.NODE_ENV === "development") {
          console.log(`Magic link for ${email}: ${url}`);
        }
        
        // The actual email sending happens in /api/auth/magic-link
        // This callback is here to satisfy the plugin interface
      },
    }),
  ],
});
