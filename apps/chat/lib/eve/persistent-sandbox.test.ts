import { beforeEach, expect, it, vi } from "vitest";
import { createPersistentSandboxEnvironment } from "./persistent-sandbox";

const mocks = vi.hoisted(() => ({ auto: vi.fn(), vercel: vi.fn() }));
vi.mock("eve/sandbox", () => ({ DefaultSandbox: { environment: mocks.auto } }));
vi.mock("eve/sandbox/vercel", () => ({
  VercelSandbox: { environment: mocks.vercel },
}));
beforeEach(() => vi.clearAllMocks());

it("keeps automatic selection unless Vercel was explicitly selected", () => {
  createPersistentSandboxEnvironment("auto");
  expect(mocks.auto).toHaveBeenCalledExactlyOnceWith();
  expect(mocks.vercel).not.toHaveBeenCalled();
});

it("uses the public persistent Vercel environment without probing local providers", () => {
  createPersistentSandboxEnvironment("vercel");
  expect(mocks.vercel).toHaveBeenCalledExactlyOnceWith();
  expect(mocks.auto).not.toHaveBeenCalled();
});
