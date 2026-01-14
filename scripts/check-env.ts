#!/usr/bin/env bun
/**
 * Build-time config validation script.
 * Validates that enabled features in siteConfig have their required env vars.
 * Run via `bun run check-env` or automatically in prebuild.
 */
import "dotenv/config";
import { siteConfig } from "../lib/config";

type ValidationError = { feature: string; missing: string[] };

function checkEnv(): void {
  const errors: ValidationError[] = [];
  const env = process.env;

  // Validate AI Gateway access (required for live model discovery + providers)
  if (!(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN)) {
    errors.push({
      feature: "aiGateway",
      missing: ["AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN"],
    });
  }

  // Validate integrations
  if (
    siteConfig.integrations.webSearch &&
    !(env.TAVILY_API_KEY || env.FIRECRAWL_API_KEY)
  ) {
    errors.push({
      feature: "integrations.webSearch",
      missing: ["TAVILY_API_KEY or FIRECRAWL_API_KEY"],
    });
  }

  if (siteConfig.integrations.mcp && !env.MCP_ENCRYPTION_KEY) {
    errors.push({
      feature: "integrations.mcp",
      missing: ["MCP_ENCRYPTION_KEY"],
    });
  }

  // Sandbox requires OIDC (Vercel-hosted) or token auth (self-hosted)
  if (siteConfig.integrations.sandbox) {
    const hasOidc = !!env.VERCEL_OIDC_TOKEN;
    const hasTokenAuth =
      env.VERCEL_TEAM_ID && env.VERCEL_PROJECT_ID && env.VERCEL_TOKEN;

    if (!(hasOidc || hasTokenAuth)) {
      errors.push({
        feature: "integrations.sandbox",
        missing: [
          "VERCEL_OIDC_TOKEN (auto on Vercel) or VERCEL_TEAM_ID + VERCEL_PROJECT_ID + VERCEL_TOKEN",
        ],
      });
    }
  }

  // Validate authentication
  if (
    siteConfig.authentication.google &&
    !(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)
  ) {
    const missing = [];
    if (!env.AUTH_GOOGLE_ID) missing.push("AUTH_GOOGLE_ID");
    if (!env.AUTH_GOOGLE_SECRET) missing.push("AUTH_GOOGLE_SECRET");
    errors.push({ feature: "authentication.google", missing });
  }

  if (
    siteConfig.authentication.github &&
    !(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET)
  ) {
    const missing = [];
    if (!env.AUTH_GITHUB_ID) missing.push("AUTH_GITHUB_ID");
    if (!env.AUTH_GITHUB_SECRET) missing.push("AUTH_GITHUB_SECRET");
    errors.push({ feature: "authentication.github", missing });
  }

  if (
    siteConfig.authentication.vercel &&
    !(env.VERCEL_APP_CLIENT_ID && env.VERCEL_APP_CLIENT_SECRET)
  ) {
    const missing = [];
    if (!env.VERCEL_APP_CLIENT_ID) missing.push("VERCEL_APP_CLIENT_ID");
    if (!env.VERCEL_APP_CLIENT_SECRET) missing.push("VERCEL_APP_CLIENT_SECRET");
    errors.push({ feature: "authentication.vercel", missing });
  }

  // Check at least one auth provider is enabled and configured
  const hasAuth =
    (siteConfig.authentication.google &&
      env.AUTH_GOOGLE_ID &&
      env.AUTH_GOOGLE_SECRET) ||
    (siteConfig.authentication.github &&
      env.AUTH_GITHUB_ID &&
      env.AUTH_GITHUB_SECRET) ||
    (siteConfig.authentication.vercel &&
      env.VERCEL_APP_CLIENT_ID &&
      env.VERCEL_APP_CLIENT_SECRET);

  if (!hasAuth) {
    errors.push({
      feature: "authentication",
      missing: ["At least one auth provider must be enabled and configured"],
    });
  }

  if (errors.length > 0) {
    const message = errors
      .map((e) => `  - ${e.feature}: ${e.missing.join(", ")}`)
      .join("\n");

    console.error(
      `❌ Environment validation failed:\n${message}\n\nEither set the env vars or disable the feature in lib/config.ts`
    );
    process.exit(1);
  }

  console.log("✅ Environment validation passed");
}

checkEnv();
