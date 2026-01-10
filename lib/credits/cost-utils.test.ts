import { describe, expect, it, vi } from "vitest";

// Mock app-models to avoid Next.js import chain issues
vi.mock("../ai/app-models", () => ({}));

// Import after mocking
const { calculateLLMCost, calculateLLMCostFromModel } = await import(
  "./cost-utils"
);

describe("calculateLLMCost", () => {
  it("should calculate cost from tokens and pricing", () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    // $0.01 per 1K input, $0.03 per 1K output
    const pricing = { input: "0.00001", output: "0.00003" };

    const cost = calculateLLMCost(usage, pricing);

    // 1000 * 0.00001 = 0.01 (input)
    // 500 * 0.00003 = 0.015 (output)
    // Total = 0.025 dollars = 2.5 cents
    expect(cost).toBeCloseTo(2.5, 5);
  });

  it("should handle zero tokens", () => {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const pricing = { input: "0.00001", output: "0.00003" };

    const cost = calculateLLMCost(usage, pricing);
    expect(cost).toBe(0);
  });

  it("should handle undefined tokens as zero", () => {
    const usage = {};
    const pricing = { input: "0.00001", output: "0.00003" };

    const cost = calculateLLMCost(usage, pricing);
    expect(cost).toBe(0);
  });

  it("should handle only input tokens", () => {
    const usage = { inputTokens: 1_000_000 }; // 1M tokens
    // $1 per 1M input
    const pricing = { input: "0.000001", output: "0.000003" };

    const cost = calculateLLMCost(usage, pricing);
    // 1M * 0.000001 = 1 dollar = 100 cents
    expect(cost).toBeCloseTo(100, 5);
  });

  it("should handle only output tokens", () => {
    const usage = { outputTokens: 1_000_000 }; // 1M tokens
    // $3 per 1M output
    const pricing = { input: "0.000001", output: "0.000003" };

    const cost = calculateLLMCost(usage, pricing);
    // 1M * 0.000003 = 3 dollars = 300 cents
    expect(cost).toBeCloseTo(300, 5);
  });

  it("should handle Claude 3.5 Sonnet pricing", () => {
    // Claude 3.5 Sonnet: $3/$15 per million tokens
    const usage = { inputTokens: 10_000, outputTokens: 1000 };
    const pricing = { input: "0.000003", output: "0.000015" };

    const cost = calculateLLMCost(usage, pricing);
    // 10000 * 0.000003 = 0.03 (input)
    // 1000 * 0.000015 = 0.015 (output)
    // Total = 0.045 dollars = 4.5 cents
    expect(cost).toBeCloseTo(4.5, 5);
  });

  it("should handle GPT-4o pricing", () => {
    // GPT-4o: $2.50/$10 per million tokens
    const usage = { inputTokens: 100_000, outputTokens: 10_000 };
    const pricing = { input: "0.0000025", output: "0.00001" };

    const cost = calculateLLMCost(usage, pricing);
    // 100000 * 0.0000025 = 0.25 (input)
    // 10000 * 0.00001 = 0.1 (output)
    // Total = 0.35 dollars = 35 cents
    expect(cost).toBeCloseTo(35, 5);
  });

  it("should handle very small token counts", () => {
    const usage = { inputTokens: 10, outputTokens: 5 };
    const pricing = { input: "0.000003", output: "0.000015" };

    const cost = calculateLLMCost(usage, pricing);
    // 10 * 0.000003 = 0.00003 (input)
    // 5 * 0.000015 = 0.000075 (output)
    // Total = 0.000105 dollars = 0.0105 cents
    expect(cost).toBeCloseTo(0.0105, 6);
  });
});

describe("calculateLLMCostFromModel", () => {
  it("should return 0 when model has no pricing", () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    expect(cost).toBe(0);
  });

  it("should return 0 when pricing has no input", () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
      pricing: { output: "0.00003" },
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    expect(cost).toBe(0);
  });

  it("should return 0 when pricing has no output", () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
      pricing: { input: "0.00001" },
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    expect(cost).toBe(0);
  });

  it("should calculate and ceil cost when model has valid pricing", () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
      pricing: { input: "0.00001", output: "0.00003" },
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    // Raw cost = 2.5 cents, ceil = 3 cents
    expect(cost).toBe(3);
  });

  it("should ceil fractional costs up", () => {
    const usage = { inputTokens: 10, outputTokens: 5 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
      pricing: { input: "0.000003", output: "0.000015" },
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    // Raw cost = 0.0105 cents, ceil = 1 cent
    expect(cost).toBe(1);
  });

  it("should return 0 when usage results in 0 cost", () => {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const model = {
      name: "test-model",
      apiModelId: "test",
      provider: "test",
      pricing: { input: "0.00001", output: "0.00003" },
    } as unknown as Parameters<typeof calculateLLMCostFromModel>[1];

    const cost = calculateLLMCostFromModel(usage, model);
    expect(cost).toBe(0);
  });
});
