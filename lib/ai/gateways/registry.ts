import type { GatewayProvider as GatewayProviderBase } from "./gateway-provider";
import { OpenAICompatibleGateway } from "./openai-compatible-gateway";
import { OpenAIGateway } from "./openai-gateway";
import { OpenRouterGateway } from "./openrouter-gateway";
import { VercelGateway } from "./vercel-gateway";

export const gatewayRegistry = {
  vercel: () => new VercelGateway(),
  openrouter: () => new OpenRouterGateway(),
  openai: () => new OpenAIGateway(),
  "openai-compatible": () => new OpenAICompatibleGateway(),
} as const satisfies Record<string, () => GatewayProviderBase>;

export type GatewayProvider = GatewayProviderBase<GatewayType>;
export type GatewayType = keyof typeof gatewayRegistry;
/** Infer model ID type from a gateway's `createLanguageModel` parameter */
type InferLanguageModelId<T extends GatewayType> = Parameters<
  ReturnType<(typeof gatewayRegistry)[T]>["createLanguageModel"]
>[0];

export type GatewayModelIdMap = {
  [K in GatewayType]: InferLanguageModelId<K>;
};

/** Infer image model ID type from a gateway's `createImageModel` parameter */
type InferImageModelId<T extends GatewayType> = Parameters<
  ReturnType<(typeof gatewayRegistry)[T]>["createImageModel"]
>[0];

export type GatewayImageModelIdMap = {
  [K in GatewayType]: InferImageModelId<K>;
};

/** Union of dedicated image model IDs and language model IDs that can produce images */
export type GatewayAnyImageModelIdMap = {
  [K in GatewayType]: InferImageModelId<K> | InferLanguageModelId<K>;
};
