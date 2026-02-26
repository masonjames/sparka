import { z } from "zod";

/**
 * Server environment variable schemas with descriptions.
 *
 * Descriptions are the single source of truth used by:
 * - The CLI env checklist (derived at build time)
 * - The .env.example comments
 *
 * Exported separately from `env.ts` so the CLI can import
 * without triggering `createEnv` runtime validation.
 */

// Helper: trim whitespace (Dokploy pads env vars), treat empty as undefined
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().url().optional()
);

export const serverEnvSchema = {
  // Required core
  DATABASE_URL: z.string().min(1).describe("Postgres connection string"),
  AUTH_SECRET: z
    .string()
    .min(1)
    .describe("NextAuth.js secret for signing session tokens"),

  // Optional blob storage (enable in chat.config.ts)
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .optional()
    .describe("Vercel Blob storage token for file uploads"),

  // R2 Object Storage (Cloudflare R2 / S3-compatible)
  R2_ACCESS_KEY_ID: z
    .string()
    .min(1)
    .optional()
    .describe("Cloudflare R2 access key ID"),
  R2_SECRET_ACCESS_KEY: z
    .string()
    .min(1)
    .optional()
    .describe("Cloudflare R2 secret access key"),
  R2_BUCKET: z.string().min(1).optional().describe("Cloudflare R2 bucket name"),
  R2_ENDPOINT: optionalUrl.describe("Cloudflare R2 endpoint URL"),
  R2_PUBLIC_URL: optionalUrl.describe("Cloudflare R2 public URL for assets"),

  // Authentication providers (enable in chat.config.ts)
  AUTH_GOOGLE_ID: z.string().optional().describe("Google OAuth client ID"),
  AUTH_GOOGLE_SECRET: z
    .string()
    .optional()
    .describe("Google OAuth client secret"),
  AUTH_GITHUB_ID: z.string().optional().describe("GitHub OAuth app client ID"),
  AUTH_GITHUB_SECRET: z
    .string()
    .optional()
    .describe("GitHub OAuth app client secret"),
  VERCEL_APP_CLIENT_ID: z
    .string()
    .optional()
    .describe("Vercel OAuth integration client ID"),
  VERCEL_APP_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Vercel OAuth integration client secret"),

  // AI Gateway keys (one required depending on config.ai.gateway)
  AI_GATEWAY_API_KEY: z
    .string()
    .optional()
    .describe("Vercel AI Gateway API key"),
  VERCEL_OIDC_TOKEN: z
    .string()
    .optional()
    .describe("Vercel OIDC token (auto-set on Vercel deployments)"),
  OPENROUTER_API_KEY: z.string().optional().describe("OpenRouter API key"),
  OPENAI_COMPATIBLE_BASE_URL: optionalUrl.describe(
    "Base URL for OpenAI-compatible provider"
  ),
  OPENAI_COMPATIBLE_API_KEY: z
    .string()
    .optional()
    .describe("API key for OpenAI-compatible provider"),
  OPENAI_API_KEY: z.string().optional().describe("OpenAI API key"),

  // Optional cleanup cron job secret
  CRON_SECRET: z
    .string()
    .optional()
    .describe("Secret for cleanup cron job endpoint"),

  // Optional features (enable in chat.config.ts)
  REDIS_URL: z.string().optional().describe("Redis URL for resumable streams"),
  TAVILY_API_KEY: z
    .string()
    .optional()
    .describe("Tavily API key for web search"),
  EXA_API_KEY: z.string().optional().describe("Exa API key for web search"),
  FIRECRAWL_API_KEY: z
    .string()
    .optional()
    .describe("Firecrawl API key for web search and URL retrieval"),
  MCP_ENCRYPTION_KEY: z
    .union([z.string().length(44), z.literal("")])
    .optional()
    .describe("Encryption key for MCP server credentials (base64, 44 chars)"),

  // Sandbox (for non-Vercel deployments)
  VERCEL_TEAM_ID: z
    .string()
    .optional()
    .describe("Vercel team ID for sandbox (non-Vercel deployments)"),
  VERCEL_PROJECT_ID: z
    .string()
    .optional()
    .describe("Vercel project ID for sandbox (non-Vercel deployments)"),
  VERCEL_TOKEN: z
    .string()
    .optional()
    .describe("Vercel API token for sandbox (non-Vercel deployments)"),
  VERCEL_SANDBOX_RUNTIME: z
    .string()
    .optional()
    .describe("Vercel sandbox runtime identifier"),

  // App URL (for non-Vercel deployments) - full URL including https://
  APP_URL: optionalUrl.describe(
    "App URL for non-Vercel deployments (full URL including https://)"
  ),

  // Vercel platform (auto-set by Vercel)
  VERCEL_URL: z.string().optional().describe("Auto-set by Vercel platform"),

  // Email provider for magic links (optional)
  RESEND_API_KEY: z
    .string()
    .optional()
    .describe("Resend API key for magic link emails"),
  RESEND_FROM_EMAIL: z
    .string()
    .optional()
    .describe("From email address for magic links"),

  // Entitlements & Subscriptions (optional)
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .describe("Stripe secret key for subscription management"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe("Stripe webhook signing secret"),
  GHOST_ADMIN_URL: z
    .string()
    .optional()
    .describe("Ghost Admin API URL for member sync"),
  GHOST_ADMIN_API_KEY: z
    .string()
    .optional()
    .describe("Ghost Admin API key for member sync"),
  GHOST_CONTENT_API_KEY: z
    .string()
    .optional()
    .describe("Ghost Content API key"),
  GHOST_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe("Ghost webhook signing secret"),

  // Multi-domain auth (optional)
  APP_HOSTNAME: z
    .string()
    .optional()
    .describe("App hostname for multi-domain setup"),
  AUTH_COOKIE_DOMAIN: z
    .string()
    .optional()
    .describe("Cookie domain for cross-subdomain auth"),
  AUTH_COOKIE_DOMAIN_OVERRIDE: z
    .string()
    .optional()
    .describe("Override cookie domain for cross-subdomain auth"),
  APP_SUBDOMAIN: z
    .string()
    .optional()
    .describe("App subdomain label for auth routing"),
  APP_BASE_URL_OVERRIDE: z
    .string()
    .optional()
    .describe("Override base URL for the app"),
  APP_BASE_URL: z.string().optional().describe("Base URL for the app (legacy)"),
  VERCEL_PROJECT_PRODUCTION_URL: z
    .string()
    .optional()
    .describe("Vercel production URL (auto-set by Vercel)"),
  APEX_DOMAIN: z
    .string()
    .optional()
    .describe("Apex domain for multi-domain setup"),
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .optional()
    .describe("Comma-separated list of trusted origins for auth"),
};
