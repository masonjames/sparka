"use server";

import { fetchModels } from "@/lib/ai/models";
import { toModelData } from "@/lib/ai/toModelData";

export async function getAvailableModels() {
  const models = await fetchModels();
  return models.map(toModelData);
}
