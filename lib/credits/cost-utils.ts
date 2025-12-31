import type { AppModelDefinition, AppModelId } from "../ai/app-models";
import { getAppModelDefinition } from "../ai/app-models";

/** Minimal usage info needed for cost calculation */
type UsageInfo = { inputTokens?: number; outputTokens?: number };

/**
 * Calculate LLM cost in CENTS from AI SDK usage data and model pricing.
 * Pricing is per-token in dollars (e.g., "0.00000006" = $0.06 per million tokens).
 * Returns cost in cents (multiply dollars by 100).
 */
export function calculateLLMCost(
  usage: UsageInfo,
  pricing: { input: string; output: string }
): number {
  const inputCost = (usage.inputTokens ?? 0) * Number.parseFloat(pricing.input);
  const outputCost =
    (usage.outputTokens ?? 0) * Number.parseFloat(pricing.output);
  // Convert dollars to cents
  return (inputCost + outputCost) * 100;
}

/**
 * Calculate cost from usage and model ID. Returns 0 if pricing unavailable.
 */
export async function calculateLLMCostByModelId(
  usage: UsageInfo,
  modelId: AppModelId
): Promise<number> {
  const model = await getAppModelDefinition(modelId);
  return calculateLLMCostFromModel(usage, model);
}

/**
 * Calculate cost from usage and model definition. Returns 0 if pricing unavailable.
 */
export function calculateLLMCostFromModel(
  usage: UsageInfo,
  model: AppModelDefinition
): number {
  const { pricing } = model;
  if (!(pricing?.input && pricing?.output)) {
    return 0;
  }
  const cost = calculateLLMCost(usage, {
    input: pricing.input,
    output: pricing.output,
  });
  // Minimum cost is rounded up to the nearest cent
  return Math.ceil(cost);
}
