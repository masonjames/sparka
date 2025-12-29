import type { gateway } from "@ai-sdk/gateway";

export type ImageModelId = Parameters<(typeof gateway)["imageModel"]>[0];

// Multimodal language models that can generate images via generateText
// These are language models with "image-generation" tag
// TODO: Change for type derivation from models.generated.ts
export type MultimodalImageModelId =
  | "google/gemini-2.5-flash-image"
  | "google/gemini-2.5-flash-image-preview"
  | "google/gemini-3-pro-image";

// Union of all models that can generate images
export type AnyImageModelId = ImageModelId | MultimodalImageModelId;

// Check if a model ID is a multimodal image model
export function isMultimodalImageModel(
  modelId: string
): modelId is MultimodalImageModelId {
  const multimodalModels: string[] = [
    "google/gemini-2.5-flash-image",
    "google/gemini-2.5-flash-image-preview",
    "google/gemini-3-pro-image",
  ];
  return multimodalModels.includes(modelId);
}
