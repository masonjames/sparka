// NOTE: In client components, use the `useConfig` hook from
// `@/components/config-provider` instead of importing `siteConfig` directly.

import type { AppModelId } from "@/lib/ai/app-model-id";
import type { AnyImageModelId } from "./models/image-model-id";

export type PricingConfig = {
  currency?: string;
  free?: {
    name: string;
    summary: string;
  };
  pro?: {
    name: string;
    monthlyPrice: number;
    summary: string;
  };
};

export type ModelsConfig = {
  /** Provider sort order in model selector */
  providerOrder: string[];
  /** Models to hide from all users */
  disabledModels: AppModelId[];
  /** Default models enabled for new users */
  curatedDefaults: AppModelId[];
  /** Models available to anonymous users */
  anonymousModels: AppModelId[];
  /** Default model for each task type */
  defaults: {
    chat: AppModelId;
    title: AppModelId;
    pdf: AppModelId;
    artifact: AppModelId;
    artifactSuggestion: AppModelId;
    followupSuggestions: AppModelId;
    suggestions: AppModelId;
    polishText: AppModelId;
    formatSheet: AppModelId;
    analyzeSheet: AppModelId;
    codeEdits: AppModelId;
    chatImageCompatible: AppModelId;
    image: AnyImageModelId;
  };
};

export type AnonymousConfig = {
  /** Message credits for anonymous users */
  credits: number;
  /** Tools available to anonymous users */
  availableTools: string[];
  /** Rate limits */
  rateLimit: {
    requestsPerMinute: number;
    requestsPerMonth: number;
  };
};

export type AttachmentsConfig = {
  /** Max file size in bytes after compression */
  maxBytes: number;
  /** Max image dimension (width/height) */
  maxDimension: number;
  /** Accepted MIME types with their file extensions */
  acceptedTypes: {
    "image/png": string[];
    "image/jpeg": string[];
    "application/pdf": string[];
  };
};

export type SiteConfig = {
  githubUrl: string;
  appPrefix: string;
  appName: string;
  appDescription: string;
  appUrl: string;
  organization: {
    name: string;
    contact: {
      privacyEmail: string;
      legalEmail: string;
    };
  };
  services: {
    hosting: string;
    aiProviders: string[];
    paymentProcessors: string[];
  };
  /**
   * Feature flags for optional integrations.
   * Set to true to enable - requires corresponding env vars.
   * Validated at build time via scripts/check-env.ts.
   */
  integrations: {
    /** Code sandbox execution (Vercel-native) */
    sandbox: boolean;
    /** Web search (requires TAVILY_API_KEY) */
    webSearch: boolean;
    /** MCP tool servers (requires MCP_ENCRYPTION_KEY) */
    mcp: boolean;
    /** AI image generation */
    imageGeneration: boolean;
  };
  pricing?: PricingConfig;
  legal: {
    minimumAge: number;
    governingLaw: string;
    refundPolicy: string;
  };
  policies: {
    privacy: {
      title: string;
      lastUpdated?: string;
    };
    terms: {
      title: string;
      lastUpdated?: string;
    };
  };
  /**
   * Auth provider toggles.
   * Set to true to enable - requires corresponding env vars.
   * Validated at build time via scripts/check-env.ts.
   */
  authentication: {
    /** Google OAuth (requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET) */
    google: boolean;
    /** GitHub OAuth (requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET) */
    github: boolean;
    /** Vercel OAuth (requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET) */
    vercel: boolean;
  };
  /** Model configuration */
  models: ModelsConfig;
  /** Anonymous user configuration */
  anonymous: AnonymousConfig;
  /** File attachment configuration */
  attachments: AttachmentsConfig;
};

const isProd = process.env.NODE_ENV === "production";

/**
 * Site configuration - customize these values for your app.
 * Feature flags (integrations/authentication) are validated at server startup.
 */
export const siteConfig: SiteConfig = {
  githubUrl: "https://github.com/franciscomoretti/chatjs",
  appPrefix: "chatjs",
  appName: "ChatJS",
  appDescription: "The prod-ready AI chat template",
  appUrl: "https://chatjs.dev",

  organization: {
    name: "ChatJS",
    contact: {
      privacyEmail: "privacy@chatjs.dev",
      legalEmail: "legal@chatjs.dev",
    },
  },

  services: {
    hosting: "Vercel",
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
    paymentProcessors: [],
  },

  integrations: {
    sandbox: true, // Vercel-native, no key needed
    webSearch: true, // Requires TAVILY_API_KEY or FIRECRAWL_API_KEY
    mcp: true, // Requires MCP_ENCRYPTION_KEY
    imageGeneration: true,
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
    vercel: true, // Requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET
  },

  models: {
    providerOrder: ["openai", "google", "anthropic", "xai"],
    disabledModels: ["morph/morph-v3-large", "morph/morph-v3-fast"],
    curatedDefaults: [
      // OpenAI
      "openai/gpt-5-nano",
      "openai/gpt-5-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat-latest",
      "openai/gpt-5.2-chat-latest-reasoning",
      // Google
      "google/gemini-2.5-flash-lite",
      "google/gemini-3-flash",
      "google/gemini-3-pro-preview",
      // Anthropic
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.5-reasoning",
      "anthropic/claude-opus-4.5",
      // xAI
      "xai/grok-4",
      "xai/grok-4-reasoning",
    ],
    anonymousModels: [
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "anthropic/claude-haiku-4.5",
    ],
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
    credits: isProd ? 10 : 1000,
    availableTools: ["createDocument", "updateDocument"],
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
};
