import { betterAuth } from 'better-auth';
import { env } from '@/lib/env';
import { nextCookies } from 'better-auth/next-js';
import { db } from './db/client';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { schema } from './db/schema';

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
    provider: 'pg',
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,

  secret: env.AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
  },
  plugins: [nextCookies()],
});
