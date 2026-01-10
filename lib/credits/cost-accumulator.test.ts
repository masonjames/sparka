import { beforeEach, describe, expect, it, vi } from "vitest";
import { CostAccumulator } from "./cost-accumulator";

// Mock the entire app-models module
vi.mock("../ai/app-models", () => ({
  getAppModelDefinition: vi.fn(async (modelId: string) => ({
    name: modelId,
    apiModelId: modelId,
    provider: "test",
    pricing: {
      // $3/$15 per million tokens (Claude-like pricing)
      input: "0.000003",
      output: "0.000015",
    },
  })),
}));

type AppModelId = string;

describe("CostAccumulator", () => {
  let accumulator: CostAccumulator;

  beforeEach(() => {
    accumulator = new CostAccumulator();
  });

  describe("initial state", () => {
    it("should start with no entries", () => {
      expect(accumulator.getEntries()).toEqual([]);
      expect(accumulator.hasEntries()).toBe(false);
    });

    it("should return 0 total cost when empty", async () => {
      const cost = await accumulator.getTotalCost();
      expect(cost).toBe(0);
    });
  });

  describe("addLLMCost", () => {
    it("should add LLM cost entry", () => {
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 1000, outputTokens: 500 },
        "main-chat"
      );

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        type: "llm",
        modelId: "claude-3-5-sonnet",
        usage: { inputTokens: 1000, outputTokens: 500 },
        source: "main-chat",
      });
    });

    it("should track multiple LLM costs", () => {
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 1000, outputTokens: 500 },
        "main-chat"
      );
      accumulator.addLLMCost(
        "gpt-4o" as AppModelId,
        { inputTokens: 2000, outputTokens: 1000 },
        "deep-research"
      );

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(2);
      expect(accumulator.hasEntries()).toBe(true);
    });

    it("should calculate LLM cost correctly", async () => {
      // With mock pricing: $3/$15 per million tokens
      // 10000 input * 0.000003 = 0.03 dollars
      // 1000 output * 0.000015 = 0.015 dollars
      // Total = 0.045 dollars = 4.5 cents, ceil = 5 cents
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 10_000, outputTokens: 1000 },
        "main-chat"
      );

      const cost = await accumulator.getTotalCost();
      expect(cost).toBe(5);
    });
  });

  describe("addAPICost", () => {
    it("should add API cost entry", () => {
      accumulator.addAPICost("webSearch", 1);

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        type: "api",
        apiName: "webSearch",
        cost: 1,
      });
    });

    it("should not add zero cost entries", () => {
      accumulator.addAPICost("webSearch", 0);

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(0);
    });

    it("should not add negative cost entries", () => {
      accumulator.addAPICost("webSearch", -5);

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(0);
    });

    it("should track multiple API costs", () => {
      accumulator.addAPICost("webSearch", 1);
      accumulator.addAPICost("codeInterpreter", 5);
      accumulator.addAPICost("generateImage", 3);

      const entries = accumulator.getEntries();
      expect(entries).toHaveLength(3);
    });
  });

  describe("getTotalCost", () => {
    it("should sum multiple API costs", async () => {
      accumulator.addAPICost("webSearch", 1);
      accumulator.addAPICost("codeInterpreter", 5);
      accumulator.addAPICost("generateImage", 3);

      const cost = await accumulator.getTotalCost();
      expect(cost).toBe(9);
    });

    it("should sum LLM and API costs", async () => {
      // LLM: 10000 input * 0.000003 + 1000 output * 0.000015 = 0.03 + 0.015 = 0.045 dollars = 4.5 cents
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 10_000, outputTokens: 1000 },
        "main-chat"
      );
      // API: 1 + 5 = 6 cents
      accumulator.addAPICost("webSearch", 1);
      accumulator.addAPICost("codeInterpreter", 5);

      const cost = await accumulator.getTotalCost();
      // Total = ceil(4.5 + 6) = ceil(10.5) = 11 cents
      expect(cost).toBe(11);
    });

    it("should ceil fractional total to next cent", async () => {
      // Very small LLM usage -> fractional cost
      accumulator.addLLMCost(
        "test-model" as AppModelId,
        { inputTokens: 10, outputTokens: 5 },
        "test"
      );

      const cost = await accumulator.getTotalCost();
      // Should be at least 1 cent (ceiled)
      expect(cost).toBeGreaterThanOrEqual(1);
    });

    it("should handle deep research with multiple sub-calls", async () => {
      // Simulating deep research flow
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 5000, outputTokens: 500 },
        "deep-research-supervisor"
      );
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 8000, outputTokens: 2000 },
        "deep-research-researcher"
      );
      accumulator.addLLMCost(
        "claude-3-5-sonnet" as AppModelId,
        { inputTokens: 3000, outputTokens: 1000 },
        "deep-research-compress"
      );
      accumulator.addAPICost("webSearch", 1);
      accumulator.addAPICost("webSearch", 1);

      const cost = await accumulator.getTotalCost();
      expect(cost).toBeGreaterThan(0);
      expect(accumulator.getEntries()).toHaveLength(5);
    });
  });

  describe("getEntries", () => {
    it("should return a copy of entries", () => {
      accumulator.addAPICost("webSearch", 1);

      const entries1 = accumulator.getEntries();
      const entries2 = accumulator.getEntries();

      expect(entries1).not.toBe(entries2);
      expect(entries1).toEqual(entries2);
    });

    it("should not allow mutation of internal entries", () => {
      accumulator.addAPICost("webSearch", 1);

      const entries = accumulator.getEntries();
      entries.push({ type: "api", apiName: "fake", cost: 100 });

      expect(accumulator.getEntries()).toHaveLength(1);
    });
  });

  describe("hasEntries", () => {
    it("should return false when empty", () => {
      expect(accumulator.hasEntries()).toBe(false);
    });

    it("should return true after adding LLM cost", () => {
      accumulator.addLLMCost(
        "test" as AppModelId,
        { inputTokens: 100, outputTokens: 50 },
        "test"
      );
      expect(accumulator.hasEntries()).toBe(true);
    });

    it("should return true after adding API cost", () => {
      accumulator.addAPICost("webSearch", 1);
      expect(accumulator.hasEntries()).toBe(true);
    });
  });
});
