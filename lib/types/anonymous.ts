import type { ChatMessage, ToolName } from "../ai/types";
import { siteConfig } from "../config";
import type { DBMessage } from "../db/schema";
import type { UIChat } from "./ui-chat";

export type AnonymousSession = {
  id: string;
  remainingCredits: number;
  createdAt: Date;
};

// Anonymous chat structure matching the DB chat structure
export interface AnonymousChat extends UIChat {}

// Anonymous message structure - includes parts since they're stored in localStorage
export interface AnonymousMessage extends DBMessage {
  // Parts are stored as JSON in localStorage but use the same shape
  // as ChatMessage["parts"] for tool/document cloning.
  parts: ChatMessage["parts"];
}

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
