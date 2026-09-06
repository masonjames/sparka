import { defineConfig } from "@/lib/config-schema";

const isProd = process.env.NODE_ENV === "production";

/**
 * ChatJS Configuration
 *
 * Edit this file to customize your app.
 * @see https://chatjs.dev/docs/reference/config
 */
const config = defineConfig({
  appPrefix: "chat",
  appName: "Chat by Mason James",
  appTitle: "Chat by Mason James - AI Chat with 120+ Models",
  appDescription:
    "Chat with 120+ AI models including GPT-5, Claude, Gemini, and more. Features authentication, streaming, tool calling, and advanced capabilities.",
  appUrl: "https://chat.masonjames.com",
  organization: {
    name: "Mason James",
    contact: {
      privacyEmail: "privacy@masonjames.com",
      legalEmail: "legal@masonjames.com",
    },
  },
  services: {
    hosting: "Docker",
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
    paymentProcessors: ["Stripe"],
  },
  features: {
    attachments: true, // Uses R2 storage (R2_* env vars)
    parallelResponses: true,
  },
  legal: {
    minimumAge: 13,
    governingLaw: "United States",
    refundPolicy: "no-refunds",
  },
  policies: {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "July 24, 2025",
    },
    terms: {
      title: "Terms of Service",
      lastUpdated: "July 24, 2025",
    },
  },
  authentication: {
    google: true, // Requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
    github: true, // Requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET
    vercel: false, // Disabled for Docker hosting
  },
  desktopApp: {
    enabled: true,
  },
  ai: {
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
    disabledModels: [],
    anonymousModels: ["openai/gpt-5-nano"],
    workflows: {
      chatImageCompatible: "openai/gpt-4o-mini",
    },
    tools: {
      webSearch: {
        enabled: true, // Requires TAVILY_API_KEY or FIRECRAWL_API_KEY
      },
      urlRetrieval: {
        enabled: true, // Requires FIRECRAWL_API_KEY
      },
      codeExecution: {
        enabled: false, // Requires @vercel/sandbox — disabled for Docker
      },
      mcp: {
        enabled: true, // Requires MCP_ENCRYPTION_KEY
      },
      followupSuggestions: {
        enabled: true,
      },
      text: {
        polish: "openai/gpt-5-mini",
      },
      sheet: {
        format: "openai/gpt-5-mini",
        analyze: "openai/gpt-5-mini",
      },
      code: {
        edits: "openai/gpt-5-mini",
      },
      image: {
        enabled: true, // Uses R2 storage (R2_* env vars)
        default: "google/gemini-3-pro-image",
      },
      deepResearch: {
        enabled: true, // Requires webSearch
        defaultModel: "openai/gpt-5-nano",
        finalReportModel: "openai/gpt-5-mini",
        allowClarification: true,
        maxResearcherIterations: 1,
        maxConcurrentResearchUnits: 2,
        maxSearchQueries: 2,
      },
    },
  },
  paths: {
    tools: "@/tools/chatjs",
  },
  anonymous: {
    credits: isProd ? 10 : 1000,
    availableTools: [],
    rateLimit: {
      requestsPerMinute: isProd ? 5 : 60,
      requestsPerMonth: isProd ? 10 : 1000,
    },
  },
  attachments: {
    maxBytes: 1024 * 1024, // 1MB
    maxDimension: 2048,
    acceptedTypes: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
  },
});

export default config;
