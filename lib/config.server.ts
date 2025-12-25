import "server-only";
import { siteConfig } from "./config";
import { env } from "./env";

type ValidationError = { feature: string; missing: string[] };

/**
 * Validates that enabled features have their required env vars.
 * Call this at server startup (e.g., in instrumentation.ts).
 * Throws if validation fails in production, warns in development.
 */
export function validateConfig(): void {
  const errors: ValidationError[] = [];

  // Validate integrations
  if (siteConfig.integrations.webSearch && !env.TAVILY_API_KEY) {
    errors.push({
      feature: "integrations.webSearch",
      missing: ["TAVILY_API_KEY"],
    });
  }

  if (siteConfig.integrations.openai && !env.OPENAI_API_KEY) {
    errors.push({
      feature: "integrations.openai",
      missing: ["OPENAI_API_KEY"],
    });
  }

  if (siteConfig.integrations.mcp && !env.MCP_ENCRYPTION_KEY) {
    errors.push({
      feature: "integrations.mcp",
      missing: ["MCP_ENCRYPTION_KEY"],
    });
  }

  // Validate authentication
  if (
    siteConfig.authentication.google &&
    (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET)
  ) {
    errors.push({
      feature: "authentication.google",
      missing: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"].filter(
        (k) => !env[k as keyof typeof env]
      ),
    });
  }

  if (
    siteConfig.authentication.github &&
    (!env.AUTH_GITHUB_ID || !env.AUTH_GITHUB_SECRET)
  ) {
    errors.push({
      feature: "authentication.github",
      missing: ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"].filter(
        (k) => !env[k as keyof typeof env]
      ),
    });
  }

  if (
    siteConfig.authentication.vercel &&
    (!env.VERCEL_APP_CLIENT_ID || !env.VERCEL_APP_CLIENT_SECRET)
  ) {
    errors.push({
      feature: "authentication.vercel",
      missing: ["VERCEL_APP_CLIENT_ID", "VERCEL_APP_CLIENT_SECRET"].filter(
        (k) => !env[k as keyof typeof env]
      ),
    });
  }

  if (errors.length > 0) {
    const message = errors
      .map((e) => `  - ${e.feature}: missing ${e.missing.join(", ")}`)
      .join("\n");

    const fullMessage = `Config validation failed:\n${message}\n\nEither set the env vars or disable the feature in lib/config.ts`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(fullMessage);
    }
    console.warn(`⚠️  ${fullMessage}`);
  }
}
