import type chatConfig from "@/chat.config";
import type {
  DefaultGateway,
  GatewayImageModelIdMap,
  GatewayModelIdMap,
  GatewayType,
} from "./gateways/registry";
import type { generatedForGateway, models } from "./models.generated";

/** The gateway type actively selected in chat.config.ts */
export type ActiveGatewayType = typeof chatConfig extends {
  models: { gateway: infer G extends GatewayType };
}
  ? G
  : DefaultGateway;

/** Runtime model ID — narrowed to the active gateway */
export type ModelId = GatewayModelIdMap[ActiveGatewayType];

/** App-level model ID (same as ModelId; autocomplete comes from ConfigInput) */
export type AppModelId = ModelId;

// Helper: check if tuple T contains element E
type TupleIncludes<T extends readonly unknown[], E> = T extends readonly [
  infer H,
  ...infer R,
]
  ? H extends E
    ? true
    : TupleIncludes<R, E>
  : false;

// Extract language models with "image-generation" tag from the snapshot
type MultimodalImageModel =
  Extract<
    (typeof models)[number],
    { type: "language"; tags: readonly string[] }
  > extends infer M
    ? M extends { id: infer Id; tags: infer Tags extends readonly string[] }
      ? TupleIncludes<Tags, "image-generation"> extends true
        ? Id
        : never
      : never
    : never;

// Merge snapshot-derived multimodal image models into the map per gateway key
type FullImageModelIdMap = {
  [K in GatewayType]:
    | GatewayImageModelIdMap[K]
    | (K extends typeof generatedForGateway ? MultimodalImageModel : never);
};

export type ImageModelId = FullImageModelIdMap[ActiveGatewayType];
