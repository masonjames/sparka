import { env } from "./env";

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
  integrations: {
    sandbox: boolean;
    webSearch: boolean;
    openai: boolean;
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
  authentication: {
    google: boolean;
    github: boolean;
    vercel: boolean;
  };
};

export const siteConfig: SiteConfig = {
  githubUrl: "https://github.com/franciscomoretti/sparka",
  appPrefix: "sparka-ai",

  appName: "Sparka AI",
  organization: {
    name: "Sparka AI Ltd",
    contact: {
      privacyEmail: "privacy@sparka.ai",
      legalEmail: "legal@sparka.ai",
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
    sandbox: true,
    webSearch: Boolean(env.TAVILY_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    mcp: Boolean(env.MCP_ENCRYPTION_KEY),
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
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    vercel: Boolean(env.VERCEL_APP_CLIENT_ID && env.VERCEL_APP_CLIENT_SECRET),
  },
};
