import { OpenRouterGateway } from "./openrouter-gateway";
import type { GatewayProvider as GatewayProviderBase } from "./gateway-provider";
import { VercelGateway } from "./vercel-gateway";


export const gatewayRegistry = {
  vercel: () => new VercelGateway(),
  openrouter: () => new OpenRouterGateway(),
} as const satisfies Record<string, () => GatewayProviderBase>;

export type GatewayProvider = GatewayProviderBase<GatewayType>;
export type GatewayType = keyof typeof gatewayRegistry;
/** Infer model ID type from a gateway's `createLanguageModel` parameter */
type InferModelId<T extends GatewayType> = Parameters<
  ReturnType<(typeof gatewayRegistry)[T]>["createLanguageModel"]
>[0];

export type GatewayModelIdMap = {
  [K in GatewayType]: InferModelId<K>;
};
