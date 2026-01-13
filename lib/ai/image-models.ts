import { unstable_cache } from "next/cache";
import type { ImageModelId } from "@/lib/models/image-model-id";
import type { ModelData } from "./model-data";
import { fetchModels } from "./models";

export type ImageModelDefinition = ModelData & { type: "image" };

export const fetchImageModels = unstable_cache(
  async (): Promise<ImageModelDefinition[]> => {
    const models = await fetchModels(); // already falls back to models.generated.ts
    return models
      .filter((m) => m.type === "image")
      .map((m) => m as ImageModelDefinition);
  },
  ["ai-gateway-image-models"],
  { revalidate: 3600, tags: ["ai-gateway-models"] }
);

export async function getImageModelDefinition(
  modelId: ImageModelId
): Promise<ImageModelDefinition> {
  const models = await fetchImageModels();
  const model = models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}
