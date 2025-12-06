import { unstable_cache as cache } from "next/cache";
import {
  type ImageModelData,
  imageModelsData,
} from "@/lib/models/image-models";
import type { ImageModelId } from "../models/image-model-id";
import type { ModelData } from "./ModelData";
import type { ModelId } from "./models";
import { fetchModels } from "./models";

export type { ModelId } from "./models";

export type ImageModelDefinition = ImageModelData & {
  features?: never; // deprecated: use ModelExtra in base defs if needed later
};

export type AppModelId = ModelId | `${ModelId}-reasoning`;
export type AppModelDefinition = Omit<ModelData, "id"> & {
  id: AppModelId;
  apiModelId: ModelId;
};

const DISABLED_MODELS: Partial<Record<ModelId, true>> = {
  // 'anthropic/claude-opus-4': true,
  // 'anthropic/claude-opus-4.1': true,
  "morph/morph-v3-large": true,
  "morph/morph-v3-fast": true,
};

const PROVIDER_ORDER = ["openai", "google", "anthropic", "xai"];

function buildAppModels(models: ModelData[]): AppModelDefinition[] {
  return models
    .flatMap((model) => {
      const modelId = model.id as ModelId;
      // If the model supports reasoning, return two variants:
      // - Non-reasoning (original id, reasoning=false)
      // - Reasoning (id with -reasoning suffix, reasoning=true)
      if (model.reasoning === true) {
        const reasoningId: AppModelId = `${modelId}-reasoning`;

        return [
          {
            ...model,
            id: reasoningId,
            apiModelId: modelId,
            disabled: DISABLED_MODELS[modelId],
          },
          {
            ...model,
            reasoning: false,
            apiModelId: modelId,
            disabled: DISABLED_MODELS[modelId],
          },
        ];
      }

      // Models without reasoning stay as-is
      return [
        {
          ...model,
          apiModelId: modelId,
          disabled: DISABLED_MODELS[modelId],
        },
      ];
    })
    .filter(
      (model) => model.type === "language" && !model.disabled
    ) as AppModelDefinition[];
}

function buildChatModels(
  appModels: AppModelDefinition[]
): AppModelDefinition[] {
  return appModels
    .filter((model) => model.output.text === true)
    .sort((a, b) => {
      const aProviderIndex = PROVIDER_ORDER.indexOf(a.owned_by);
      const bProviderIndex = PROVIDER_ORDER.indexOf(b.owned_by);

      const aIndex =
        aProviderIndex === -1 ? PROVIDER_ORDER.length : aProviderIndex;
      const bIndex =
        bProviderIndex === -1 ? PROVIDER_ORDER.length : bProviderIndex;

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return 0;
    });
}

export const fetchAllAppModels = cache(
  async (): Promise<AppModelDefinition[]> => {
    const models = await fetchModels();
    return buildAppModels(models);
  },
  ["all-app-models"],
  { revalidate: 3600, tags: ["ai-gateway-models"] }
);

export const fetchChatModels = cache(
  async (): Promise<AppModelDefinition[]> => {
    const appModels = await fetchAllAppModels();
    return buildChatModels(appModels);
  },
  ["chat-models"],
  { revalidate: 3600, tags: ["ai-gateway-models"] }
);

export async function getAppModelDefinition(
  modelId: AppModelId
): Promise<AppModelDefinition> {
  const models = await fetchAllAppModels();
  const model = models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

const allImageModels = imageModelsData;

const _imageModelsByIdCache = new Map<string, ImageModelDefinition>();

function getImageModelsByIdDict(): Map<string, ImageModelDefinition> {
  if (_imageModelsByIdCache.size === 0) {
    for (const model of allImageModels) {
      _imageModelsByIdCache.set(model.id, model);
    }
  }
  return _imageModelsByIdCache;
}

export function getImageModelDefinition(
  modelId: ImageModelId
): ImageModelDefinition {
  const modelsByIdDict = getImageModelsByIdDict();
  const model = modelsByIdDict.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export const DEFAULT_CHAT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_PDF_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_TITLE_MODEL: ModelId = "google/gemini-2.5-flash-lite";
export const DEFAULT_ARTIFACT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL: ModelId =
  "google/gemini-2.5-flash-lite";
export const DEFAULT_ARTIFACT_SUGGESTION_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_IMAGE_MODEL: ImageModelId = "openai/gpt-image-1";
export const DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL: ModelId =
  "openai/gpt-4o-mini";
export const DEFAULT_SUGGESTIONS_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_POLISH_TEXT_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_FORMAT_AND_CLEAN_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";
export const DEFAULT_ANALYZE_AND_VISUALIZE_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";

export const DEFAULT_CODE_EDITS_MODEL: ModelId = "openai/gpt-5-mini";

/**
 * Models enabled by default when a user has no preferences set.
 * This provides a curated list of models for new users.
 */
export const DEFAULT_ENABLED_MODELS: AppModelId[] = [
  // OpenAI - flagship models
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "openai/gpt-5-chat",
  "openai/gpt-5-reasoning",
  "openai/o4-mini",
  // Google - best flash and pro
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  // Anthropic - latest sonnet
  "anthropic/claude-sonnet-4",
  "anthropic/claude-sonnet-4-reasoning",
  // xAI - grok 4
  "xai/grok-4",
  "xai/grok-4-reasoning",
];

export const ANONYMOUS_AVAILABLE_MODELS: AppModelId[] = [
  "google/gemini-2.0-flash",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4o-mini",
];
