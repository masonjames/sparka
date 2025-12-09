"use server";

import { env } from "@/lib/env";

/**
 * Gets authentication provider configuration at runtime.
 *
 * This is necessary because siteConfig.authentication flags are evaluated
 * at build time when environment variables may not be available (e.g., during
 * Docker/GHCR builds). By evaluating at request time in an async server action,
 * we ensure the flags reflect the actual runtime environment.
 */
export async function getAuthConfig() {
  // Use Promise.resolve to satisfy async requirement for server actions
  return await Promise.resolve({
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    vercel: Boolean(env.VERCEL_APP_CLIENT_ID && env.VERCEL_APP_CLIENT_SECRET),
  });
}
