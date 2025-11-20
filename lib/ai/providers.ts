import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import type { ModelId } from "@airegistry/vercel-gateway";
import { getModelAndProvider } from "@airegistry/vercel-gateway";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import type { ImageModelId } from "../models/image-model-id";
import type { AppModelId } from "./app-models";
import { getAppModelDefinition, getImageModelDefinition } from "./app-models";

const _telemetryConfig = {
  telemetry: {
    isEnabled: true,
    functionId: "get-language-model",
  },
};

export const getLanguageModel = (modelId: ModelId) => {
  const model = getAppModelDefinition(modelId);
  const languageProvider = gateway(model.id);

  // Wrap with reasoning middleware if the model supports reasoning
  if (model.reasoning && model.owned_by === "xai") {
    console.log("Wrapping reasoning middleware for", model.id);
    return wrapLanguageModel({
      model: languageProvider,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  }

  return languageProvider;
};

export const getImageModel = (modelId: ImageModelId) => {
  const model = getImageModelDefinition(modelId);
  const { model: modelIdShort } = getModelAndProvider(modelId as ModelId);

  if (model.owned_by === "openai") {
    return openai.image(modelIdShort);
  }
  throw new Error(`Provider ${model.owned_by} not supported`);
};

const _MODEL_ALIASES = {
  "chat-model": getLanguageModel("openai/gpt-4o-mini"),
  "title-model": getLanguageModel("openai/gpt-4o-mini"),
  "artifact-model": getLanguageModel("openai/gpt-4o-mini"),
  "chat-model-reasoning": getLanguageModel("openai/o3-mini"),
};

export const getModelProviderOptions = (
  providerModelId: AppModelId
):
  | {
      openai: OpenAIResponsesProviderOptions;
    }
  | {
      anthropic: AnthropicProviderOptions;
    }
  | {
      xai: Record<string, never>;
    }
  | {
      google: GoogleGenerativeAIProviderOptions;
    }
  | Record<string, never> => {
  const model = getAppModelDefinition(providerModelId);
  if (model.owned_by === "openai") {
    if (model.reasoning) {
      return {
        openai: {
          reasoningSummary: "auto",
          ...(model.id === "openai/gpt-5" ||
          model.id === "openai/gpt-5-mini" ||
          model.id === "openai/gpt-5-nano"
            ? { reasoningEffort: "low" }
            : {}),
        } satisfies OpenAIResponsesProviderOptions,
      };
    }
    return { openai: {} };
  }
  if (model.owned_by === "anthropic") {
    if (model.reasoning) {
      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 4096,
          },
        } satisfies AnthropicProviderOptions,
      };
    }
    return { anthropic: {} };
  }
  if (model.owned_by === "xai") {
    return {
      xai: {},
    };
  }
  if (model.owned_by === "google") {
    if (model.reasoning) {
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: 10_000,
          },
        },
      };
    }
    return { google: {} };
  }
  return {};
};
