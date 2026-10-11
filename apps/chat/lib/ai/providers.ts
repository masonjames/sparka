import type { ImageModel, LanguageModelMiddleware } from "ai";
import type {
  LanguageModelV4,
  SharedV4ProviderOptions,
} from "@ai-sdk/provider";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import type { AppModelId } from "./app-models";
import type { InstalledGateway } from "./gateways/registry";

import { devToolsMiddleware } from "@ai-sdk/devtools";
import { getActiveGateway } from "./active-gateway";
import { getAppModelDefinition } from "./app-models";
import { getModelProviderOptions as modelProviderOptions } from "@chat-js/gateways/provider-options";

type ActiveGatewayImageModelId = Parameters<
  InstalledGateway["createImageModel"]
>[0];

const getLanguageModel = async (
  modelId: AppModelId
): Promise<LanguageModelV4> => {
  const model = await getAppModelDefinition(modelId);
  const languageProvider = getActiveGateway().createLanguageModel(
    model.apiModelId
  );

  const middlewares: LanguageModelMiddleware[] = [];

  // Add devtools middleware in development
  if (process.env.NODE_ENV === "development") {
    middlewares.push(devToolsMiddleware());
  }

  // Add reasoning middleware if the model supports reasoning
  if (model.reasoning && model.owned_by === "xai") {
    middlewares.push(extractReasoningMiddleware({ tagName: "think" }));
  }

  if (middlewares.length === 0) {
    return languageProvider;
  }

  return wrapLanguageModel({
    middleware: middlewares,
    model: languageProvider,
  });
};

const getImageModel = (modelId: ActiveGatewayImageModelId): ImageModel => {
  const imageModel = getActiveGateway().createImageModel(modelId);
  if (imageModel === null) {
    throw new Error(
      `Gateway '${getActiveGateway().type}' does not support dedicated image models. Use a multimodal language model instead.`
    );
  }
  return imageModel;
};
// Get a multimodal language model that can generate images via generateText
const getMultimodalImageModel = (modelId: string): LanguageModelV4 =>
  getActiveGateway().createLanguageModel(modelId);

// Model aliases removed - use getLanguageModel directly with specific model IDs

const getModelProviderOptions = async (
  providerModelId: AppModelId
): Promise<SharedV4ProviderOptions> =>
  modelProviderOptions(await getAppModelDefinition(providerModelId));
export {
  getImageModel,
  getLanguageModel,
  getModelProviderOptions,
  getMultimodalImageModel,
};
