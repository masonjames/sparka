import type { ImageModel, LanguageModel } from "ai";
import type { AiGatewayModel } from "../ai-gateway-models-schemas";

export type GatewayProvider<TGateway extends string = string> = {
  readonly type: TGateway;

  /** Create a language model instance from a model ID like "openai/gpt-5-nano" */
  createLanguageModel(modelId: string): LanguageModel;

  /** Create a dedicated image model instance, or null if unsupported */
  createImageModel(modelId: string): ImageModel | null;

  /** Fetch the list of available models from the gateway's API */
  fetchModels(): Promise<AiGatewayModel[]>;
};
