import { defineConfig } from "@/lib/config-schema";

const isProd = process.env.NODE_ENV === "production";
const PRODUCTION_REQUESTS_PER_MINUTE = 5;
const DEVELOPMENT_REQUESTS_PER_MINUTE = 60;
const PRODUCTION_REQUESTS_PER_MONTH = 10;
const DEVELOPMENT_REQUESTS_PER_MONTH = 1000;
const MAX_ATTACHMENT_BYTES = 1_048_576;

const anonymousRateLimit = {
  requestsPerMinute: isProd
    ? PRODUCTION_REQUESTS_PER_MINUTE
    : DEVELOPMENT_REQUESTS_PER_MINUTE,
  requestsPerMonth: isProd
    ? PRODUCTION_REQUESTS_PER_MONTH
    : DEVELOPMENT_REQUESTS_PER_MONTH,
};

/**
 * ChatJS Configuration
 *
 * Edit this file to customize your app.
 * @see https://chatjs.dev/docs/reference/config
 */
const config = defineConfig({
  ai: {
    anonymousModels: ["openai/gpt-5-nano"],
    disabledModels: [],
    gateway: "vercel",
    providerOrder: [
      "openai",
      "anthropic",
      "google",
      "xai",
      "meta",
      "mistral",
      "deepseek",
      "perplexity",
      "cohere",
      "alibaba",
      "amazon",
      "inception",
      "moonshot",
      "morph",
      "zai",
    ],
    tools: {
      code: {
        edits: "openai/gpt-5-mini",
      },
      deepResearch: {
        allowClarification: true,
        defaultModel: "openai/gpt-5-nano",
        finalReportModel: "openai/gpt-5-mini",
        maxConcurrentResearchUnits: 2,
        maxResearcherIterations: 1,
        maxSearchQueries: 2,
      },
      followupSuggestions: {
        enabled: true,
      },
      image: {
        default: "google/gemini-3-pro-image",
      },
      sheet: {
        analyze: "openai/gpt-5-mini",
        format: "openai/gpt-5-mini",
      },
      text: {
        polish: "openai/gpt-5-mini",
      },
    },
    workflows: {
      chatImageCompatible: "openai/gpt-4o-mini",
    },
  },
  anonymous: {
    availableTools: [],
    rateLimit: anonymousRateLimit,
  },
  appDescription:
    "AI chat with 120+ models for members of masonjames.com. Sign in with your masonjames.com membership.",
  appName: "Chat by Mason James",
  appPrefix: "chat",
  appTitle: "Chat by Mason James - AI chat for members",
  appUrl: "https://chat.masonjames.com",
  attachments: {
    acceptedTypes: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    // 1MB
    maxBytes: MAX_ATTACHMENT_BYTES,
    maxDimension: 2048,
  },
  authentication: {
    // Requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET
    github: false,
    // Requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
    google: false,
    // Requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET
    vercel: false,
  },
  desktopApp: {
    enabled: false,
  },
  features: {
    parallelResponses: true,
  },
  legal: {
    governingLaw: "United States",
    minimumAge: 13,
    refundPolicy: "no-refunds",
  },
  organization: {
    contact: {
      legalEmail: "legal@masonjames.com",
      privacyEmail: "privacy@masonjames.com",
    },
    name: "Mason James",
  },
  policies: {
    privacy: {
      lastUpdated: "July 24, 2025",
      title: "Privacy Policy",
    },
    terms: {
      lastUpdated: "July 24, 2025",
      title: "Terms of Service",
    },
  },
  services: {
    aiProviders: [
      "OpenAI",
      "Anthropic",
      "xAI",
      "Google",
      "Meta",
      "Mistral",
      "Alibaba",
      "Amazon",
      "Cohere",
      "DeepSeek",
      "Perplexity",
      "Vercel",
      "Inception",
      "Moonshot",
      "Morph",
      "ZAI",
    ],
    hosting: "Hetzner (Dokploy on Docker Swarm)",
    paymentProcessors: ["Stripe, through masonjames.com memberships"],
  },
});
export default config;
