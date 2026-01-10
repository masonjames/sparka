import type { AppModelId } from "../ai/app-models";
import { getAppModelDefinition } from "../ai/app-models";
import { calculateLLMCostFromModel } from "./cost-utils";

/** Minimal usage info needed for cost calculation */
export type UsageInfo = { inputTokens?: number; outputTokens?: number };

type LLMCostEntry = {
  type: "llm";
  modelId: AppModelId;
  usage: UsageInfo;
  source: string;
};

type APICostEntry = {
  type: "api";
  apiName: string;
  cost: number;
};

type CostEntry = LLMCostEntry | APICostEntry;

/**
 * Accumulates costs from multiple LLM and external API calls.
 * Pass through call chain, collect at request end.
 */
export class CostAccumulator {
  private entries: CostEntry[] = [];

  /** Add LLM cost from generateText/streamText usage */
  addLLMCost(modelId: AppModelId, usage: UsageInfo, source: string): void {
    this.entries.push({ type: "llm", modelId, usage, source });
  }

  /** Add fixed external API cost (in cents) */
  addAPICost(apiName: string, cost: number): void {
    if (cost > 0) {
      this.entries.push({ type: "api", apiName, cost });
    }
  }

  /** Get total cost in cents, rounded up */
  async getTotalCost(): Promise<number> {
    let total = 0;

    for (const entry of this.entries) {
      if (entry.type === "api") {
        total += entry.cost;
      } else {
        const model = await getAppModelDefinition(entry.modelId);
        total += calculateLLMCostFromModel(entry.usage, model);
      }
    }

    return Math.ceil(total);
  }

  /** Get breakdown of all cost entries */
  getEntries(): CostEntry[] {
    return [...this.entries];
  }

  /** Check if any costs have been recorded */
  hasEntries(): boolean {
    return this.entries.length > 0;
  }
}
