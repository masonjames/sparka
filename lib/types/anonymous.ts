import type { ToolName } from "../ai/types";
import { siteConfig } from "../config";

export type AnonymousSession = {
  id: string;
  remainingCredits: number;
  createdAt: Date;
};

const anonConfig = siteConfig.anonymous;

export const ANONYMOUS_LIMITS = {
  CREDITS: anonConfig.credits,
  AVAILABLE_MODELS: siteConfig.models.anonymousModels,
  AVAILABLE_TOOLS: anonConfig.availableTools as ToolName[],
  SESSION_DURATION: 2_147_483_647, // Max session time
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: anonConfig.rateLimit.requestsPerMinute,
    REQUESTS_PER_MONTH: anonConfig.rateLimit.requestsPerMonth,
  },
} as const;
