import { unstable_cache as cache } from "next/cache";
import {
  type AiGatewayModel,
  aiGatewayModelsResponseSchema,
} from "./ai-gateway-models-schemas";

export async function fetchModelsRaw(): Promise<AiGatewayModel[]> {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  if (!apiKey) {
    console.warn("No AI gateway API key found, returning empty models");
    return [];
  }

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const bodyRaw = await response.json();
    const body = aiGatewayModelsResponseSchema.parse(bodyRaw);
    return body.data || [];
  } catch (error) {
    console.error("Error fetching models from gateway:", error);
    return [];
  }
}

export const fetchModels = cache(
  async () => await fetchModelsRaw(),
  ["ai-gateway-models"],
  {
    revalidate: 3600,
    tags: ["ai-gateway-models"],
  }
);
