import type chatConfig from "@/chat.config";
import type {
    DefaultGateway,
    GatewayImageModelIdMap,
    GatewayModelIdMap,
    GatewayType,
} from "./gateways/registry";
import { generatedForGateway, type models } from "./models.generated";


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

// Merge with derived from snapshot if snapshot matches current gateway

type GatewayGeneratedIsActive = typeof generatedForGateway extends ActiveGatewayType ? true : false;

// Helper: check if tuple T contains element E
type TupleIncludes<T extends readonly unknown[], E> = T extends readonly [
  infer H,
  ...infer R,
]
  ? H extends E
    ? true
    : TupleIncludes<R, E>
  : false;

// Extract language models with "image-generation" tag
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

type ActiveMultimodalImageModel = GatewayGeneratedIsActive extends true ? MultimodalImageModel : never;

export type ImageModelId = GatewayImageModelIdMap[ActiveGatewayType] | ActiveMultimodalImageModel
