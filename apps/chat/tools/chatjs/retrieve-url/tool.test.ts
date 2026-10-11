import { beforeEach, expect, test, vi } from "vitest";
import { testToolContext } from "@/tests/helpers/eve-tool-context";
import { toolResultSchema } from "@/lib/eve/tool-result";

const mocks = vi.hoisted(() => ({
  env: { FIRECRAWL_API_KEY: "test-key" },
  extract: vi.fn(),
  scrape: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@mendable/firecrawl-js", () => ({
  default: class {
    public scrapeUrl = mocks.scrape;
    public extract = mocks.extract;
  },
}));
vi.mock(
  "@/lib/logger",
  (): { createModuleLogger: () => { error: () => void } } => ({
    createModuleLogger: (): { error: () => void } => ({
      error: vi.fn<() => void>(),
    }),
  })
);
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.env.FIRECRAWL_API_KEY = "test-key";
});

test.each([
  ["missing configuration", "https://example.com"],
  ["invalid URL", "file:///private"],
])(
  "%s produces a zero-cost receipt without calling Firecrawl",
  async (reason, url) => {
    const noChargeUsd = 0;
    if (reason === "missing configuration") {
      mocks.env.FIRECRAWL_API_KEY = "";
    }
    const { retrieveUrl } = await import("./tool");
    const result = await retrieveUrl.execute(
      {
        url,
      },
      testToolContext()
    );
    expect(toolResultSchema.parse(result).usage.costUsd).toBe(noChargeUsd);
    expect(mocks.scrape).not.toHaveBeenCalled();
  }
);

test.each([false, true])(
  "provider completion keeps unknown cost explicit (failure=%s)",
  async (fails) => {
    if (fails) {
      mocks.scrape.mockRejectedValue(new Error("remote failure"));
    } else {
      mocks.scrape.mockResolvedValue({
        markdown: "Content",
        metadata: { description: "Description", title: "Page" },
        success: true,
      });
    }
    const { retrieveUrl } = await import("./tool");
    const result = await retrieveUrl.execute(
      { url: "https://example.com" },
      testToolContext()
    );
    expect(toolResultSchema.parse(result).usage.costUsd).toBeUndefined();
    expect(mocks.scrape).toHaveBeenCalledOnce();
  }
);
