import type { SiteConfigInput } from "./config.schema";

/**
 * Site configuration - edit values below to customize your app.
 * Generated from lib/config.schema.ts - run `bun chatjs:init` to regenerate.
 *
 * @see https://chatjs.dev/docs/reference/config
 */
const config: SiteConfigInput = {
  githubUrl: "https://github.com/your-username/your-repo",
  appPrefix: "chatjs",
  appName: "My AI Chat",
  appDescription: "AI chat powered by ChatJS",
  appUrl: "https://your-domain.com",
  organization: {
    name: "Your Organization",
    contact: {
      privacyEmail: "privacy@your-domain.com",
      legalEmail: "legal@your-domain.com",
    },
  },
  services: {
    hosting: "Vercel",
    aiProviders: ["OpenAI", "Anthropic", "Google"],
    paymentProcessors: [],
  },
  integrations: {
    sandbox: false, // Code sandbox execution (Vercel-native)
    webSearch: false, // Web search (requires TAVILY_API_KEY)
    mcp: false, // MCP tool servers (requires MCP_ENCRYPTION_KEY)
    imageGeneration: false, // AI image generation (requires BLOB_READ_WRITE_TOKEN)
    attachments: false, // File attachments (requires BLOB_READ_WRITE_TOKEN)
  },
  legal: {
    minimumAge: 13,
    governingLaw: "United States",
    refundPolicy: "no-refunds",
  },
  policies: {
    privacy: {
      title: "Privacy Policy",
    },
    terms: {
      title: "Terms of Service",
    },
  },
  authentication: {
    google: false, // Google OAuth (requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET)
    github: true, // GitHub OAuth (requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET)
    vercel: false, // Vercel OAuth (requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET)
  },
  models: {
    providerOrder: ["openai", "google", "anthropic"], // Provider sort order in model selector
    disabledModels: [], // Models to hide from all users
    curatedDefaults: ["openai/gpt-5-nano", "openai/gpt-5-mini", "google/gemini-2.5-flash-lite", "anthropic/claude-sonnet-4.5"], // Default models enabled for new users
    anonymousModels: ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"], // Models available to anonymous users
    defaults: {
      chat: "openai/gpt-5-nano",
      title: "google/gemini-2.5-flash-lite",
      pdf: "openai/gpt-5-mini",
      artifact: "openai/gpt-5-nano",
      artifactSuggestion: "openai/gpt-5-mini",
      followupSuggestions: "google/gemini-2.5-flash-lite",
      suggestions: "openai/gpt-5-mini",
      polishText: "openai/gpt-5-mini",
      formatSheet: "openai/gpt-5-mini",
      analyzeSheet: "openai/gpt-5-mini",
      codeEdits: "openai/gpt-5-mini",
      chatImageCompatible: "openai/gpt-4o-mini",
      image: "google/gemini-3-pro-image",
    },
  },
  anonymous: {
    credits: 10, // Message credits for anonymous users
    availableTools: [], // Tools available to anonymous users
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerMonth: 10,
    },
  },
  attachments: {
    maxBytes: 1048576, // Max file size in bytes after compression
    maxDimension: 2048, // Max image dimension
    acceptedTypes: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
  },
};

export default config;
