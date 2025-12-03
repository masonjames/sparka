"use server";

import { fetchModels } from "@/lib/ai/models";

export async function getAvailableModels() {
  return await fetchModels();
}
