import type { AppModelId } from "../ai/app-models";
import type { ChatMessage, ToolName } from "../ai/types";
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

const AVAILABLE_MODELS: AppModelId[] = [
  "google/gemini-2.0-flash",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4o-mini",
  "cohere/command-a",
];

export const ANONYMOUS_LIMITS = {
  CREDITS: process.env.NODE_ENV === "production" ? 10 : 1000,
  AVAILABLE_MODELS,
  AVAILABLE_TOOLS: ["createDocument", "updateDocument"] satisfies ToolName[],
  SESSION_DURATION: 2_147_483_647, // Max session time
  // Rate limiting for anonymous users based on IP
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: process.env.NODE_ENV === "production" ? 5 : 60,
    REQUESTS_PER_MONTH: process.env.NODE_ENV === "production" ? 10 : 1000, // Same as MAX_MESSAGES
  },
} as const;
