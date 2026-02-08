import { OpenRouterGateway } from "./openrouter-gateway";
import type { GatewayProvider as GatewayProviderBase } from "./gateway-provider";
import { VercelGateway } from "./vercel-gateway";


export const gatewayRegistry = {
  vercel: () => new VercelGateway(),
  openrouter: () => new OpenRouterGateway(),
} as const satisfies Record<string, () => GatewayProviderBase>;

export type GatewayProvider = GatewayProviderBase<GatewayType>;
export type GatewayType = keyof typeof gatewayRegistry;
/** Infer model ID type from a gateway's `fetchModelRecord` return type */
type InferModelId<T extends GatewayType> = keyof Awaited<
  ReturnType<ReturnType<(typeof gatewayRegistry)[T]>["fetchModelRecord"]>
>;

export type GatewayModelIdMap = {
  [K in GatewayType]: InferModelId<K>;
};
