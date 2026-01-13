import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Centralized environment parsing and feature flags using t3-oss/t3-env

const hostnameRegex = /^[a-z0-9.-]+$/i;
const subdomainLabelRegex = /^[a-z0-9-]+$/i;

const optionalHostname = z
  .string()
  .trim()
  .min(1, "Hostname cannot be empty")
  .regex(
    hostnameRegex,
    "Value must be a hostname without protocol, path, or wildcards"
  )
  .optional();

const optionalCookieDomain = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^\.?[a-z0-9.-]+$/i,
    "Cookie domain must be a hostname with an optional leading dot"
  )
  .optional();

const optionalSubdomain = z
  .string()
  .trim()
  .min(1)
  .regex(
    subdomainLabelRegex,
    "APP_SUBDOMAIN must be a single subdomain label without dots"
  )
  .optional();

export const env = createEnv({
  server: {
    // Required core
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),

    // R2 Object Storage (Cloudflare R2 / S3-compatible)
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_ENDPOINT: z.string().url(), // e.g., https://<account-id>.r2.cloudflarestorage.com
    R2_PUBLIC_URL: z.string().url(), // e.g., https://assets.chat.masonjames.com

    // Authentication providers (all optional - at least one social or email must work)
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),
    VERCEL_APP_CLIENT_ID: z.string().optional(),
    VERCEL_APP_CLIENT_SECRET: z.string().optional(),

    // Email provider for magic links and password reset (optional)
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),

    // One of the AI Gateway API key or Vercel OIDC token must be configured
    AI_GATEWAY_API_KEY: z.string().optional(),
    VERCEL_OIDC_TOKEN: z.string().optional(),

    // Optional cleanup cron job secret
    CRON_SECRET: z.string().optional(),

    // Optional features
    REDIS_URL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    EXA_API_KEY: z.string().optional(),
    FIRECRAWL_API_KEY: z.string().optional(),
    MCP_ENCRYPTION_KEY: z.string().length(44).optional(), // 44 bytes base64

    // Entitlements & Subscriptions (optional)
    GHOST_ADMIN_URL: z.string().optional(),
    GHOST_ADMIN_API_KEY: z.string().optional(),
    GHOST_WEBHOOK_SECRET: z.string().optional(),
    GHOST_PORTAL_URL: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Misc / platform
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

    /**
     * URL & origin overrides.
     * Precedence: APP_BASE_URL_OVERRIDE > APP_BASE_URL (legacy) > Vercel envs > localhost.
     */
    APP_BASE_URL_OVERRIDE: z.string().trim().min(1).optional(),
    APP_BASE_URL: z.string().trim().optional(), // legacy alias (deprecated)

    /**
     * Apex + subdomain metadata used for shared cookies & derived origins.
     * Provide APEX_DOMAIN (e.g., "masonjames.com") and optional APP_SUBDOMAIN (e.g., "chat").
     */
    APEX_DOMAIN: optionalHostname,
    APP_SUBDOMAIN: optionalSubdomain,

    /**
     * Cookie domain management (modern override + legacy fallback).
     * AUTH_COOKIE_DOMAIN_OVERRIDE should include the leading dot when targeting subdomains.
     */
    AUTH_COOKIE_DOMAIN_OVERRIDE: optionalCookieDomain,
    AUTH_COOKIE_DOMAIN: z.string().trim().optional(), // legacy alias (deprecated)

    /**
     * Trusted origins. Retained for compatibility but derived origins are preferred going forward.
     */
    AUTH_TRUSTED_ORIGINS: z.string().trim().optional(),

    /**
     * Ghost member session bridging (captured for later implementation).
     */
    GHOST_MEMBER_COOKIE_NAME: z.string().trim().min(1).optional(),
    GHOST_MEMBER_SSO_SECRET: z.string().trim().min(1).optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
});

const warnOnceMessages = new Set<string>();
const warnOnce = (message: string) => {
  if (warnOnceMessages.has(message)) {
    return;
  }
  warnOnceMessages.add(message);
  console.warn(message);
};

const legacyPairs = [
  {
    legacyValue: env.APP_BASE_URL,
    modernValue: env.APP_BASE_URL_OVERRIDE,
    legacyName: "APP_BASE_URL",
    modernName: "APP_BASE_URL_OVERRIDE",
  },
  {
    legacyValue: env.AUTH_COOKIE_DOMAIN,
    modernValue: env.AUTH_COOKIE_DOMAIN_OVERRIDE,
    legacyName: "AUTH_COOKIE_DOMAIN",
    modernName: "AUTH_COOKIE_DOMAIN_OVERRIDE",
  },
] as const;

for (const {
  legacyValue,
  modernValue,
  legacyName,
  modernName,
} of legacyPairs) {
  if (legacyValue && modernValue) {
    warnOnce(
      `[env] Both ${legacyName} (deprecated) and ${modernName} are set. ${modernName} takes precedence.`
    );
  } else if (legacyValue && !modernValue) {
    warnOnce(
      `[env] ${legacyName} is deprecated and will be removed in a future release. Please migrate to ${modernName}.`
    );
  }
}

if (env.AUTH_TRUSTED_ORIGINS) {
  warnOnce(
    "[env] AUTH_TRUSTED_ORIGINS is deprecated. Derived trusted origins now cover most scenarios; remove this variable when possible."
  );
}

// Email authentication is always available via Better Auth
// Social providers are optional but recommended
if (
  typeof window === "undefined" &&
  !(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) &&
  !(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) &&
  !(env.VERCEL_APP_CLIENT_ID && env.VERCEL_APP_CLIENT_SECRET)
) {
  console.warn(
    "No social auth providers configured. Enable Google, GitHub, or Vercel to improve login UX."
  );
}

// VERCEL_OIDC_TOKEN is not set on Middleware so this can't be a runtime error
// if (
//   typeof window === "undefined" &&
//   !(env.VERCEL_OIDC_TOKEN || env.AI_GATEWAY_API_KEY)
// ) {
//   throw new Error(
//     "No AI Gateway API key or Vercel OIDC token configured. Please set one of them in the environment variables."
//   );
// }
