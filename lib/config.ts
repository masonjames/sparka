// NOTE: In client components, use the `useConfig` hook from
// `@/components/config-provider` instead of importing `siteConfig` directly.

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

export type SiteConfig = {
  githubUrl: string;
  appPrefix: string;
  appName: string;
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
   * Validated at server startup via validateConfig().
   */
  integrations: {
    /** Code sandbox execution (E2B) */
    sandbox: boolean;
    /** Web search (requires TAVILY_API_KEY) */
    webSearch: boolean;
    /** OpenAI features like image gen (requires OPENAI_API_KEY) */
    openai: boolean;
    /** MCP tool servers (requires MCP_ENCRYPTION_KEY) */
    mcp: boolean;
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
   * Validated at server startup via validateConfig().
   */
  authentication: {
    /** Google OAuth (requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET) */
    google: boolean;
    /** GitHub OAuth (requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET) */
    github: boolean;
    /** Vercel OAuth (requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET) */
    vercel: boolean;
  };
};

/**
 * Site configuration - customize these values for your app.
 * Feature flags (integrations/authentication) are validated at server startup.
 */
export const siteConfig: SiteConfig = {
  githubUrl: "https://github.com/franciscomoretti/chatjs",
  appPrefix: "chatjs",
  appName: "ChatJS",

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

  // Set to true to enable - ensure env vars are configured
  integrations: {
    sandbox: true,
    webSearch: true,
    openai: true,
    mcp: false,
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

  // Set to true to enable - ensure env vars are configured
  authentication: {
    google: false,
    github: true,
    vercel: false,
  },
};
