import type { GatewayModelIdMap, GatewayType } from "./gateways/registry";

/** Runtime model ID — union of all gateway model ID types (resolves to string) */
export type ModelId = GatewayModelIdMap[GatewayType];

/** App-level model ID (same as ModelId; autocomplete comes from ConfigInput) */
export type AppModelId = ModelId;
